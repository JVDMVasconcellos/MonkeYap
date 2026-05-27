import asyncio
import io
import json
import os
import queue
import random
import re
import subprocess
import tempfile
import threading
import unicodedata
import wave

import vosk
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from evaluator import OratoryEvaluator, ensure_nltk

ensure_nltk()
evaluator = OratoryEvaluator()

app = FastAPI(title='Avaliador de Oratória')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

TEXTS_DIR  = os.path.join(os.path.dirname(__file__), 'texts')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'vosk-model-small-pt-0.3')

CATEGORIES = [
    {'id': 'facil',     'label': 'Fácil',     'description': 'Textos simples e infantis',  'color': '#00d084'},
    {'id': 'portugues', 'label': 'Português',  'description': 'Textos do dia a dia',        'color': '#4a9eff'},
    {'id': 'se_manda',  'label': 'Autores',    'description': 'Textos complexos e formais', 'color': '#f7931a'},
    {'id': 'drummond',  'label': 'Drummond',   'description': 'Poemas brasileiros',         'color': '#e94560'},
]

_vosk_model: vosk.Model | None = None

def _get_model() -> vosk.Model:
    global _vosk_model
    if _vosk_model is None:
        if not os.path.isdir(MODEL_PATH):
            raise RuntimeError(f'Modelo Vosk não encontrado em {MODEL_PATH}')
        vosk.SetLogLevel(-1)
        _vosk_model = vosk.Model(MODEL_PATH)
    return _vosk_model


def _load_texts(category: str) -> list[dict]:
    path = os.path.join(TEXTS_DIR, f'{category}.json')
    if not os.path.exists(path):
        raise HTTPException(404, f"Categoria '{category}' não encontrada")
    with open(path, encoding='utf-8') as f:
        return json.load(f)


@app.get('/categories')
def get_categories():
    return CATEGORIES


# ── Serve modelo Vosk pt-BR pra vosk-browser (frontend WASM) ──
MODEL_TGZ = os.path.join(os.path.dirname(__file__), 'models', 'vosk-model-small-pt.tar.gz')

@app.get('/model/vosk-pt.tar.gz')
def get_vosk_model():
    if not os.path.exists(MODEL_TGZ):
        raise HTTPException(404, 'Modelo Vosk não compactado. Rode tar czf models/vosk-model-small-pt.tar.gz models/vosk-model-small-pt-0.3/')
    return FileResponse(MODEL_TGZ, media_type='application/gzip', filename='vosk-pt.tar.gz')

@app.get('/texts/{category}')
def get_texts(category: str):
    return _load_texts(category)

@app.get('/text/{category}/random')
def get_random_text(category: str):
    return random.choice(_load_texts(category))


@app.post('/evaluate')
async def evaluate_audio(
    audio:    UploadFile = File(...),
    ref_text: str        = Form(default=''),
    duration: float      = Form(...),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, 'Arquivo de áudio vazio')

    suffix = '.ogg' if (audio.content_type and 'ogg' in audio.content_type) else '.webm'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        src_path = f.name

    wav_path = src_path.rsplit('.', 1)[0] + '.wav'
    try:
        proc = subprocess.run(
            ['ffmpeg', '-y', '-i', src_path, '-ar', '16000', '-ac', '1', wav_path],
            capture_output=True, timeout=30,
        )
        if proc.returncode != 0:
            raise HTTPException(500, f'Falha na conversão: {proc.stderr.decode()}')

        result = evaluator.evaluate(wav_path, ref_text or None, duration)
        return {
            'transcribed': result.transcribed,
            'scores':      result.scores,
            'errors':      result.errors,
            'details':     result.details,
            'word_diff':   result.word_diff,
        }
    finally:
        for p in [src_path, wav_path]:
            try: os.unlink(p)
            except OSError: pass


_DIGIT_TO_WORD: dict[str, str] = {
    '0': 'zero', '1': 'um', '2': 'dois', '3': 'tres', '4': 'quatro',
    '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
    '10': 'dez', '11': 'onze', '12': 'doze', '13': 'treze', '14': 'quatorze',
    '15': 'quinze', '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito',
    '19': 'dezenove', '20': 'vinte', '30': 'trinta', '40': 'quarenta',
    '50': 'cinquenta', '60': 'sessenta', '70': 'setenta', '80': 'oitenta',
    '90': 'noventa', '100': 'cem', '1000': 'mil',
}

def _normalize(s: str) -> str:
    s = s.lower().strip()
    s = unicodedata.normalize('NFD', s)
    s = re.sub(r'[̀-ͯ]', '', s)
    s = re.sub(r'[^\w]', '', s)
    return _DIGIT_TO_WORD.get(s, s)


# ── Checa uma única palavra (word-by-word mode) ────────────────────────────────
@app.post('/check-word')
async def check_word(
    audio:    UploadFile = File(...),
    expected: str        = Form(...),
):
    model = _get_model()
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, 'Áudio vazio')

    norm_expected = _normalize(expected)
    # Grammar com apenas a palavra esperada — Vosk fica trivialmente rápido
    grammar = json.dumps([norm_expected, '[unk]'])
    rec     = vosk.KaldiRecognizer(model, 16000, grammar)

    # Lê o WAV e alimenta o Vosk diretamente (sem ffmpeg)
    try:
        with io.BytesIO(audio_bytes) as buf:
            with wave.open(buf) as wf:
                while True:
                    chunk = wf.readframes(4096)
                    if not chunk:
                        break
                    rec.AcceptWaveform(chunk)
    except Exception as e:
        raise HTTPException(500, f'Erro ao processar áudio: {e}')

    result     = json.loads(rec.FinalResult())
    recognized = result.get('text', '').strip()
    norm_rec   = _normalize(recognized)

    # Similaridade simples: match exato ou diferença de no máximo 1 caractere
    from difflib import SequenceMatcher
    sim     = SequenceMatcher(None, norm_expected, norm_rec).ratio()
    correct = norm_expected == norm_rec or sim >= 0.80

    return {
        'recognized': recognized,
        'correct':    correct,
        'similarity': round(sim, 2),
        'expected':   expected,
    }


# ── WebSocket — reconhecimento em tempo real com grammar mode ─────────────────
@app.websocket('/ws/recognize')
async def ws_recognize(websocket: WebSocket):
    await websocket.accept()

    try:
        model = _get_model()
    except RuntimeError as e:
        await websocket.send_json({'type': 'error', 'text': str(e)})
        await websocket.close()
        return

    # 1. Recebe palavras do texto para montar a grammar
    try:
        init_raw = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
        init_msg = json.loads(init_raw)
        words: list[str] = init_msg.get('words', [])
    except (asyncio.TimeoutError, json.JSONDecodeError):
        words = []

    # Grammar mode: Vosk só reconhece as palavras do texto (muito mais rápido e preciso)
    import re as _re
    def _norm(w: str) -> str:
        return _re.sub(r'[^\w]', '', w.lower().strip())

    unique_words = list({_norm(w) for w in words if _norm(w)})
    grammar = json.dumps(unique_words + ['[unk]']) if unique_words else None

    rec = vosk.KaldiRecognizer(model, 16000, grammar) if grammar else vosk.KaldiRecognizer(model, 16000)

    # 2. Sinaliza pronto
    await websocket.send_json({'type': 'ready'})

    # 3. Fila entre thread Vosk e event loop asyncio
    result_q: asyncio.Queue[dict] = asyncio.Queue()
    audio_q:  queue.Queue[bytes | None] = queue.Queue(maxsize=200)
    loop = asyncio.get_event_loop()

    # Vosk precisa de contexto suficiente por chamada para produzir parciais confiáveis.
    # Acumulamos ~128ms de áudio (2048 amostras × 2 bytes) antes de chamar AcceptWaveform.
    VOSK_BATCH_BYTES = 2048 * 2  # 4096 bytes = 128ms @ 16kHz int16

    def _vosk_worker():
        last_partial = ''
        accum = bytearray()
        while True:
            chunk = audio_q.get()
            if chunk is None:
                # Flush restante
                if accum:
                    if rec.AcceptWaveform(bytes(accum)):
                        text = json.loads(rec.Result()).get('text', '').strip()
                        if text:
                            asyncio.run_coroutine_threadsafe(
                                result_q.put({'type': 'final', 'text': text}), loop
                            )
                break
            accum.extend(chunk)
            while len(accum) >= VOSK_BATCH_BYTES:
                batch  = bytes(accum[:VOSK_BATCH_BYTES])
                accum  = accum[VOSK_BATCH_BYTES:]
                if rec.AcceptWaveform(batch):
                    text = json.loads(rec.Result()).get('text', '').strip()
                    if text:
                        last_partial = ''
                        asyncio.run_coroutine_threadsafe(
                            result_q.put({'type': 'final', 'text': text}), loop
                        )
                else:
                    partial = json.loads(rec.PartialResult()).get('partial', '').strip()
                    if partial and partial != last_partial:
                        last_partial = partial
                        asyncio.run_coroutine_threadsafe(
                            result_q.put({'type': 'partial', 'text': partial}), loop
                        )

    worker = threading.Thread(target=_vosk_worker, daemon=True)
    worker.start()

    # 4. Task que drena resultados e manda pro cliente
    async def _send_results():
        while True:
            msg = await result_q.get()
            try:
                await websocket.send_json(msg)
            except Exception:
                break

    send_task = asyncio.create_task(_send_results())

    # 5. Recebe chunks de PCM e coloca na fila do Vosk
    try:
        while True:
            data = await websocket.receive_bytes()
            try:
                audio_q.put_nowait(data)
            except queue.Full:
                pass  # descarta chunk se fila cheia (nunca deve acontecer em localhost)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        audio_q.put(None)
        send_task.cancel()
        worker.join(timeout=2)

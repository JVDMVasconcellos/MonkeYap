#!/usr/bin/env python3
"""
Avaliador de Oratória
=====================
Grava a fala em tempo real e fornece análise detalhada com múltiplos scores.

Dois modos:
  • Com texto de referência: compara a fala com o texto e detecta erros precisos
  • Fala livre: reconhece o que foi dito e analisa qualidade da oratória
"""

import tkinter as tk
import threading
import subprocess
import signal
import speech_recognition as sr
import numpy as np
import librosa
import soundfile as sf
import textdistance
import nltk
import re
import time
import tempfile
import os
from difflib import ndiff


# ── NLTK Setup ────────────────────────────────────────────────────────────────
def _ensure_nltk():
    for res in ['punkt', 'punkt_tab']:
        try:
            nltk.data.find(f'tokenizers/{res}')
        except LookupError:
            nltk.download(res, quiet=True)


# ── Constants ─────────────────────────────────────────────────────────────────
FILLER_WORDS: set[str] = {
    'uh', 'uhm', 'hm', 'hmm', 'ah', 'ahm', 'né', 'ne', 'tipo', 'assim',
    'então', 'entao', 'sabe', 'cara', 'enfim', 'bom', 'olha', 'veja',
    'certo', 'ok', 'ta', 'tá', 'eh', 'bem', 'aí', 'ai', 'daí', 'dai',
    'num', 'pra', 'pro', 'ahn', 'ahn',
}

WPM_MIN = 120   # palavras/min ideal mínimo
WPM_MAX = 160   # palavras/min ideal máximo
SAMPLE_RATE = 16000
CHUNK = 1024


# ── Audio Recorder ────────────────────────────────────────────────────────────
class AudioRecorder:
    """
    Grava áudio via arecord (ALSA CLI) — não usa PortAudio, evita segfault.
    Lê o RAW PCM do stdout em uma thread para calcular o nível em tempo real.
    """

    def __init__(self, on_level=None):
        self.on_level = on_level
        self._path: str | None = None
        self._proc: subprocess.Popen | None = None
        self._level_thread: threading.Thread | None = None
        self.is_recording = False

    def start(self):
        self.is_recording = True
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        self._path = tmp.name
        tmp.close()

        # arecord grava diretamente no arquivo WAV
        self._proc = subprocess.Popen(
            [
                'arecord',
                '--quiet',
                '-f', 'S16_LE',
                '-r', str(SAMPLE_RATE),
                '-c', '1',
                self._path,
            ],
            stderr=subprocess.DEVNULL,
        )

        # Thread separada para ler o arquivo raw e calcular o nível
        if self.on_level:
            self._level_thread = threading.Thread(
                target=self._level_loop, daemon=True)
            self._level_thread.start()

    def _level_loop(self):
        """Lê o WAV sendo gravado e atualiza o nível periodicamente."""
        time.sleep(0.5)  # aguarda arecord criar o arquivo
        while self.is_recording:
            try:
                size = os.path.getsize(self._path)
                if size > 44 + CHUNK * 2:
                    # lê os últimos CHUNK samples do arquivo
                    with open(self._path, 'rb') as f:
                        f.seek(-CHUNK * 2, 2)
                        raw = f.read(CHUNK * 2)
                    arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
                    level = float(np.sqrt(np.mean(arr ** 2))) / 32768.0
                    self.on_level(min(level * 6, 1.0))
            except Exception:
                pass
            time.sleep(0.08)

    def read_chunk(self):
        """Não necessário — arecord grava em background."""
        time.sleep(0.05)

    def stop(self):
        self.is_recording = False
        if self._proc and self._proc.poll() is None:
            self._proc.send_signal(signal.SIGINT)
            try:
                self._proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        self._proc = None

    def save(self):
        """Retorna o caminho do WAV gravado."""
        if self._path and os.path.exists(self._path) and os.path.getsize(self._path) > 44:
            return self._path
        return None


# ── Oratory Evaluator ─────────────────────────────────────────────────────────
class OratoryEvaluator:
    """Avalia a qualidade da oratória com múltiplos critérios."""

    def __init__(self):
        self.rec = sr.Recognizer()

    # ── Transcrição ───────────────────────────────────────────────────────────
    def transcribe(self, path):
        try:
            with sr.AudioFile(path) as src:
                audio = self.rec.record(src)
            text = self.rec.recognize_google(audio, language='pt-BR')
            return text, None
        except sr.UnknownValueError:
            return None, 'Não foi possível entender o áudio — tente falar mais claramente.'
        except sr.RequestError as e:
            return None, f'Erro no serviço de reconhecimento (verifique a internet): {e}'
        except Exception as e:
            return None, f'Erro inesperado na transcrição: {e}'

    # ── Normalização de texto ─────────────────────────────────────────────────
    @staticmethod
    def _norm(text):
        t = text.lower()
        t = re.sub(r'[^\w\s]', '', t)
        return re.sub(r'\s+', ' ', t).strip()

    @staticmethod
    def _words(text):
        return OratoryEvaluator._norm(text).split()

    # ── Avaliação principal ───────────────────────────────────────────────────
    def evaluate(self, path, ref_text, duration):
        result = dict(transcribed='', scores={}, errors=[], details={})

        text, err = self.transcribe(path)
        if err:
            result['errors'].append(f'Reconhecimento: {err}')
        if not text:
            return result

        result['transcribed'] = text
        spoken = self._words(text)

        # ── 1. Ritmo (palavras por minuto) ────────────────────────────────────
        if duration > 1 and spoken:
            wpm = len(spoken) / duration * 60
            result['details']['wpm'] = round(wpm)
            if wpm < 80:
                r_score = max(0.0, wpm / 80 * 5)
                result['errors'].append(
                    f'Ritmo muito lento: {round(wpm)} pal/min  '
                    f'(ideal: {WPM_MIN}–{WPM_MAX})')
            elif wpm < WPM_MIN:
                r_score = 5 + (wpm - 80) / (WPM_MIN - 80) * 3
            elif wpm <= WPM_MAX:
                r_score = 10.0
            elif wpm <= 200:
                r_score = 10 - (wpm - WPM_MAX) / (200 - WPM_MAX) * 3
                result['errors'].append(
                    f'Ritmo acelerado: {round(wpm)} pal/min  '
                    f'(ideal: {WPM_MIN}–{WPM_MAX})')
            else:
                r_score = max(1.0, 7 - (wpm - 200) / 40)
                result['errors'].append(
                    f'Ritmo muito rápido: {round(wpm)} pal/min  '
                    f'(ideal: {WPM_MIN}–{WPM_MAX})')
            result['scores']['Ritmo'] = round(min(10, max(0, r_score)), 1)

        # ── 2. Fluência — vícios de linguagem ─────────────────────────────────
        fillers: dict = {}
        for w in spoken:
            if w in FILLER_WORDS:
                fillers[w] = fillers.get(w, 0) + 1
        total_fill = sum(fillers.values())
        ratio = total_fill / max(len(spoken), 1)
        if total_fill:
            fstr = ', '.join(
                f'"{w}" ({n}×)' for w, n in sorted(fillers.items(), key=lambda x: -x[1])
            )
            result['errors'].append(f'Vícios de linguagem detectados: {fstr}')
        result['scores']['Fluência'] = round(max(0.0, min(10.0, 10 - ratio * 50)), 1)
        result['details']['fillers'] = fillers

        # ── 3. Volume / Entonação (análise de áudio com librosa) ──────────────
        try:
            y, _ = librosa.load(path, sr=None)
            rms = librosa.feature.rms(y=y)[0]
            mean_rms = float(np.mean(rms))
            cv = float(np.std(rms)) / (mean_rms + 1e-8)   # coef. de variação

            if mean_rms < 0.005:
                v_score = 3.0
                result['errors'].append(
                    'Volume muito baixo — fale mais alto ou aproxime o microfone')
            elif cv < 0.15:
                v_score = 6.5
                result['errors'].append(
                    'Voz monótona — varie o volume e a entonação para engajar o público')
            else:
                v_score = min(10.0, 6.5 + cv * 8)
            result['scores']['Entonação'] = round(v_score, 1)

            # Detectar pausas excessivas
            silence_thresh = np.percentile(rms, 15)
            silence_ratio = float(np.mean(rms < silence_thresh))
            result['details']['silence_ratio'] = round(silence_ratio, 2)
            if silence_ratio > 0.40:
                result['errors'].append(
                    f'Muitas pausas longas ({round(silence_ratio*100)}% do tempo em silêncio) '
                    '— pratique a continuidade da fala')

        except Exception:
            result['scores']['Entonação'] = 5.0

        # ── 4. Articulação — clareza (se texto de referência) ─────────────────
        if ref_text and ref_text.strip():
            ref = self._words(ref_text)
            if ref and spoken:
                # Similaridade global pelo algoritmo Jaro-Winkler
                sim = textdistance.jaro_winkler(' '.join(ref), ' '.join(spoken))
                result['scores']['Precisão'] = round(sim * 10, 1)

                # Diff palavra a palavra
                diff = list(ndiff(ref, spoken))
                missing = [w[2:] for w in diff if w.startswith('- ')]
                added   = [w[2:] for w in diff
                           if w.startswith('+ ') and w[2:] not in FILLER_WORDS]

                if missing:
                    sample = ', '.join(f'"{w}"' for w in missing[:8])
                    suf = f' … e mais {len(missing)-8}' if len(missing) > 8 else ''
                    result['errors'].append(
                        f'Palavras omitidas ({len(missing)}): {sample}{suf}')
                if added:
                    sample = ', '.join(f'"{w}"' for w in added[:8])
                    result['errors'].append(
                        f'Palavras não esperadas ({len(added)}): {sample}')

                completude = max(0.0, 1.0 - len(missing) / max(len(ref), 1))
                result['scores']['Completude'] = round(completude * 10, 1)
                if completude < 0.7:
                    result['errors'].append(
                        f'Apenas {round(completude*100)}% do texto foi coberto — '
                        'leia o trecho completo sem pular partes')
            else:
                result['scores']['Precisão'] = 0.0
                result['scores']['Completude'] = 0.0

        # ── 5. Nota Geral ─────────────────────────────────────────────────────
        if result['scores']:
            result['scores']['Geral ★'] = round(
                sum(result['scores'].values()) / len(result['scores']), 1)

        return result


# ── Paleta de cores ───────────────────────────────────────────────────────────
C = {
    'bg':      '#0f0f1a',
    'panel':   '#1a1a2e',
    'accent':  '#16213e',
    'red':     '#e94560',
    'green':   '#00d084',
    'orange':  '#f7931a',
    'blue':    '#4a9eff',
    'purple':  '#9b59b6',
    'text':    '#eaeaea',
    'sub':     '#8888a0',
    'bar_bg':  '#2a2a4a',
    'inp':     '#0d1b33',
}

SCORE_COLORS = {
    'Geral ★':  '#e94560',
    'Precisão': '#4a9eff',
    'Fluência': '#00d084',
    'Ritmo':    '#f7931a',
    'Completude': '#9b59b6',
    'Entonação': '#e67e22',
}
SCORE_ORDER = ['Geral ★', 'Precisão', 'Completude', 'Fluência', 'Ritmo', 'Entonação']


# ── Aplicativo principal ──────────────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Avaliador de Oratória')
        self.geometry('780x920')
        self.minsize(700, 800)
        self.configure(bg=C['bg'])

        self.mode = tk.StringVar(value='texto')
        self.recorder: AudioRecorder | None = None
        self.evaluator = OratoryEvaluator()
        self.is_recording = False
        self._start_time = 0.0
        self._placeholder_active = True
        self._pulse_job = None

        self._build()

    # ── Construção da UI ──────────────────────────────────────────────────────
    def _build(self):
        wrap = tk.Frame(self, bg=C['bg'], padx=20, pady=16)
        wrap.pack(fill=tk.BOTH, expand=True)

        # Título
        tk.Label(wrap, text='🎤  Avaliador de Oratória',
                 bg=C['bg'], fg=C['text'],
                 font=('Segoe UI', 22, 'bold')).pack(anchor=tk.W)
        tk.Label(wrap,
                 text='Grave sua fala e receba análise detalhada com scores e erros.',
                 bg=C['bg'], fg=C['sub'],
                 font=('Segoe UI', 10)).pack(anchor=tk.W, pady=(2, 14))

        # Seleção de modo
        self._mode_row = tk.Frame(wrap, bg=C['accent'], pady=7)
        self._mode_row.pack(fill=tk.X, pady=(0, 10))
        tk.Label(self._mode_row, text='Modo:', bg=C['accent'], fg=C['sub'],
                 font=('Segoe UI', 10)).pack(side=tk.LEFT, padx=12)
        for val, label in [
            ('texto', '📄  Com texto de referência'),
            ('livre', '🎯  Fala livre'),
        ]:
            tk.Radiobutton(
                self._mode_row, text=label, variable=self.mode, value=val,
                bg=C['accent'], fg=C['text'],
                selectcolor=C['accent'],
                activebackground=C['accent'], activeforeground=C['text'],
                font=('Segoe UI', 10), command=self._on_mode,
            ).pack(side=tk.LEFT, padx=12)

        # Seção: texto de referência (visível somente no modo 'texto')
        self._text_section = tk.Frame(wrap, bg=C['panel'], pady=8)
        self._text_section.pack(fill=tk.X, pady=(0, 10))
        tk.Label(self._text_section, text='Texto de referência:',
                 bg=C['panel'], fg=C['sub'],
                 font=('Segoe UI', 9)).pack(anchor=tk.W, padx=12)
        self._ref = tk.Text(
            self._text_section, height=5,
            bg=C['inp'], fg=C['sub'],
            insertbackground='white', font=('Segoe UI', 10),
            wrap=tk.WORD, bd=0, padx=10, pady=8, relief=tk.FLAT,
        )
        self._ref.pack(fill=tk.X, padx=12, pady=(4, 8))
        self._ref.insert('1.0', 'Cole ou digite aqui o trecho que deseja ler...')
        self._ref.bind('<FocusIn>',  self._ref_focus_in)
        self._ref.bind('<FocusOut>', self._ref_focus_out)

        # Controles de gravação
        ctrl = tk.Frame(wrap, bg=C['panel'], pady=14)
        ctrl.pack(fill=tk.X, pady=(0, 10))

        btn_row = tk.Frame(ctrl, bg=C['panel'])
        btn_row.pack()

        self._rec_btn = tk.Button(
            btn_row, text='⏺  INICIAR GRAVAÇÃO',
            bg=C['red'], fg='white',
            font=('Segoe UI', 13, 'bold'),
            padx=24, pady=12, bd=0, relief=tk.FLAT, cursor='hand2',
            activebackground='#c73652', activeforeground='white',
            command=self._toggle,
        )
        self._rec_btn.pack(side=tk.LEFT, padx=12)

        self._timer_lbl = tk.Label(
            btn_row, text='⏱ 00:00',
            bg=C['panel'], fg=C['green'],
            font=('Segoe UI', 14, 'bold'))
        self._timer_lbl.pack(side=tk.LEFT, padx=10)

        # Medidor de nível de áudio
        lvl_row = tk.Frame(ctrl, bg=C['panel'])
        lvl_row.pack(pady=(10, 0))
        tk.Label(lvl_row, text='Nível de áudio:', bg=C['panel'], fg=C['sub'],
                 font=('Segoe UI', 9)).pack(side=tk.LEFT, padx=6)
        self._lvl_canvas = tk.Canvas(
            lvl_row, width=320, height=14,
            bg=C['bar_bg'], bd=0, highlightthickness=0)
        self._lvl_canvas.pack(side=tk.LEFT)
        self._lvl_bar = self._lvl_canvas.create_rectangle(
            0, 0, 0, 14, fill=C['green'], outline='')

        # Transcrição
        trans = tk.Frame(wrap, bg=C['panel'], pady=8)
        trans.pack(fill=tk.X, pady=(0, 10))
        tk.Label(trans, text='O que foi reconhecido:',
                 bg=C['panel'], fg=C['sub'],
                 font=('Segoe UI', 9)).pack(anchor=tk.W, padx=12)
        self._trans = tk.Text(
            trans, height=3,
            bg=C['inp'], fg='#7de8b8',
            font=('Segoe UI', 10, 'italic'), wrap=tk.WORD,
            bd=0, padx=10, pady=8, relief=tk.FLAT, state=tk.DISABLED,
        )
        self._trans.pack(fill=tk.X, padx=12, pady=(4, 8))

        # Pontuação
        scores_outer = tk.Frame(wrap, bg=C['panel'], pady=10)
        scores_outer.pack(fill=tk.X, pady=(0, 10))
        tk.Label(scores_outer, text='PONTUAÇÃO',
                 bg=C['panel'], fg=C['text'],
                 font=('Segoe UI', 11, 'bold')).pack(anchor=tk.W, padx=12, pady=(0, 8))
        self._scores_frame = tk.Frame(scores_outer, bg=C['panel'])
        self._scores_frame.pack(fill=tk.X, padx=12)
        self._draw_scores({})

        # Erros e observações
        errs_outer = tk.Frame(wrap, bg=C['panel'], pady=8)
        errs_outer.pack(fill=tk.BOTH, expand=True, pady=(0, 4))
        tk.Label(errs_outer, text='ERROS E OBSERVAÇÕES',
                 bg=C['panel'], fg=C['text'],
                 font=('Segoe UI', 11, 'bold')).pack(anchor=tk.W, padx=12, pady=(0, 6))
        err_inner = tk.Frame(errs_outer, bg=C['panel'])
        err_inner.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 8))
        self._errs = tk.Text(
            err_inner, height=8,
            bg=C['inp'], fg='#ff8888',
            font=('Segoe UI', 10), wrap=tk.WORD,
            bd=0, padx=10, pady=8, relief=tk.FLAT, state=tk.DISABLED,
        )
        sb = tk.Scrollbar(err_inner, command=self._errs.yview, bg=C['panel'])
        self._errs.configure(yscrollcommand=sb.set)
        self._errs.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

    # ── Troca de modo ─────────────────────────────────────────────────────────
    def _on_mode(self):
        if self.mode.get() == 'livre':
            self._text_section.pack_forget()
        else:
            self._text_section.pack(fill=tk.X, pady=(0, 10), after=self._mode_row)

    # ── Placeholder do campo de texto ─────────────────────────────────────────
    def _ref_focus_in(self, _):
        if self._placeholder_active:
            self._ref.delete('1.0', tk.END)
            self._ref.configure(fg=C['text'])
            self._placeholder_active = False

    def _ref_focus_out(self, _):
        if not self._ref.get('1.0', tk.END).strip():
            self._ref.configure(fg=C['sub'])
            self._ref.insert('1.0', 'Cole ou digite aqui o trecho que deseja ler...')
            self._placeholder_active = True

    # ── Controle de gravação ──────────────────────────────────────────────────
    def _toggle(self):
        if not self.is_recording:
            self._start_recording()
        else:
            self._stop_recording()

    def _start_recording(self):
        self.is_recording = True
        self._rec_btn.configure(
            text='⏹  PARAR GRAVAÇÃO', bg='#ff4444',
            activebackground='#cc3333')
        self._set_text(self._trans, '')
        self._set_text(self._errs, '')
        self._draw_scores({})

        self.recorder = AudioRecorder(on_level=self._update_level)
        self.recorder.start()
        self._start_time = time.time()

        threading.Thread(target=self._rec_loop, daemon=True).start()
        threading.Thread(target=self._tick_loop, daemon=True).start()
        self._pulse()

    def _rec_loop(self):
        while self.is_recording:
            self.recorder.read_chunk()

    def _tick_loop(self):
        while self.is_recording:
            elapsed = int(time.time() - self._start_time)
            m, s = divmod(elapsed, 60)
            self.after(0, self._timer_lbl.configure,
                       {'text': f'⏱ {m:02d}:{s:02d}'})
            time.sleep(0.5)

    def _pulse(self):
        """Pisca o botão de gravação para feedback visual."""
        if not self.is_recording:
            return
        cur = self._rec_btn.cget('bg')
        next_c = '#cc2244' if cur == '#ff4444' else '#ff4444'
        self._rec_btn.configure(bg=next_c)
        self._pulse_job = self.after(600, self._pulse)

    def _update_level(self, level):
        w = int(level * 320)
        c = C['green'] if level < 0.6 else C['orange'] if level < 0.85 else C['red']

        def _do():
            self._lvl_canvas.coords(self._lvl_bar, 0, 0, w, 14)
            self._lvl_canvas.itemconfig(self._lvl_bar, fill=c)
        self.after(0, _do)

    def _stop_recording(self):
        if self._pulse_job:
            self.after_cancel(self._pulse_job)
            self._pulse_job = None

        self.is_recording = False
        self._rec_btn.configure(
            state='disabled', text='⏱  Analisando...', bg=C['accent'])
        self._timer_lbl.configure(text='⏱ Analisando...')
        self._lvl_canvas.coords(self._lvl_bar, 0, 0, 0, 14)

        duration = time.time() - self._start_time
        self.recorder.stop()
        path = self.recorder.save()

        if not path:
            self._show_err('Nenhum áudio foi gravado. Verifique o microfone.')
            return

        ref = None
        if self.mode.get() == 'texto' and not self._placeholder_active:
            ref = self._ref.get('1.0', tk.END).strip() or None

        threading.Thread(
            target=self._analyze, args=(path, ref, duration), daemon=True
        ).start()

    # ── Análise ───────────────────────────────────────────────────────────────
    def _analyze(self, path, ref, duration):
        try:
            result = self.evaluator.evaluate(path, ref, duration)
            self.after(0, lambda: self._show_results(result))
        except Exception as exc:
            self.after(0, lambda e=str(exc): self._show_err(e))
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    def _show_results(self, result):
        self._set_text(self._trans, result.get('transcribed', ''))
        self._draw_scores(result.get('scores', {}))

        lines = []
        errors = result.get('errors', [])
        if not errors and result.get('transcribed'):
            lines.append('✅  Nenhum erro significativo! Excelente oratória!')
        for e in errors:
            lines.append(f'•  {e}')
        if result['details'].get('wpm'):
            lines.append(
                f'\nℹ️   Velocidade detectada: {result["details"]["wpm"]} palavras/minuto')

        self._set_text(self._errs, '\n'.join(lines))
        self._rec_btn.configure(
            state='normal', text='⏺  NOVA GRAVAÇÃO',
            bg=C['red'], activebackground='#c73652')
        self._timer_lbl.configure(text='✓  Concluído')

    def _show_err(self, msg):
        self._set_text(self._errs, f'Erro: {msg}')
        self._rec_btn.configure(
            state='normal', text='⏺  INICIAR GRAVAÇÃO',
            bg=C['red'], activebackground='#c73652')
        self._timer_lbl.configure(text='⏱ 00:00')

    # ── Renderização de scores ────────────────────────────────────────────────
    def _draw_scores(self, scores: dict):
        for w in self._scores_frame.winfo_children():
            w.destroy()

        ordered = {k: scores[k] for k in SCORE_ORDER if k in scores}
        for k, v in scores.items():
            if k not in ordered:
                ordered[k] = v

        if not ordered:
            tk.Label(self._scores_frame,
                     text='— grave e pare para ver os scores —',
                     bg=C['panel'], fg=C['sub'],
                     font=('Segoe UI', 10, 'italic')).pack(anchor=tk.W)
            return

        for name, val in ordered.items():
            row = tk.Frame(self._scores_frame, bg=C['panel'])
            row.pack(fill=tk.X, pady=3)
            color = SCORE_COLORS.get(name, C['blue'])
            bold = 'bold' if name == 'Geral ★' else 'normal'

            tk.Label(row, text=f'{name}:', bg=C['panel'], fg=C['sub'],
                     font=('Segoe UI', 10, bold), width=14, anchor=tk.W
                     ).pack(side=tk.LEFT)

            bar = tk.Canvas(row, width=220, height=12,
                            bg=C['bar_bg'], bd=0, highlightthickness=0)
            bar.pack(side=tk.LEFT, padx=6)
            bar.create_rectangle(0, 0, int(val / 10 * 220), 12,
                                  fill=color, outline='')

            tk.Label(row, text=f'{val}/10', bg=C['panel'], fg=color,
                     font=('Segoe UI', 10, bold), width=6
                     ).pack(side=tk.LEFT)

            emoji = '🏆' if val >= 9 else '⭐' if val >= 7 else '👍' if val >= 5 else '📈'
            tk.Label(row, text=emoji, bg=C['panel'],
                     font=('Segoe UI', 10)).pack(side=tk.LEFT, padx=4)

    # ── Utilitário: escrever em Text desabilitado ─────────────────────────────
    def _set_text(self, widget, text):
        widget.configure(state=tk.NORMAL)
        widget.delete('1.0', tk.END)
        if text:
            widget.insert('1.0', text)
        widget.configure(state=tk.DISABLED)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    _ensure_nltk()
    app = App()
    app.mainloop()

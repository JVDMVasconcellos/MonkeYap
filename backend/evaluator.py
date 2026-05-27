import re
import unicodedata
import numpy as np
import librosa
import textdistance
import nltk
import speech_recognition as sr
from difflib import SequenceMatcher
from dataclasses import dataclass, field


def ensure_nltk():
    for res in ['punkt', 'punkt_tab']:
        try:
            nltk.data.find(f'tokenizers/{res}')
        except LookupError:
            nltk.download(res, quiet=True)


_SYMBOL_TO_WORDS: list[tuple[str, str]] = [
    ('%',  'por cento'),
    ('&',  'e'),
    ('+',  'mais'),
    ('°',  'graus'),
    ('=',  'igual'),
    ('nº', 'numero'),
    ('r$', 'reais'),
    ('§',  'paragrafo'),
]

_DIGIT_TO_WORD: dict[str, str] = {
    '0': 'zero', '1': 'um', '2': 'dois', '3': 'tres', '4': 'quatro',
    '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
    '10': 'dez', '11': 'onze', '12': 'doze', '13': 'treze', '14': 'quatorze',
    '15': 'quinze', '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito',
    '19': 'dezenove', '20': 'vinte', '21': 'vinte e um', '22': 'vinte e dois',
    '30': 'trinta', '40': 'quarenta', '50': 'cinquenta', '60': 'sessenta',
    '70': 'setenta', '80': 'oitenta', '90': 'noventa',
    '100': 'cem', '200': 'duzentos', '300': 'trezentos', '400': 'quatrocentos',
    '500': 'quinhentos', '1000': 'mil',
}

FILLER_WORDS: set[str] = {
    'uh', 'uhm', 'hm', 'hmm', 'ah', 'ahm', 'né', 'ne', 'tipo', 'assim',
    'então', 'entao', 'sabe', 'cara', 'enfim', 'bom', 'olha', 'veja',
    'certo', 'ok', 'ta', 'tá', 'eh', 'bem', 'aí', 'ai', 'daí', 'dai',
    'num', 'pra', 'pro', 'ahn',
}

WPM_MIN = 120
WPM_MAX = 160


@dataclass
class WordDiff:
    word: str
    status: str  # 'ok' | 'missing' | 'extra'


@dataclass
class EvaluationResult:
    transcribed: str = ''
    scores: dict = field(default_factory=dict)
    errors: list = field(default_factory=list)
    details: dict = field(default_factory=dict)
    word_diff: list[dict] = field(default_factory=list)


class OratoryEvaluator:
    def __init__(self):
        self.rec = sr.Recognizer()

    def transcribe(self, path: str) -> tuple[str | None, str | None]:
        try:
            with sr.AudioFile(path) as src:
                audio = self.rec.record(src)
            text = self.rec.recognize_google(audio, language='pt-BR')
            return text, None
        except sr.UnknownValueError:
            return None, 'Não foi possível entender o áudio — tente falar mais claramente.'
        except sr.RequestError as e:
            return None, f'Erro no reconhecimento de voz: {e}'
        except Exception as e:
            return None, f'Erro inesperado: {e}'

    @staticmethod
    def _norm(text: str) -> str:
        t = text.lower()
        for sym, word in _SYMBOL_TO_WORDS:
            t = t.replace(sym, f' {word} ')
        t = unicodedata.normalize('NFD', t)
        t = re.sub(r'[̀-ͯ]', '', t)
        t = re.sub(r'[^\w\s]', '', t)
        t = re.sub(r'\s+', ' ', t).strip()
        return ' '.join(_DIGIT_TO_WORD.get(w, w) for w in t.split())

    @staticmethod
    def _words(text: str) -> list[str]:
        return OratoryEvaluator._norm(text).split()

    def evaluate(self, path: str, ref_text: str | None, duration: float) -> EvaluationResult:
        result = EvaluationResult()

        text, err = self.transcribe(path)
        if err:
            result.errors.append(err)
        if not text:
            return result

        result.transcribed = text
        spoken = self._words(text)

        # 1. Ritmo (WPM)
        if duration > 1 and spoken:
            wpm = len(spoken) / duration * 60
            result.details['wpm'] = round(wpm)
            if wpm < 80:
                r_score = max(0.0, wpm / 80 * 5)
                result.errors.append(f'Ritmo muito lento: {round(wpm)} pal/min (ideal: {WPM_MIN}–{WPM_MAX})')
            elif wpm < WPM_MIN:
                r_score = 5 + (wpm - 80) / (WPM_MIN - 80) * 3
            elif wpm <= WPM_MAX:
                r_score = 10.0
            elif wpm <= 200:
                r_score = 10 - (wpm - WPM_MAX) / (200 - WPM_MAX) * 3
                result.errors.append(f'Ritmo acelerado: {round(wpm)} pal/min (ideal: {WPM_MIN}–{WPM_MAX})')
            else:
                r_score = max(1.0, 7 - (wpm - 200) / 40)
                result.errors.append(f'Ritmo muito rápido: {round(wpm)} pal/min (ideal: {WPM_MIN}–{WPM_MAX})')
            result.scores['Ritmo'] = round(min(10, max(0, r_score)), 1)

        # 2. Fluência (vícios de linguagem)
        fillers: dict[str, int] = {}
        for w in spoken:
            if w in FILLER_WORDS:
                fillers[w] = fillers.get(w, 0) + 1
        total_fill = sum(fillers.values())
        ratio = total_fill / max(len(spoken), 1)
        if total_fill:
            fstr = ', '.join(f'"{w}" ({n}×)' for w, n in sorted(fillers.items(), key=lambda x: -x[1]))
            result.errors.append(f'Vícios de linguagem: {fstr}')
        result.scores['Fluência'] = round(max(0.0, min(10.0, 10 - ratio * 50)), 1)
        result.details['fillers'] = fillers

        # 3. Entonação (librosa)
        try:
            y, _ = librosa.load(path, sr=None)
            rms = librosa.feature.rms(y=y)[0]
            mean_rms = float(np.mean(rms))
            cv = float(np.std(rms)) / (mean_rms + 1e-8)

            if mean_rms < 0.005:
                v_score = 3.0
                result.errors.append('Volume muito baixo — fale mais alto ou aproxime o microfone')
            elif cv < 0.15:
                v_score = 6.5
                result.errors.append('Voz monótona — varie a entonação para engajar o ouvinte')
            else:
                v_score = min(10.0, 6.5 + cv * 8)
            result.scores['Entonação'] = round(v_score, 1)

            silence_thresh = np.percentile(rms, 15)
            silence_ratio = float(np.mean(rms < silence_thresh))
            result.details['silence_ratio'] = round(silence_ratio, 2)
            if silence_ratio > 0.40:
                result.errors.append(f'Muitas pausas longas ({round(silence_ratio * 100)}% do tempo em silêncio)')
        except Exception:
            result.scores['Entonação'] = 5.0

        # 4. Precisão + Completude (modo texto de referência)
        if ref_text and ref_text.strip():
            ref = self._words(ref_text)
            if ref and spoken:
                sim = textdistance.jaro_winkler(' '.join(ref), ' '.join(spoken))
                result.scores['Precisão'] = round(sim * 10, 1)

                sm = SequenceMatcher(None, ref, spoken, autojunk=False)
                missing, added = [], []
                for tag, i1, i2, j1, j2 in sm.get_opcodes():
                    if tag in ('delete', 'replace'):
                        missing.extend(ref[i1:i2])
                    if tag in ('insert', 'replace'):
                        added.extend(w for w in spoken[j1:j2] if w not in FILLER_WORDS)

                result.word_diff = _build_word_diff(ref_text, ref, spoken)

                if missing:
                    sample = ', '.join(f'"{w}"' for w in missing[:8])
                    suf = f' e mais {len(missing) - 8}' if len(missing) > 8 else ''
                    result.errors.append(f'Palavras omitidas ({len(missing)}): {sample}{suf}')
                if added:
                    sample = ', '.join(f'"{w}"' for w in added[:8])
                    result.errors.append(f'Palavras não esperadas ({len(added)}): {sample}')

                completude = max(0.0, 1.0 - len(missing) / max(len(ref), 1))
                result.scores['Completude'] = round(completude * 10, 1)
                if completude < 0.7:
                    result.errors.append(f'Apenas {round(completude * 100)}% do texto foi coberto')
            else:
                result.scores['Precisão'] = 0.0
                result.scores['Completude'] = 0.0

        # 5. Nota geral
        if result.scores:
            result.scores['Geral'] = round(sum(result.scores.values()) / len(result.scores), 1)

        return result


def _build_word_diff(ref_text: str, ref_norm: list[str], spoken_norm: list[str]) -> list[dict]:
    """Diff posicional: só marca a posição exata como missing, não todas as ocorrências da palavra."""
    raw_words = ref_text.split()
    sm = SequenceMatcher(None, ref_norm, spoken_norm, autojunk=False)
    status_by_pos = ['missing'] * len(ref_norm)
    for tag, i1, i2, _j1, _j2 in sm.get_opcodes():
        if tag == 'equal':
            for i in range(i1, i2):
                status_by_pos[i] = 'ok'
    return [
        {'word': raw_words[i], 'status': status_by_pos[i]}
        for i in range(len(raw_words))
    ]

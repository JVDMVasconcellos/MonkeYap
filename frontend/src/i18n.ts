export type Lang = string | null

const strings = {
  pt: {
    select_category:       'selecione uma categoria para começar',
    loading_model:         '⏳ carregando modelo...',
    speak_to_start:        'fale para começar',
    analyzing:             'analisando...',
    try_again:             'tentar novamente',
    next_text:             'próximo texto',
    new_text_hint:         'novo texto',
    stop_hint:             'parar',
    new_text_tooltip:      'Novo texto (tab)',
    words:                 'palavras',
    error_mic:             'Não foi possível acessar o microfone',
    error_load_text:       'Falha ao carregar texto',
    error_load_categories: 'Erro ao carregar categorias',
    label_time:            'tempo',
    label_recognized:      'reconhecido',
    label_overall:         'nota geral',
    score_info_title:      'como a nota é calculada',
    history_title:         'histórico',
    clear:                 'limpar',
    close:                 '✕ fechar',
    no_sessions:           'nenhuma sessão registrada ainda',
    sessions:              'sessões',
    avg_wpm:               'wpm médio',
    best_wpm:              'melhor wpm',
    avg_score:             'nota média',
    duration:              'duração',
    save:                  'salvar',
    share:                 'compartilhar',
    generating:            'gerando...',
    ig_copied:             '✓ copiado! cole no Instagram',
    x_pasted:              '✓ cole no tweet!',
    x_banner:              '📋 imagem copiada — cole no tweet com Ctrl+V',
    tab_all:               'todos',
  },
  en: {
    select_category:       'select a category to start',
    loading_model:         '⏳ loading model...',
    speak_to_start:        'speak to start',
    analyzing:             'analyzing...',
    try_again:             'try again',
    next_text:             'next text',
    new_text_hint:         'new text',
    stop_hint:             'stop',
    new_text_tooltip:      'New text (tab)',
    words:                 'words',
    error_mic:             'Could not access the microphone',
    error_load_text:       'Failed to load text',
    error_load_categories: 'Failed to load categories',
    label_time:            'time',
    label_recognized:      'recognized',
    label_overall:         'overall score',
    score_info_title:      'how the score is calculated',
    history_title:         'history',
    clear:                 'clear',
    close:                 '✕ close',
    no_sessions:           'no sessions recorded yet',
    sessions:              'sessions',
    avg_wpm:               'avg wpm',
    best_wpm:              'best wpm',
    avg_score:             'avg score',
    duration:              'duration',
    save:                  'save',
    share:                 'share',
    generating:            'generating...',
    ig_copied:             '✓ copied! paste on Instagram',
    x_pasted:              '✓ paste in tweet!',
    x_banner:              '📋 image copied — paste in tweet with Ctrl+V',
    tab_all:               'all',
  },
} as const

type Key = keyof typeof strings.pt

export function t(lang: Lang, key: Key): string {
  return (lang === 'en' ? strings.en : strings.pt)[key]
}

const METRIC_LABELS_PT: Record<string, string> = {
  Precisão:   'precisão',
  Fluência:   'fluência',
  Completude: 'completude',
  Ritmo:      'ritmo',
  Entonação:  'entonação',
  Geral:      'geral',
}

const METRIC_LABELS_EN: Record<string, string> = {
  Precisão:   'precision',
  Fluência:   'fluency',
  Completude: 'coverage',
  Ritmo:      'rhythm',
  Entonação:  'intonation',
  Geral:      'overall',
}

export function metricLabel(lang: Lang, key: string): string {
  const dict = lang === 'en' ? METRIC_LABELS_EN : METRIC_LABELS_PT
  return dict[key] ?? key.toLowerCase()
}

export const SCORE_INFO = {
  pt: [
    { name: 'Precisão',   desc: 'Quão parecido o que você falou foi com o texto original, palavra por palavra.' },
    { name: 'Fluência',   desc: 'Penaliza vícios de linguagem (uh, tipo, né, assim, sabe…). Quanto menos, melhor.' },
    { name: 'Completude', desc: 'Porcentagem do texto que você cobriu. Pular muitas palavras reduz essa nota.' },
    { name: 'Ritmo',      desc: 'Baseado no seu WPM (palavras por minuto). A faixa ideal varia por categoria: trava-língua (150–210), poesia (80–130), textos formais (100–140) e cultura/fácil (110–160).' },
    { name: 'Entonação',  desc: 'Analisa a variação de volume no áudio. Voz monótona ou muito baixa reduz a nota.' },
    { name: 'Nota geral', desc: 'Média simples de todas as métricas acima, de 0 a 10.' },
  ],
  en: [
    { name: 'Precision',     desc: 'How closely what you said matched the original text, word by word.' },
    { name: 'Fluency',       desc: 'Penalizes filler words (uh, like, you know, basically…). The fewer, the better.' },
    { name: 'Coverage',      desc: 'Percentage of the text you covered. Skipping many words lowers this score.' },
    { name: 'Rhythm',        desc: 'Based on your WPM (words per minute). The ideal range varies by category: tongue twisters (150–210), poetry (90–130), classics (110–150), and easy/culture (120–170).' },
    { name: 'Intonation',    desc: 'Analyzes volume variation in the audio. A monotone or very quiet voice lowers the score.' },
    { name: 'Overall score', desc: 'Simple average of all the metrics above, from 0 to 10.' },
  ],
}

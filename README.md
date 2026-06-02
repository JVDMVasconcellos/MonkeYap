# MonkeYap

[![Deploy with Vercel](https://vercel.com/button)](https://frontend-psi-bice-93.vercel.app)

A MonkeyType-inspired oratory trainer. Read texts aloud and get real-time word tracking, live rhythm feedback, and a full score breakdown — all in the browser, no backend required.

Supports **Português** and **English**.

---

## Features

- **Real-time word tracking** — words highlight as you speak, cursor follows your voice
- **Auto-start / auto-stop** — recording begins automatically, stops on silence or when the text ends
- **Live performance bar** — shows rhythm quality (WPM) while you record
- **Scoring** — Precisão, Fluência, Completude, Ritmo, Entonação and a Nota Geral
- **Fuzzy word matching** — near-matches and slight misrecognitions count as correct
- **Session history** — all results saved locally with per-metric averages dashboard
- **Share results** — export score card as image; share to WhatsApp, X or copy to Instagram clipboard
- **Timer modes** — unlimited, 15s, 30s or 60s
- **Theme switcher** — 4 themes: MonkeYap, Oceano, Floresta, Areia
- **Keyboard shortcuts** — `Tab` for new text, `Esc` to stop

---

## Text Categories

### 🇧🇷 Português
| Category | Description |
|---|---|
| Fácil | Simple fables and children's stories |
| Cultura | Everyday Brazilian topics |
| Autores | Complex and formal texts |
| Drummond | Brazilian poetry |
| Trava-língua | Tongue twister series for articulation |

### 🇺🇸 English
| Category | Description |
|---|---|
| Easy | Classic fairy tales and fables |
| Culture | Everyday English topics |
| Classics | Excerpts from great English literature |
| Poetry | Famous English poems |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Speech (primary) | Web Speech API — browser-native recognition (Google on Chrome/Edge, Apple on Safari) |
| Speech (fallback) | Vosk WASM (`vosk-browser`) — offline PT-BR model, used automatically on Firefox |
| Evaluation | Client-side scoring with Jaro-Winkler fuzzy matching |
| History | localStorage (up to 50 sessions) |
| Hosting | Vercel (static, no backend required) |

### Browser support

| Browser | Speech engine |
|---|---|
| Chrome, Brave, Edge, Opera | Web Speech API (Google) |
| Safari (macOS + iOS) | Web Speech API (Apple) |
| Firefox | Vosk WASM (offline, ~47 MB download on first use) |

---

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> The Vosk model (~47 MB) is downloaded automatically on first run and cached by the browser. It is only used on Firefox — all other browsers use the Web Speech API with no download required.

---

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts                       # Languages, categories and text fetching
│   │   ├── evaluator.ts                 # Client-side scoring logic
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── CategoryPicker.tsx       # Language / category / timer selector
│   │   │   ├── Header.tsx
│   │   │   ├── HistoryPanel.tsx         # Session history with metrics dashboard
│   │   │   ├── PerformanceBar.tsx       # Live WPM rhythm indicator
│   │   │   ├── ScoreBoard.tsx
│   │   │   ├── ScoreInfoModal.tsx       # Explains each metric
│   │   │   ├── ShareCard.tsx            # Exportable result image card
│   │   │   └── TextDisplay.tsx
│   │   └── hooks/
│   │       ├── useWebSocketSpeech.ts    # Speech recognition (Web Speech API + Vosk fallback)
│   │       ├── useHistory.ts            # localStorage history management
│   │       ├── useRecorder.ts
│   │       └── useTheme.ts
│   └── public/
│       ├── texts/                       # JSON text collections per category
│       └── models/                      # Vosk PT-BR model (gitignored, downloaded at build time)
```

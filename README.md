# MonkeYap

[![Deploy with Vercel](https://vercel.com/button)](https://frontend-psi-bice-93.vercel.app)

A MonkeyType-inspired oratory trainer for Portuguese speakers. Read texts aloud and get real-time word tracking with in-browser speech recognition. Scored on accuracy, fluency, completeness, rhythm and intonation.

---

## Features

- **Real-time word tracking** — words highlight as you speak them
- **Auto-start / auto-stop** — begins recording as soon as the text loads, stops when you finish
- **Scoring** — accuracy, fluency, completeness, rhythm and intonation
- **Fuzzy word matching** — near-matches (accents, slight misrecognitions) are counted as correct
- **Text categories** — Fácil (fables), Drummond (poetry), Autores (Brazilian literature), Português (essays)
- **Theme switcher** — 4 themes: MonkeYap, Oceano, Floresta, Areia
- **Keyboard shortcuts** — `Tab` for new text, `Esc` to stop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Speech (primary) | Web Speech API — uses browser-native recognition (Google on Chrome/Brave/Edge, Apple on Safari) |
| Speech (fallback) | Vosk WASM (`vosk-browser`) — offline PT-BR model, used automatically on Firefox |
| Evaluation | Client-side scoring with Jaro-Winkler fuzzy matching |
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
│   │   ├── api.ts           # Categories and text fetching
│   │   ├── evaluator.ts     # Client-side scoring logic
│   │   ├── components/
│   │   └── hooks/
│   │       ├── useWebSocketSpeech.ts  # Speech recognition (Web Speech API + Vosk fallback)
│   │       └── useTheme.ts
│   └── public/
│       ├── texts/           # JSON text collections per category
│       └── models/          # Vosk PT-BR model (gitignored, downloaded at build time)
└── avaliador_oratoria/      # Legacy Tkinter desktop version
```

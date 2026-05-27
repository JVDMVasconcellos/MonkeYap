# MonkeYap

[![Deploy with Vercel](https://vercel.com/button)](https://frontend-psi-bice-93.vercel.app)

A MonkeyType-inspired oratory trainer for Portuguese speakers. Read texts aloud and get real-time word tracking with in-browser speech recognition. Scored on accuracy, fluency, completeness, rhythm and intonation.

---

## Features

- **Real-time word tracking** — words highlight as you speak them
- **Auto-start / auto-stop** — begins when it detects your voice, ends when you finish the text
- **Scoring** — accuracy, fluency, completeness, rhythm and intonation
- **Text categories** — Fácil (fables), Drummond (poetry), Autores (Brazilian literature), Português (essays)
- **Theme switcher** — 4 themes: MonkeYap, Oceano, Floresta, Areia
- **Keyboard shortcuts** — `Tab` for new text, `Esc` to stop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Speech (browser) | Vosk WASM (`vosk-browser`) |
| Backend | FastAPI + Python |
| Speech (server) | Vosk (PT-BR model) |
| Audio | WebSocket streaming + ScriptProcessorNode @ 16kHz |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Vosk PT-BR model](https://alphacephei.com/vosk/models) — download `vosk-model-small-pt-0.3` and place it at `backend/models/vosk-model-small-pt-0.3/`

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
├── backend/
│   ├── api.py          # FastAPI routes + WebSocket
│   ├── evaluator.py    # Scoring logic
│   ├── requirements.txt
│   └── texts/          # JSON text collections
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── hooks/
│   └── ...
└── avaliador_oratoria/ # Legacy Tkinter desktop version
```

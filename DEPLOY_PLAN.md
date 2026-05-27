# MonkeYap — Deploy Gratuito (Vercel-only)

## O que foi feito nesta sessão

### Arquitetura: backend eliminado

O app era React + FastAPI. Descobrimos que o `useWebSocketSpeech` já rodava o Vosk
**100% no browser via WASM** — o backend era desnecessário para o fluxo principal.

Portamos tudo para frontend puro → deploy apenas no **Vercel, grátis para sempre**.

---

### Mudanças implementadas

| Arquivo | O que mudou |
|---|---|
| `frontend/src/evaluator.ts` | **NOVO** — port do `evaluator.py` em TypeScript puro (WPM, fluência, entonação via Web Audio API, Jaro-Winkler, word diff) |
| `frontend/src/api.ts` | Substituído: sem mais HTTP para backend. Textos servidos localmente, evaluate roda no browser |
| `frontend/src/hooks/useWebSocketSpeech.ts` | Expõe `transcript` (acumulado pelo Vosk); muda `MODEL_URL` de `/api/model/...` → `/models/vosk-pt.tar.gz` |
| `frontend/src/App.tsx` | Passa `speech.transcript` para `evaluate()` |
| `frontend/vite.config.ts` | Remove proxy do backend; mantém headers COOP/COEP para WASM |
| `frontend/package.json` | Adiciona `predev` + `prebuild` → roda script de download do modelo |
| `frontend/scripts/download-model.mjs` | **NOVO** — baixa o modelo Vosk (~47MB de alphacephei.com) e reempacota como `.tar.gz` |
| `frontend/public/texts/*.json` | **NOVO** — textos migrados do `backend/texts/` |
| `.gitignore` | Ignora `frontend/public/models/` |
| `vercel.json` | **NOVO** — configura build + headers COOP/COEP no Vercel |
| `frontend/src/hooks/useWordByWord.ts` | **REMOVIDO** — dead code (não era usado em `App.tsx`) |

---

## Goal para a próxima sessão

### 1. Testar o build local
```bash
cd frontend
npm run build   # baixa modelo (~47MB) + compila
npm run preview # abre em localhost:4173 pra testar
```

### 2. Subir no Vercel (5 minutos)
1. Vai em **vercel.com** → New Project → Import do GitHub `JVDMVasconcellos/MonkeYap`
2. **Root Directory**: deixa em branco (o `vercel.json` na raiz já cuida de tudo)
3. Clica Deploy
4. Aguarda ~3 min (download do modelo no build)
5. Acessa a URL gerada → app online 🎉

### 3. Co-desenvolvimento com os devs
Depois que estiver no ar, cada dev:
```bash
git clone https://github.com/JVDMVasconcellos/MonkeYap
cd MonkeYap/frontend
npm install
npm run dev   # baixa modelo na primeira vez (~47MB)
```

Fluxo de trabalho:
```
dev faz push numa branch → PR → merge na main → Vercel faz deploy automático
```

Preview por branch é automático no Vercel — cada PR gera uma URL própria.

---

## Possível problema: tamanho do modelo no Vercel

O modelo `.tar.gz` tem ~47MB. O Vercel free tem limite de ~100MB de deployment.
Se o build falhar por tamanho, a solução é hospedar o modelo no **GitHub Releases**:

1. Cria uma release no GitHub e faz upload do `vosk-pt.tar.gz`
2. Pega a URL do asset (ex: `https://github.com/.../releases/download/v1.0/vosk-pt.tar.gz`)
3. Muda `MODEL_URL` em `useWebSocketSpeech.ts` para essa URL
4. Remove o modelo do `public/` e ajusta o `prebuild` script

---

## Como o app funciona agora (sem backend)

```
Browser
├── Vosk WASM (vosk-browser)    ← reconhecimento em tempo real
├── evaluator.ts                ← avaliação: WPM, fluência, entonação, precisão
├── /texts/*.json               ← textos servidos como arquivo estático
└── /models/vosk-pt.tar.gz      ← modelo Vosk servido como arquivo estático
```

Áudio nunca sai do dispositivo. Zero backend. Zero custo.

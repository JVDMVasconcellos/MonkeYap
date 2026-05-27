#!/bin/bash
set -e

BASE="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$BASE/backend"
FRONTEND="$BASE/frontend"

echo "=== Iniciando backend ==="
cd "$BACKEND"
if [ ! -d venv ]; then
  python3 -m venv venv
  source venv/bin/activate
  pip install -q -r requirements.txt
else
  source venv/bin/activate
fi

uvicorn api:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend rodando em http://localhost:8000 (PID $BACKEND_PID)"

echo ""
echo "=== Iniciando frontend ==="
cd "$FRONTEND"
if [ ! -d node_modules ]; then
  npm install
fi

echo "Frontend rodando em http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait

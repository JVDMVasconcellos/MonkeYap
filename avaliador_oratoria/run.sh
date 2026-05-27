#!/usr/bin/env bash
# Ativa o venv e executa o Avaliador de Oratória
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

source venv/bin/activate
python main.py

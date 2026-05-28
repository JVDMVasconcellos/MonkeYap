#!/bin/bash
# =============================================================================
# setup.sh — Configura o ambiente do projeto FonoCorpus no Ubuntu/Linux
# =============================================================================
# Uso:
#   chmod +x setup.sh
#   ./setup.sh
# =============================================================================

set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$BASE_DIR/venv"

echo "=============================================="
echo "  FonoCorpus — Instalação automática"
echo "=============================================="

# 1. Verificar Python 3
if ! command -v python3 &>/dev/null; then
    echo "[ERRO] Python 3 não encontrado. Instale com: sudo apt install python3 python3-venv"
    exit 1
fi

echo "[OK] Python 3 encontrado: $(python3 --version)"

# 2. Criar venv se não existir
if [ ! -d "$VENV_DIR" ]; then
    echo "[...] Criando ambiente virtual..."
    python3 -m venv "$VENV_DIR"
    echo "[OK] venv criado em $VENV_DIR"
else
    echo "[OK] venv já existe em $VENV_DIR"
fi

# 3. Ativar venv e instalar dependências
echo "[...] Instalando dependências..."
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install -r "$BASE_DIR/requirements.txt" --quiet
echo "[OK] Dependências instaladas."

# 4. Criar pasta corpus se não existir
mkdir -p "$BASE_DIR/corpus"

echo ""
echo "=============================================="
echo "  Instalação concluída!"
echo "=============================================="
echo ""
echo "Para ativar o ambiente virtual:"
echo "  source venv/bin/activate"
echo ""
echo "Para executar o projeto:"
echo "  python main.py"
echo ""
echo "Para usar apenas via API Python:"
echo "  python exemplo_uso.py"
echo "=============================================="

# =============================================================================
# fonolib/__init__.py
# Pacote principal do FonoCorpus — API pública simplificada
# =============================================================================
"""
FonoCorpus — Biblioteca para textos fonoaudiológicos em Português.

Uso rápido:
    from fonolib import get_trecho, get_trechos
    print(get_trecho())
"""

from fonolib.selecionar import (
    get_trecho,
    get_trechos,
    get_trecho_por_tamanho,
    get_trava_linguas,
    get_parlenda,
)
from fonolib.generator import CORPUS_EMBUTIDO
from fonolib.limpar import limpar_corpus
from fonolib.scraper import baixar_corpus

__all__ = [
    "get_trecho",
    "get_trechos",
    "get_trecho_por_tamanho",
    "get_trava_linguas",
    "get_parlenda",
    "CORPUS_EMBUTIDO",
    "limpar_corpus",
    "baixar_corpus",
]

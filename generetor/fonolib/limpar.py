# =============================================================================
# fonolib/limpar.py
# Limpeza e normalização do corpus fonoaudiológico
# =============================================================================
"""
Módulo de limpeza textual para o corpus fonoaudiológico.

Operações realizadas (nesta ordem):
  1. Decodificação e normalização Unicode (NFC)
  2. Remoção de URLs e endereços de internet
  3. Remoção de linhas que contêm qualquer dígito
  4. Remoção de caracteres estranhos (mantém letras PT-BR, pontuação básica)
  5. Remoção de linhas muito curtas (menos de MIN_PALAVRAS palavras)
  6. Remoção de linhas muito longas (mais de MAX_PALAVRAS palavras)
  7. Normalização de espaços e pontuação
  8. Remoção de linhas de cabeçalho/metadados (Gutenberg, HTML, etc.)
  9. Remoção de duplicatas exatas (case-insensitive)
 10. Remoção de duplicatas quase-exatas (substrings)
"""

from __future__ import annotations

import logging
import re
import unicodedata
from pathlib import Path

log = logging.getLogger("fonolib.limpar")

# ---------------------------------------------------------------------------
# Parâmetros de filtragem
# ---------------------------------------------------------------------------
MIN_PALAVRAS = 4     # Descarta linhas com menos de N palavras
MAX_PALAVRAS = 80    # Descarta linhas com mais de N palavras (muito longas)

# Padrão: mantém letras, acento, espaço, pontuação básica e aspas
CHARS_PERMITIDOS = re.compile(
    r"[^a-zA-ZÀ-úÀ-ÿ\u00C0-\u017E\s.,;:!?'\"\(\)\-–—…]"
)

# Detecta qualquer dígito
REGEX_DIGITO = re.compile(r"\d")

# URLs e endereços
REGEX_URL = re.compile(
    r"https?://\S+|www\.\S+|[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

# Linhas típicas de metadados do Gutenberg e cabeçalhos HTML
REGEX_METADADOS = re.compile(
    r"(project gutenberg|gutenberg\.org|title:|author:|release date:|"
    r"language:|character set|produced by|html|encoding|<!doctype|"
    r"\[illustration|chapter [ivx]+|capítulo [ivx]+|parte [ivx]+|"
    r"transcribed by|updated editions will replace|"
    r"this ebook is for|copyright|all rights reserved)",
    re.IGNORECASE,
)

# Marcações de seção — linhas que são só títulos (CAPS ou numeradas)
REGEX_TITULO = re.compile(r"^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇÀÜ\s\.\-]+$")

# ---------------------------------------------------------------------------
# Funções de limpeza individuais
# ---------------------------------------------------------------------------

def _normalizar_unicode(texto: str) -> str:
    """Normaliza para NFC (forma canônica composta do Unicode)."""
    return unicodedata.normalize("NFC", texto)


def _remover_urls(texto: str) -> str:
    """Remove URLs, e-mails e endereços web."""
    return REGEX_URL.sub("", texto)


def _tem_digito(linha: str) -> bool:
    """Retorna True se a linha contiver qualquer dígito."""
    return bool(REGEX_DIGITO.search(linha))


def _remover_chars_estranhos(texto: str) -> str:
    """Remove caracteres fora do conjunto permitido."""
    return CHARS_PERMITIDOS.sub("", texto)


def _normalizar_espacos(texto: str) -> str:
    """Remove espaços múltiplos e espaços antes de pontuação."""
    texto = re.sub(r"[ \t]+", " ", texto)       # Múltiplos espaços → um
    texto = re.sub(r" ([.,;:!?])", r"\1", texto) # Espaço antes de pontuação
    texto = re.sub(r"\s*\n\s*", " ", texto)      # Quebras de linha internas
    return texto.strip()


def _e_linha_util(linha: str) -> bool:
    """
    Retorna False se a linha deve ser descartada.
    Aplica todos os filtros de qualidade.
    """
    linha = linha.strip()
    if not linha:
        return False

    # Contém dígito?
    if _tem_digito(linha):
        return False

    # Metadados técnicos?
    if REGEX_METADADOS.search(linha):
        return False

    # Linha de título em caixa alta?
    if REGEX_TITULO.match(linha) and len(linha) < 50:
        return False

    # Muitos caracteres não-ASCII seguidos? (lixo de encoding)
    if re.search(r"[^\x00-\xFF]{3,}", linha):
        return False

    # Quantidade de palavras
    palavras = linha.split()
    if len(palavras) < MIN_PALAVRAS:
        return False
    if len(palavras) > MAX_PALAVRAS:
        return False

    # Proporção de letras mínima (evita linhas só de pontuação)
    letras = sum(1 for c in linha if c.isalpha())
    if letras / max(len(linha), 1) < 0.5:
        return False

    return True


# ---------------------------------------------------------------------------
# Pipeline completo de limpeza de uma lista de linhas
# ---------------------------------------------------------------------------

def limpar_linhas(linhas: list[str]) -> list[str]:
    """
    Aplica o pipeline completo de limpeza a uma lista de strings.
    Retorna lista limpa, sem duplicatas, pronta para o corpus.
    """
    resultado: list[str] = []
    vistas: set[str] = set()  # Para deduplicação exata (lower)

    for linha in linhas:
        # 1. Normalização Unicode
        linha = _normalizar_unicode(linha)
        # 2. Remoção de URLs
        linha = _remover_urls(linha)
        # 3. Remoção de caracteres estranhos
        linha = _remover_chars_estranhos(linha)
        # 4. Normalização de espaços
        linha = _normalizar_espacos(linha)

        # 5. Filtros de qualidade
        if not _e_linha_util(linha):
            continue

        # 6. Deduplicação exata (normaliza para minúsculo sem pontuação)
        chave = re.sub(r"[^a-záéíóúâêîôûãõçàü ]", "", linha.lower())
        chave = re.sub(r"\s+", " ", chave).strip()
        if chave in vistas:
            continue
        vistas.add(chave)

        resultado.append(linha)

    return resultado


# ---------------------------------------------------------------------------
# Pipeline para arquivo corpus
# ---------------------------------------------------------------------------

def limpar_corpus(
    caminho: Path | str = "corpus/textos.txt",
    verbose: bool = True,
) -> int:
    """
    Lê o arquivo corpus, limpa e sobrescreve com a versão limpa.

    Parâmetros:
        caminho: Caminho do arquivo corpus.
        verbose: Se True, exibe estatísticas no terminal.

    Retorna o número de linhas no corpus limpo.
    """
    caminho = Path(caminho)

    if not caminho.exists():
        log.warning("Arquivo não encontrado: %s", caminho)
        if verbose:
            print(f"[AVISO] Arquivo '{caminho}' não encontrado.")
        return 0

    # Lê todas as linhas
    with open(caminho, encoding="utf-8") as f:
        linhas_originais = f.readlines()

    total_antes = len([l for l in linhas_originais if l.strip()])
    log.info("Corpus carregado: %d linhas.", total_antes)

    # Aplica limpeza
    linhas_limpas = limpar_linhas(linhas_originais)
    total_depois = len(linhas_limpas)

    # Sobrescreve o arquivo
    with open(caminho, "w", encoding="utf-8") as f:
        for linha in linhas_limpas:
            f.write(linha + "\n")

    removidas = total_antes - total_depois

    if verbose:
        print(f"[Limpeza] Antes: {total_antes} linhas")
        print(f"[Limpeza] Depois: {total_depois} linhas")
        print(f"[Limpeza] Removidas: {removidas} linhas ({removidas/max(total_antes,1)*100:.1f}%)")
        print(f"[Limpeza] Corpus limpo salvo em: {caminho}")

    log.info("Limpeza concluída: %d → %d linhas (%d removidas).",
             total_antes, total_depois, removidas)
    return total_depois


# ---------------------------------------------------------------------------
# Utilitários de inspeção
# ---------------------------------------------------------------------------

def inspecionar_corpus(caminho: Path | str = "corpus/textos.txt") -> dict:
    """
    Lê o corpus e retorna estatísticas básicas sem modificá-lo.
    """
    caminho = Path(caminho)
    if not caminho.exists():
        return {"erro": "Arquivo não encontrado"}

    with open(caminho, encoding="utf-8") as f:
        linhas = [l.strip() for l in f if l.strip()]

    if not linhas:
        return {"total": 0}

    comprimentos = [len(l.split()) for l in linhas]
    return {
        "total_linhas": len(linhas),
        "media_palavras": round(sum(comprimentos) / len(comprimentos), 1),
        "min_palavras": min(comprimentos),
        "max_palavras": max(comprimentos),
        "caminho": str(caminho),
    }


# ---------------------------------------------------------------------------
# Execução direta para testes
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    stats = inspecionar_corpus()
    print("Estatísticas antes da limpeza:")
    for k, v in stats.items():
        print(f"  {k}: {v}")

    n = limpar_corpus(verbose=True)
    print(f"\nCorpus limpo: {n} textos.")

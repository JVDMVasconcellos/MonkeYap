# =============================================================================
# fonolib/selecionar.py
# Seleção aleatória de trechos terapêuticos do corpus
# =============================================================================
"""
Módulo de seleção e randomização de trechos fonoaudiológicos.

Fornece:
  - get_trecho()             — Um trecho aleatório do corpus
  - get_trechos(n)           — N trechos aleatórios sem repetição
  - get_trecho_por_tamanho() — Trecho com controle de palavras
  - get_trava_linguas()      — Trava-língua aleatório
  - get_parlenda()           — Parlenda aleatória
  - get_bloco_terapeutico()  — Bloco com múltiplas frases para sessão
  - get_por_categoria()      — Texto de categoria específica

Estratégia de fonte:
  1. Se corpus/textos.txt existir e tiver linhas → usa arquivo
  2. Caso contrário → usa corpus embutido (generator.py)

Isso garante funcionamento 100% offline sem configuração extra.
"""

from __future__ import annotations

import logging
import random
from pathlib import Path
from typing import Optional

from fonolib.generator import CATEGORIAS, CORPUS_EMBUTIDO

log = logging.getLogger("fonolib.selecionar")

CORPUS_PATH = Path("corpus/textos.txt")

# ---------------------------------------------------------------------------
# Carregamento do corpus
# ---------------------------------------------------------------------------

def _carregar_corpus(caminho: Path = CORPUS_PATH) -> list[str]:
    """
    Carrega o corpus do arquivo se disponível, senão usa o embutido.
    Retorna lista de textos válidos (não vazios).
    """
    if caminho.exists():
        with open(caminho, encoding="utf-8") as f:
            linhas = [l.strip() for l in f if l.strip()]
        if linhas:
            log.debug("Corpus carregado do arquivo: %d textos.", len(linhas))
            return linhas

    log.debug("Usando corpus embutido: %d textos.", len(CORPUS_EMBUTIDO))
    return [t.strip() for t in CORPUS_EMBUTIDO if t.strip()]


# ---------------------------------------------------------------------------
# Funções públicas de seleção
# ---------------------------------------------------------------------------

def get_trecho(caminho: Path = CORPUS_PATH) -> str:
    """
    Retorna um único trecho aleatório do corpus.

    Exemplo:
        >>> from fonolib import get_trecho
        >>> print(get_trecho())
        O rato roeu a roupa do rei de Roma.
    """
    corpus = _carregar_corpus(caminho)
    if not corpus:
        return "Corpus vazio. Execute main.py para baixar os textos."
    return random.choice(corpus)


def get_trechos(
    n: int = 5,
    caminho: Path = CORPUS_PATH,
    repetir: bool = False,
) -> list[str]:
    """
    Retorna N trechos aleatórios.

    Parâmetros:
        n: Quantidade de trechos desejados.
        caminho: Caminho do corpus.
        repetir: Se True, permite repetição de trechos.

    Retorna lista de strings.
    """
    corpus = _carregar_corpus(caminho)
    if not corpus:
        return ["Corpus vazio. Execute main.py para baixar os textos."]

    if repetir or n > len(corpus):
        return [random.choice(corpus) for _ in range(n)]
    return random.sample(corpus, min(n, len(corpus)))


def get_trecho_por_tamanho(
    min_palavras: int = 5,
    max_palavras: int = 25,
    caminho: Path = CORPUS_PATH,
    tentativas: int = 200,
) -> str:
    """
    Retorna um trecho dentro do intervalo de palavras especificado.

    Parâmetros:
        min_palavras: Mínimo de palavras no trecho.
        max_palavras: Máximo de palavras no trecho.
        caminho: Caminho do corpus.
        tentativas: Máximo de tentativas antes de relaxar os critérios.

    Retorna o trecho encontrado ou uma mensagem de fallback.
    """
    corpus = _carregar_corpus(caminho)
    if not corpus:
        return "Corpus vazio."

    # Filtra primeiro para evitar busca lenta
    candidatos = [
        t for t in corpus
        if min_palavras <= len(t.split()) <= max_palavras
    ]

    if candidatos:
        return random.choice(candidatos)

    # Relaxa o critério e tenta
    for _ in range(tentativas):
        trecho = random.choice(corpus)
        n = len(trecho.split())
        if min_palavras <= n <= max_palavras:
            return trecho

    # Fallback: retorna o mais próximo do intervalo
    return min(corpus, key=lambda t: abs(len(t.split()) - (min_palavras + max_palavras) // 2))


def get_trava_linguas(caminho: Path = CORPUS_PATH) -> str:
    """
    Retorna um trava-língua aleatório.
    Prioriza o corpus embutido; complementa com o arquivo se disponível.
    """
    from fonolib.generator import TRAVA_LINGUAS

    pool: list[str] = list(TRAVA_LINGUAS)

    # Adiciona trechos do arquivo que pareçam trava-línguas (repetição de sílabas)
    if caminho.exists():
        with open(caminho, encoding="utf-8") as f:
            for linha in f:
                linha = linha.strip()
                if linha and _parece_trava_lingua(linha):
                    pool.append(linha)

    return random.choice(pool) if pool else get_trecho(caminho)


def get_parlenda(caminho: Path = CORPUS_PATH) -> str:
    """Retorna uma parlenda ou cantiga popular aleatória."""
    from fonolib.generator import PARLENDAS
    return random.choice(PARLENDAS)


def get_por_categoria(categoria: str) -> str:
    """
    Retorna um texto aleatório de uma categoria específica.

    Categorias disponíveis:
        trava_lingua, parlenda, fonetico, poesia,
        articulatorio, conto, proverbio, prosodia

    Exemplo:
        >>> get_por_categoria("poesia")
        'Minha terra tem palmeiras onde canta o sabiá.'
    """
    cat = categoria.lower().strip()
    if cat not in CATEGORIAS:
        disponiveis = ", ".join(CATEGORIAS.keys())
        raise ValueError(f"Categoria '{cat}' inválida. Use: {disponiveis}")
    return random.choice(CATEGORIAS[cat])


def get_bloco_terapeutico(
    n_frases: int = 5,
    min_palavras: int = 5,
    max_palavras: int = 20,
    caminho: Path = CORPUS_PATH,
) -> str:
    """
    Monta um bloco terapêutico para uma sessão de leitura oral.

    Retorna um texto formatado com N frases de comprimento controlado,
    numeradas e separadas por linha em branco.

    Parâmetros:
        n_frases: Número de frases no bloco.
        min_palavras: Mínimo de palavras por frase.
        max_palavras: Máximo de palavras por frase.
        caminho: Caminho do corpus.

    Retorna string formatada para exibição.
    """
    trechos = []
    usados: set[str] = set()
    corpus = _carregar_corpus(caminho)

    # Filtra candidatos por tamanho
    candidatos = [
        t for t in corpus
        if min_palavras <= len(t.split()) <= max_palavras
    ]
    if not candidatos:
        candidatos = corpus

    # Seleciona sem repetição
    embaralhado = candidatos[:]
    random.shuffle(embaralhado)
    for t in embaralhado:
        if t not in usados:
            trechos.append(t)
            usados.add(t)
        if len(trechos) >= n_frases:
            break

    # Se não tiver suficiente, completa com repetição
    while len(trechos) < n_frases:
        trechos.append(random.choice(corpus))

    # Formata
    linhas = [f"{i}. {t}" for i, t in enumerate(trechos, 1)]
    return "\n\n".join(linhas)


def estatisticas_corpus(caminho: Path = CORPUS_PATH) -> dict:
    """Retorna estatísticas básicas do corpus ativo."""
    corpus = _carregar_corpus(caminho)
    if not corpus:
        return {"total": 0, "fonte": "vazio"}

    comprimentos = [len(t.split()) for t in corpus]
    fonte = "arquivo" if caminho.exists() else "embutido"

    return {
        "total": len(corpus),
        "fonte": fonte,
        "media_palavras": round(sum(comprimentos) / len(comprimentos), 1),
        "min_palavras": min(comprimentos),
        "max_palavras": max(comprimentos),
    }


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _parece_trava_lingua(texto: str) -> bool:
    """
    Heurística simples para detectar trava-línguas:
    alta repetição de sílabas ou letras iniciais iguais.
    """
    palavras = texto.lower().split()
    if len(palavras) < 4:
        return False
    # Verifica se muitas palavras começam com a mesma letra
    letras_iniciais = [p[0] for p in palavras if p]
    if not letras_iniciais:
        return False
    mais_comum = max(set(letras_iniciais), key=letras_iniciais.count)
    proporcao = letras_iniciais.count(mais_comum) / len(letras_iniciais)
    return proporcao >= 0.4


# ---------------------------------------------------------------------------
# Execução direta para testes
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=== Estatísticas do corpus ===")
    stats = estatisticas_corpus()
    for k, v in stats.items():
        print(f"  {k}: {v}")

    print("\n=== Trecho aleatório ===")
    print(get_trecho())

    print("\n=== Trava-língua ===")
    print(get_trava_linguas())

    print("\n=== Trecho com 8-15 palavras ===")
    print(get_trecho_por_tamanho(8, 15))

    print("\n=== Bloco terapêutico (3 frases) ===")
    print(get_bloco_terapeutico(3))

    print("\n=== Por categoria (poesia) ===")
    print(get_por_categoria("poesia"))

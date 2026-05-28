# =============================================================================
# exemplo_uso.py
# Demonstração das funcionalidades do FonoCorpus
# =============================================================================
"""
Exemplos reais de saída do FonoCorpus.
Execute com: python exemplo_uso.py
"""

from fonolib import (
    get_trecho,
    get_trechos,
    get_trecho_por_tamanho,
    get_trava_linguas,
    get_parlenda,
)
from fonolib.selecionar import (
    get_bloco_terapeutico,
    get_por_categoria,
    estatisticas_corpus,
)
from fonolib.generator import exportar_corpus
from fonolib.limpar import inspecionar_corpus


def sep(titulo: str = "", char: str = "═", largura: int = 60) -> None:
    if titulo:
        print(f"\n{char * 3}  {titulo}  {char * (largura - len(titulo) - 7)}")
    else:
        print(char * largura)


def main() -> None:
    # -------------------------------------------------------------------------
    # 1. Inicializar corpus (garante que corpus/textos.txt existe)
    # -------------------------------------------------------------------------
    sep("Inicializando corpus embutido")
    n = exportar_corpus("corpus/textos.txt")
    print(f"  Corpus inicializado com {n} textos.")

    stats = inspecionar_corpus()
    print(f"  Média de palavras por texto: {stats.get('media_palavras')}")
    print(f"  Menor texto: {stats.get('min_palavras')} palavras")
    print(f"  Maior texto: {stats.get('max_palavras')} palavras")

    # -------------------------------------------------------------------------
    # 2. Trecho aleatório simples
    # -------------------------------------------------------------------------
    sep("Trecho aleatório")
    print(f"\n  {get_trecho()}")

    # -------------------------------------------------------------------------
    # 3. Vários trechos de uma vez
    # -------------------------------------------------------------------------
    sep("Cinco trechos aleatórios")
    for i, t in enumerate(get_trechos(5), 1):
        print(f"\n  {i}. {t}")

    # -------------------------------------------------------------------------
    # 4. Trava-língua
    # -------------------------------------------------------------------------
    sep("Trava-língua")
    print(f"\n  {get_trava_linguas()}")

    # -------------------------------------------------------------------------
    # 5. Parlenda
    # -------------------------------------------------------------------------
    sep("Parlenda tradicional")
    print(f"\n  {get_parlenda()}")

    # -------------------------------------------------------------------------
    # 6. Trecho por número de palavras
    # -------------------------------------------------------------------------
    sep("Trecho curto (5 a 10 palavras)")
    print(f"\n  {get_trecho_por_tamanho(5, 10)}")

    sep("Trecho médio (11 a 20 palavras)")
    print(f"\n  {get_trecho_por_tamanho(11, 20)}")

    sep("Trecho longo (21 a 40 palavras)")
    print(f"\n  {get_trecho_por_tamanho(21, 40)}")

    # -------------------------------------------------------------------------
    # 7. Bloco terapêutico completo
    # -------------------------------------------------------------------------
    sep("Bloco terapêutico — 5 frases para leitura oral")
    bloco = get_bloco_terapeutico(5, min_palavras=6, max_palavras=20)
    print()
    for linha in bloco.split("\n"):
        print(f"  {linha}")

    # -------------------------------------------------------------------------
    # 8. Por categoria
    # -------------------------------------------------------------------------
    sep("Por categoria: poesia")
    print(f"\n  {get_por_categoria('poesia')}")

    sep("Por categoria: proverbio")
    print(f"\n  {get_por_categoria('proverbio')}")

    sep("Por categoria: articulatorio")
    print(f"\n  {get_por_categoria('articulatorio')}")

    sep("Por categoria: conto")
    print(f"\n  {get_por_categoria('conto')}")

    # -------------------------------------------------------------------------
    # 9. Estatísticas finais
    # -------------------------------------------------------------------------
    sep("Estatísticas do corpus ativo")
    print()
    for k, v in estatisticas_corpus().items():
        print(f"  {k:<20}: {v}")

    sep()
    print("\n  FonoCorpus funcionando corretamente!")
    print("  Execute 'python main.py' para o menu interativo.\n")


if __name__ == "__main__":
    main()

# =============================================================================
# main.py
# FonoCorpus — Interface de linha de comando principal
# =============================================================================
"""
FonoCorpus — Sistema de textos para treino fonoaudiológico.

Uso:
    python main.py                    # Menu interativo
    python main.py --baixar           # Baixa corpus (offline)
    python main.py --baixar --online  # Baixa corpus com fontes externas
    python main.py --limpar           # Limpa e deduplica o corpus
    python main.py --trecho           # Exibe um trecho aleatório
    python main.py --bloco N          # Exibe bloco terapêutico com N frases
    python main.py --categoria NOME   # Exibe texto de categoria específica
    python main.py --stats            # Mostra estatísticas do corpus
    python main.py --ajuda            # Exibe este texto de ajuda
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
BANNER = r"""
╔══════════════════════════════════════════════════════════════╗
║          F O N O C O R P U S  — v1.0                        ║
║   Textos para treino fonoaudiológico em Português Brasileiro ║
╚══════════════════════════════════════════════════════════════╝
"""

MENU_TEXTO = """
Escolha uma opção:

  [1] Baixar corpus (offline — corpus embutido)
  [2] Baixar corpus (online — inclui Project Gutenberg e Wikisource)
  [3] Limpar e deduplicar corpus
  [4] Exibir trecho aleatório
  [5] Exibir trava-língua
  [6] Exibir parlenda
  [7] Exibir bloco terapêutico
  [8] Exibir trecho por tamanho
  [9] Exibir texto por categoria
  [S] Estatísticas do corpus
  [0] Sair

"""

CATEGORIAS_MENU = (
    "trava_lingua, parlenda, fonetico, poesia, "
    "articulatorio, conto, proverbio, prosodia"
)

CORPUS_PATH = Path("corpus/textos.txt")


# ---------------------------------------------------------------------------
# Helpers de exibição
# ---------------------------------------------------------------------------

def _separador(char: str = "─", largura: int = 62) -> None:
    print(char * largura)


def _titulo(texto: str) -> None:
    _separador()
    print(f"  {texto}")
    _separador()


def _pausar() -> None:
    print()
    input("  [ Pressione Enter para continuar ]")
    print()


# ---------------------------------------------------------------------------
# Ações do menu
# ---------------------------------------------------------------------------

def acao_baixar(online: bool = False, pausar: bool = True) -> None:
    from fonolib.scraper import baixar_corpus

    modo = "online" if online else "offline (corpus embutido)"
    _titulo(f"Baixando corpus — modo {modo}")
    n = baixar_corpus(caminho=CORPUS_PATH, online=online)
    print(f"\n  Total de textos adicionados: {n}")
    if pausar:
        _pausar()


def acao_limpar(pausar: bool = True) -> None:
    from fonolib.limpar import limpar_corpus, inspecionar_corpus

    _titulo("Limpando e deduplicando o corpus")
    print()
    stats_antes = inspecionar_corpus(CORPUS_PATH)
    if "erro" in stats_antes:
        print(f"  [AVISO] {stats_antes['erro']}")
        print("  Execute a opção 1 ou 2 primeiro para baixar o corpus.")
        if pausar:
            _pausar()
        return

    n = limpar_corpus(caminho=CORPUS_PATH, verbose=True)
    print(f"\n  Corpus limpo: {n} textos prontos para uso.")
    if pausar:
        _pausar()


def acao_trecho(pausar: bool = True) -> None:
    from fonolib.selecionar import get_trecho

    _titulo("Trecho aleatório")
    print()
    print(f"  {get_trecho(CORPUS_PATH)}")
    if pausar:
        _pausar()


def acao_trava_lingua(pausar: bool = True) -> None:
    from fonolib.selecionar import get_trava_linguas

    _titulo("Trava-língua")
    print()
    print(f"  {get_trava_linguas(CORPUS_PATH)}")
    if pausar:
        _pausar()


def acao_parlenda(pausar: bool = True) -> None:
    from fonolib.selecionar import get_parlenda

    _titulo("Parlenda")
    print()
    print(f"  {get_parlenda(CORPUS_PATH)}")
    if pausar:
        _pausar()


def acao_bloco(n_frases: int = 5, pausar: bool = True) -> None:
    from fonolib.selecionar import get_bloco_terapeutico

    _titulo(f"Bloco terapêutico — {n_frases} frases")
    print()
    bloco = get_bloco_terapeutico(n_frases=n_frases, caminho=CORPUS_PATH)
    for linha in bloco.split("\n"):
        print(f"  {linha}")
    if pausar:
        _pausar()


def acao_por_tamanho() -> None:
    from fonolib.selecionar import get_trecho_por_tamanho

    _titulo("Trecho por tamanho")
    print()
    try:
        min_p = int(input("  Mínimo de palavras [padrão: 5]: ").strip() or "5")
        max_p = int(input("  Máximo de palavras [padrão: 20]: ").strip() or "20")
    except ValueError:
        print("  [ERRO] Valor inválido. Usando padrões.")
        min_p, max_p = 5, 20

    trecho = get_trecho_por_tamanho(min_p, max_p, caminho=CORPUS_PATH)
    print(f"\n  {trecho}")
    _pausar()


def acao_por_categoria() -> None:
    from fonolib.selecionar import get_por_categoria

    _titulo("Texto por categoria")
    print(f"  Categorias: {CATEGORIAS_MENU}")
    print()
    cat = input("  Digite a categoria: ").strip()
    if not cat:
        return
    try:
        texto = get_por_categoria(cat)
        print(f"\n  {texto}")
    except ValueError as e:
        print(f"\n  [ERRO] {e}")
    _pausar()


def acao_stats(pausar: bool = True) -> None:
    from fonolib.selecionar import estatisticas_corpus

    _titulo("Estatísticas do corpus")
    print()
    stats = estatisticas_corpus(CORPUS_PATH)
    for chave, valor in stats.items():
        print(f"  {chave:<20}: {valor}")
    if pausar:
        _pausar()


# ---------------------------------------------------------------------------
# Menu interativo
# ---------------------------------------------------------------------------

def menu_interativo() -> None:
    """Loop principal do menu CLI."""
    print(BANNER)

    while True:
        print(MENU_TEXTO)
        opcao = input("  Opção: ").strip().upper()
        print()

        if opcao == "1":
            acao_baixar(online=False)
        elif opcao == "2":
            acao_baixar(online=True)
        elif opcao == "3":
            acao_limpar()
        elif opcao == "4":
            acao_trecho()
        elif opcao == "5":
            acao_trava_lingua()
        elif opcao == "6":
            acao_parlenda()
        elif opcao == "7":
            try:
                n = int(input("  Quantas frases? [padrão: 5]: ").strip() or "5")
            except ValueError:
                n = 5
            acao_bloco(n)
        elif opcao == "8":
            acao_por_tamanho()
        elif opcao == "9":
            acao_por_categoria()
        elif opcao == "S":
            acao_stats()
        elif opcao == "0":
            print("  Até logo!")
            break
        else:
            print("  [AVISO] Opção inválida. Tente novamente.")


# ---------------------------------------------------------------------------
# Interface por argumentos (modo não-interativo)
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="FonoCorpus — Textos para treino fonoaudiológico",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--baixar", action="store_true", help="Baixa o corpus")
    parser.add_argument("--online", action="store_true", help="Inclui fontes online ao baixar")
    parser.add_argument("--limpar", action="store_true", help="Limpa o corpus")
    parser.add_argument("--trecho", action="store_true", help="Exibe trecho aleatório")
    parser.add_argument("--bloco", type=int, metavar="N", help="Bloco terapêutico com N frases")
    parser.add_argument("--categoria", metavar="NOME", help=f"Categoria: {CATEGORIAS_MENU}")
    parser.add_argument("--stats", action="store_true", help="Estatísticas do corpus")
    parser.add_argument("--ajuda", action="store_true", help="Exibe ajuda detalhada")
    return parser.parse_args()


def _modo_args(args: argparse.Namespace) -> bool:
    """Executa ações via argumentos. Retorna True se alguma ação foi realizada."""
    feito = False

    if args.ajuda:
        print(__doc__)
        return True

    if args.baixar:
        acao_baixar(online=args.online, pausar=False)
        feito = True

    if args.limpar:
        acao_limpar(pausar=False)
        feito = True

    if args.trecho:
        from fonolib.selecionar import get_trecho
        print(get_trecho(CORPUS_PATH))
        feito = True

    if args.bloco is not None:
        from fonolib.selecionar import get_bloco_terapeutico
        print(get_bloco_terapeutico(args.bloco, caminho=CORPUS_PATH))
        feito = True

    if args.categoria:
        from fonolib.selecionar import get_por_categoria
        try:
            print(get_por_categoria(args.categoria))
        except ValueError as e:
            print(f"[ERRO] {e}", file=sys.stderr)
            sys.exit(1)
        feito = True

    if args.stats:
        acao_stats(pausar=False)
        feito = True

    return feito


# ---------------------------------------------------------------------------
# Ponto de entrada
# ---------------------------------------------------------------------------

def main() -> None:
    args = _parse_args()

    # Se algum argumento foi passado, executa em modo não-interativo
    if any(vars(args).values()):
        _modo_args(args)
    else:
        # Sem argumentos → menu interativo
        menu_interativo()


if __name__ == "__main__":
    main()

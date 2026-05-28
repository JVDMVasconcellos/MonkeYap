# =============================================================================
# fonolib/scraper.py
# Coletor de textos públicos para o corpus fonoaudiológico
# =============================================================================
"""
Scraper responsável por coletar textos de fontes públicas e estáveis.

Fontes utilizadas:
  1. Project Gutenberg (gutenberg.org) — livros em domínio público
  2. Wikisource em Português — textos literários abertos
  3. Corpus embutido (generator.py) — sempre disponível offline

Princípios:
  - Respeita robots.txt de cada domínio
  - Usa User-Agent identificável
  - Tem retry automático com backoff exponencial
  - Salva incrementalmente (nunca perde o que já foi coletado)
  - Nunca coleta dados pessoais
"""

from __future__ import annotations

import logging
import os
import time
import urllib.robotparser
from pathlib import Path
from typing import Iterator
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Configuração de logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fonolib.scraper")

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
USER_AGENT = (
    "FonoCorpus/1.0 (coletor de textos educacionais; "
    "projeto fonoaudiológico sem fins comerciais; "
    "+https://github.com/educacao/fonocorpus)"
)
HEADERS = {"User-Agent": USER_AGENT, "Accept-Language": "pt-BR,pt;q=0.9"}
TIMEOUT = 20          # segundos por requisição
MAX_RETRIES = 3       # tentativas antes de desistir
RETRY_DELAY = 5       # segundos entre tentativas (multiplica por tentativa)
CORPUS_PATH = Path("corpus/textos.txt")

# ---------------------------------------------------------------------------
# Verificador de robots.txt
# ---------------------------------------------------------------------------
_robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}


def _pode_acessar(url: str) -> bool:
    """Verifica se o robots.txt permite o acesso ao URL pelo nosso agente."""
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    robots_url = urljoin(base, "/robots.txt")

    if base not in _robots_cache:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(robots_url)
        try:
            rp.read()
        except Exception:
            # Se não conseguir ler o robots.txt, assume permissão
            rp = None
        _robots_cache[base] = rp

    rp = _robots_cache[base]
    if rp is None:
        return True
    return rp.can_fetch(USER_AGENT, url)


# ---------------------------------------------------------------------------
# Requisição HTTP com retry automático
# ---------------------------------------------------------------------------
def _get(url: str, timeout: int = TIMEOUT) -> requests.Response | None:
    """
    Faz uma requisição GET com retry exponencial.
    Retorna None se todas as tentativas falharem.
    """
    if not _pode_acessar(url):
        log.warning("Bloqueado por robots.txt: %s", url)
        return None

    for tentativa in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            return resp
        except requests.exceptions.HTTPError as e:
            log.warning("HTTP %s em %s (tentativa %d/%d)", e.response.status_code, url, tentativa, MAX_RETRIES)
            if e.response.status_code in (403, 404, 410):
                return None  # Sem retry para erros permanentes
        except requests.exceptions.ConnectionError:
            log.warning("Erro de conexão em %s (tentativa %d/%d)", url, tentativa, MAX_RETRIES)
        except requests.exceptions.Timeout:
            log.warning("Timeout em %s (tentativa %d/%d)", url, tentativa, MAX_RETRIES)
        except requests.exceptions.RequestException as e:
            log.warning("Erro em %s: %s (tentativa %d/%d)", url, e, tentativa, MAX_RETRIES)

        if tentativa < MAX_RETRIES:
            espera = RETRY_DELAY * tentativa
            log.info("Aguardando %ds antes de nova tentativa...", espera)
            time.sleep(espera)

    return None


# ---------------------------------------------------------------------------
# Salva textos incrementalmente no corpus
# ---------------------------------------------------------------------------
def _salvar_textos(textos: list[str], caminho: Path = CORPUS_PATH) -> int:
    """
    Acrescenta textos ao arquivo corpus, evitando duplicatas simples.
    Retorna a quantidade de linhas adicionadas.
    """
    caminho.parent.mkdir(parents=True, exist_ok=True)

    # Lê o que já existe para evitar duplicatas
    existentes: set[str] = set()
    if caminho.exists():
        with open(caminho, encoding="utf-8") as f:
            existentes = {linha.strip() for linha in f if linha.strip()}

    novos = [t for t in textos if t.strip() and t.strip() not in existentes]

    if novos:
        with open(caminho, "a", encoding="utf-8") as f:
            for texto in novos:
                f.write(texto.strip() + "\n")
        log.info("%d novos textos adicionados ao corpus.", len(novos))
    else:
        log.info("Nenhum texto novo para adicionar.")

    return len(novos)


# ---------------------------------------------------------------------------
# Extrator genérico de texto de HTML
# ---------------------------------------------------------------------------
def _extrair_paragrafos(html: str, url: str = "") -> list[str]:
    """
    Extrai parágrafos de uma página HTML usando BeautifulSoup.
    Remove elementos de navegação, scripts e rodapés.
    """
    soup = BeautifulSoup(html, "lxml")

    # Remove elementos indesejados
    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "form", "button", "iframe", "noscript"]):
        tag.decompose()

    paragrafos: list[str] = []
    for elem in soup.find_all(["p", "div", "span", "li", "blockquote", "td"]):
        texto = elem.get_text(separator=" ", strip=True)
        # Filtra parágrafos de conteúdo mínimo (pelo menos palavras)
        palavras = texto.split()
        if len(palavras) >= 5:
            paragrafos.append(" ".join(palavras))

    return paragrafos


# ---------------------------------------------------------------------------
# FONTE 1: Project Gutenberg — textos em Português
# ---------------------------------------------------------------------------

# IDs de obras conhecidas em domínio público em língua portuguesa
GUTENBERG_IDS_PT = [
    # Contos e poesia brasileiros — Machado de Assis
    ("55752", "Contos Fluminenses - Machado de Assis"),
    ("67482", "Dom Casmurro - Machado de Assis"),
    ("55682", "Memórias Póstumas de Brás Cubas - Machado de Assis"),
    # Eça de Queirós (Portugal, domínio público)
    ("29119", "A Cidade e as Serras - Eça de Queirós"),
    # Gonçalves Dias — poesia
    ("37556", "Poesias - Gonçalves Dias"),
    # José de Alencar
    ("31446", "Iracema - José de Alencar"),
    ("26606", "O Guarani - José de Alencar"),
    # Euclides da Cunha
    ("7524",  "Os Sertões - Euclides da Cunha"),
    # Olavo Bilac
    ("22420", "Poesias - Olavo Bilac"),
    # Lima Barreto
    ("31176", "Triste Fim de Policarpo Quaresma - Lima Barreto"),
]

GUTENBERG_TEXT_BASE = "https://www.gutenberg.org/files/{id}/{id}-0.txt"
GUTENBERG_CACHE_BASE = "https://gutendex.com/books/{id}/"


def _url_gutenberg(book_id: str) -> list[str]:
    """Tenta várias URLs possíveis de um livro no Gutenberg."""
    bid = book_id.lstrip("0")
    return [
        f"https://www.gutenberg.org/files/{bid}/{bid}-0.txt",
        f"https://www.gutenberg.org/files/{bid}/{bid}.txt",
        f"https://www.gutenberg.org/cache/epub/{bid}/pg{bid}.txt",
    ]


def _limpar_texto_gutenberg(texto: str) -> list[str]:
    """
    Remove o cabeçalho e rodapé padrão do Gutenberg e extrai linhas úteis.
    """
    linhas = texto.splitlines()
    inicio = 0
    fim = len(linhas)

    # Localiza o início do conteúdo
    for i, linha in enumerate(linhas):
        if "*** START OF" in linha.upper() or "***START OF" in linha.upper():
            inicio = i + 1
            break

    # Localiza o fim do conteúdo
    for i in range(len(linhas) - 1, -1, -1):
        if "*** END OF" in linhas[i].upper() or "***END OF" in linhas[i].upper():
            fim = i
            break

    conteudo = linhas[inicio:fim]
    # Filtra linhas com conteúdo mínimo
    resultado: list[str] = []
    buffer = ""
    for linha in conteudo:
        linha = linha.strip()
        if not linha:
            if buffer:
                resultado.append(buffer.strip())
                buffer = ""
        else:
            buffer = (buffer + " " + linha).strip()
    if buffer:
        resultado.append(buffer)

    return [p for p in resultado if len(p.split()) >= 5]


def coletar_gutenberg(
    max_livros: int = 3,
    caminho: Path = CORPUS_PATH,
) -> int:
    """
    Coleta textos do Project Gutenberg em Português.
    Processa até max_livros livros para manter tempos razoáveis.
    Retorna total de linhas adicionadas ao corpus.
    """
    log.info("=== Iniciando coleta do Project Gutenberg ===")
    total_adicionado = 0

    for book_id, titulo in GUTENBERG_IDS_PT[:max_livros]:
        log.info("Baixando: %s (ID %s)...", titulo, book_id)
        texto_bruto = None

        for url in _url_gutenberg(book_id):
            resp = _get(url)
            if resp is not None:
                texto_bruto = resp.text
                log.info("  Obtido de: %s", url)
                break

        if texto_bruto is None:
            log.warning("  Não foi possível baixar %s.", titulo)
            continue

        paragrafos = _limpar_texto_gutenberg(texto_bruto)
        log.info("  %d parágrafos extraídos.", len(paragrafos))

        adicionados = _salvar_textos(paragrafos, caminho)
        total_adicionado += adicionados

        # Pausa respeitosa entre requisições
        time.sleep(2)

    log.info("=== Gutenberg: %d textos adicionados no total ===", total_adicionado)
    return total_adicionado


# ---------------------------------------------------------------------------
# FONTE 2: Wikisource Português — textos literários abertos
# ---------------------------------------------------------------------------

WIKISOURCE_PAGINAS = [
    ("https://pt.wikisource.org/wiki/Obras_po%C3%A9ticas_de_Casimiro_de_Abreu",
     "Poesias de Casimiro de Abreu"),
    ("https://pt.wikisource.org/wiki/Poesias_(Olavo_Bilac)",
     "Poesias de Olavo Bilac"),
    ("https://pt.wikisource.org/wiki/Poesias_completas_(Alphonsus_de_Guimaraens)",
     "Poesias de Alphonsus de Guimaraens"),
    ("https://pt.wikisource.org/wiki/Primeiros_cantos",
     "Primeiros Cantos - Gonçalves Dias"),
]


def _extrair_wikisource(html: str) -> list[str]:
    """Extrai texto principal de uma página da Wikisource."""
    soup = BeautifulSoup(html, "lxml")

    # Remove sumário e elementos de interface
    for tag in soup.find_all(class_=["toc", "mw-editsection", "noprint",
                                     "sister-project", "navbox", "metadata"]):
        tag.decompose()

    conteudo = soup.find(id="mw-content-text")
    if conteudo is None:
        conteudo = soup

    paragrafos: list[str] = []
    for elem in conteudo.find_all(["p", "div", "span"]):
        if elem.find(["p", "div"]):  # Evita containers
            continue
        texto = elem.get_text(separator=" ", strip=True)
        if len(texto.split()) >= 5:
            paragrafos.append(texto)

    return paragrafos


def coletar_wikisource(caminho: Path = CORPUS_PATH) -> int:
    """
    Coleta textos literários da Wikisource em Português.
    Retorna total de linhas adicionadas ao corpus.
    """
    log.info("=== Iniciando coleta da Wikisource ===")
    total = 0

    for url, titulo in WIKISOURCE_PAGINAS:
        log.info("Baixando: %s ...", titulo)
        resp = _get(url)
        if resp is None:
            continue

        paragrafos = _extrair_wikisource(resp.text)
        log.info("  %d trechos extraídos.", len(paragrafos))

        adicionados = _salvar_textos(paragrafos, caminho)
        total += adicionados
        time.sleep(1)

    log.info("=== Wikisource: %d textos adicionados no total ===", total)
    return total


# ---------------------------------------------------------------------------
# FONTE 3: Corpus embutido (sempre disponível, sem internet)
# ---------------------------------------------------------------------------

def usar_corpus_embutido(caminho: Path = CORPUS_PATH) -> int:
    """
    Grava o corpus embutido no arquivo (sem necessidade de internet).
    Ideal para uso offline ou primeiro uso.
    Retorna quantidade de textos adicionados.
    """
    from fonolib.generator import CORPUS_EMBUTIDO

    log.info("=== Carregando corpus embutido ===")
    adicionados = _salvar_textos(CORPUS_EMBUTIDO, caminho)
    log.info("=== Corpus embutido: %d textos adicionados ===", adicionados)
    return adicionados


# ---------------------------------------------------------------------------
# Função principal de coleta — orquestra todas as fontes
# ---------------------------------------------------------------------------

def baixar_corpus(
    caminho: Path = CORPUS_PATH,
    online: bool = True,
    max_livros_gutenberg: int = 2,
) -> int:
    """
    Coleta textos de todas as fontes disponíveis e salva no corpus.

    Parâmetros:
        caminho: Caminho do arquivo de saída.
        online: Se True, tenta fontes online além do corpus embutido.
        max_livros_gutenberg: Limite de livros baixados do Gutenberg.

    Retorna o total de textos adicionados ao corpus.
    """
    total = 0

    # Sempre inclui corpus embutido
    total += usar_corpus_embutido(caminho)

    if online:
        log.info("Modo online ativado — coletando fontes externas...")

        # Project Gutenberg
        try:
            total += coletar_gutenberg(max_livros=max_livros_gutenberg, caminho=caminho)
        except Exception as e:
            log.error("Erro ao coletar Gutenberg: %s", e)

        # Wikisource
        try:
            total += coletar_wikisource(caminho=caminho)
        except Exception as e:
            log.error("Erro ao coletar Wikisource: %s", e)

    log.info("=== Total geral: %d textos adicionados ao corpus ===", total)
    return total


# ---------------------------------------------------------------------------
# Execução direta para testes
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Testando coleta (somente corpus embutido)...")
    n = baixar_corpus(online=False)
    print(f"Textos adicionados ao corpus: {n}")

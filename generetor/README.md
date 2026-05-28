# FonoCorpus

Sistema Python para coleta, limpeza e seleção de textos usados em fonoaudiologia —
treino de leitura oral, articulação, dicção e fluência em Português Brasileiro.

Funciona **100% offline** desde o primeiro uso. Não precisa de API, cadastro ou
internet para começar. Todos os textos já estão gravados dentro do próprio projeto.

---

## Índice

1. [Como o projeto funciona](#como-o-projeto-funciona)
2. [Onde ficam os textos](#onde-ficam-os-textos)
3. [Estrutura de arquivos](#estrutura-de-arquivos)
4. [Instalação no Ubuntu/Linux](#instalação-no-ubuntulinux)
5. [Pegando trechos e trava-línguas — exemplos práticos](#pegando-trechos-e-trava-línguas--exemplos-práticos)
6. [Todas as funções disponíveis](#todas-as-funções-disponíveis)
7. [Interface de linha de comando](#interface-de-linha-de-comando)
8. [Menu interativo](#menu-interativo)
9. [Categorias do corpus](#categorias-do-corpus)
10. [Limpeza automática dos textos](#limpeza-automática-dos-textos)
11. [Coleta online opcional](#coleta-online-opcional)
12. [Dependências](#dependências)

---

## Como o projeto funciona

O FonoCorpus tem **duas camadas de textos** que funcionam juntas:

```
Camada 1 — Corpus embutido (sempre disponível, sem internet)
  fonolib/generator.py
  └── +245 textos escritos à mão, organizados em 8 categorias

Camada 2 — Arquivo gerado (corpus/textos.txt)
  corpus/textos.txt
  └── arquivo de texto simples, uma frase por linha
      criado a partir do corpus embutido + coletas opcionais online
```

Quando você chama qualquer função de seleção, o projeto:
1. Tenta ler `corpus/textos.txt` — se existir, usa ele
2. Se o arquivo não existir, cai direto para o corpus embutido em `generator.py`

Isso significa que **nunca vai dar erro por corpus vazio**.

---

## Onde ficam os textos

### Textos embutidos no código — `fonolib/generator.py`

Este é o coração do projeto. Abra o arquivo e você verá listas Python com os
textos organizados por categoria:

```python
# fonolib/generator.py

TRAVA_LINGUAS = [
    "O rato roeu a roupa do rei de Roma.",
    "Três pratos de trigo para três tigres tristes.",
    "Um ninho de mafagafos cheio de mafagafinhos...",
    # ... mais 37 trava-línguas
]

PARLENDAS = [
    "Uni duni tê, salamê minguê...",
    "Atirei o pau no gato...",
    # ... mais 22 parlendas
]

POESIA_DOMINIO_PUBLICO = [
    "Minha terra tem palmeiras onde canta o sabiá...",  # Gonçalves Dias
    "Ora, direis, ouvir estrelas!...",                  # Olavo Bilac
    # ... mais versos de Cecília Meireles, Castro Alves...
]

# ... mais categorias

CORPUS_EMBUTIDO = TRAVA_LINGUAS + PARLENDAS + FONETICAMENTE_RICOS + ...
```

**Para adicionar seus próprios textos:** basta abrir `fonolib/generator.py` e
acrescentar strings em qualquer lista. Eles estarão disponíveis imediatamente,
sem precisar rodar nenhum comando.

### Textos no arquivo — `corpus/textos.txt`

Depois de rodar `python main.py --baixar`, o arquivo `corpus/textos.txt` é
criado. Ele contém uma frase por linha:

```
O rato roeu a roupa do rei de Roma.
Três pratos de trigo para três tigres tristes.
Minha terra tem palmeiras onde canta o sabiá.
A tarde caía devagar sobre a cidade...
...
```

Você pode abrir, editar e acrescentar linhas neste arquivo diretamente em
qualquer editor de texto. O projeto vai ler tudo automaticamente.

---

## Estrutura de arquivos

```
fonte/
│
├── fonolib/                      ← pacote principal
│   ├── __init__.py               ← exporta todas as funções públicas
│   ├── generator.py              ← ★ AQUI ficam os textos embutidos
│   ├── scraper.py                ← coleta online (Gutenberg, Wikisource)
│   ├── limpar.py                 ← limpeza, remoção de números, deduplicação
│   └── selecionar.py             ← funções de seleção e randomização
│
├── corpus/
│   └── textos.txt                ← ★ AQUI fica o corpus gerado (uma frase/linha)
│
├── main.py                       ← CLI: menu interativo + argumentos
├── exemplo_uso.py                ← demonstração de todas as funcionalidades
├── requirements.txt              ← requests, beautifulsoup4, lxml
├── setup.sh                      ← instalação automática no Linux
└── venv/                         ← ambiente virtual Python
```

---

## Instalação no Ubuntu/Linux

### Pré-requisitos

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip -y
```

### Opção 1 — Script automático

```bash
chmod +x setup.sh
./setup.sh
```

### Opção 2 — Passo a passo manual

```bash
# Criar o ambiente virtual
python3 -m venv venv

# Ativar o ambiente virtual
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Inicializar o corpus (copia os textos embutidos para corpus/textos.txt)
python main.py --baixar
```

---

## Pegando trechos e trava-línguas — exemplos práticos

### O básico: um trava-língua e N trechos

```python
from fonolib import get_trava_linguas, get_trechos

# Um trava-língua aleatório
print(get_trava_linguas())
# → "Três pratos de trigo para três tigres tristes."

# Cinco trechos aleatórios (sem repetição)
for i, trecho in enumerate(get_trechos(5), 1):
    print(f"{i}. {trecho}")
# → 1. O rato roeu a roupa do rei de Roma.
# → 2. Minha terra tem palmeiras onde canta o sabiá.
# → 3. A chuva caía mansa sobre o telhado da casinha...
# → 4. De grão em grão a galinha enche o papo.
# → 5. A borboleta amarela voava de flor em flor...
```

### Juntar N trechos em uma única string

```python
from fonolib import get_trechos

trechos = get_trechos(5)

# Separados por quebra de linha simples
texto = "\n".join(trechos)

# Separados por linha em branco (mais legível para leitura oral)
texto = "\n\n".join(trechos)

print(texto)
```

### Trecho com controle de tamanho (número de palavras)

```python
from fonolib import get_trecho_por_tamanho

# Frases curtas — bom para iniciantes e crianças
curto = get_trecho_por_tamanho(min_palavras=4, max_palavras=8)
print(curto)
# → "Em casa de ferreiro, espeto de pau."

# Frases médias — uso geral em terapia
medio = get_trecho_por_tamanho(min_palavras=10, max_palavras=20)
print(medio)

# Frases longas — treino de respiração e prosódia
longo = get_trecho_por_tamanho(min_palavras=25, max_palavras=40)
print(longo)
```

### Bloco terapêutico completo para uma sessão

```python
from fonolib.selecionar import get_bloco_terapeutico

# Retorna 5 frases formatadas e numeradas, prontas para leitura oral
bloco = get_bloco_terapeutico(n_frases=5, min_palavras=6, max_palavras=20)
print(bloco)
```

Saída:
```
1. Lá vai lua, lá vai lua, lá vai a lua mais linda do mundo.

2. A flauta tocava fraca mas flutuava pelo salão.

3. A manhã serena traz o canto dos pássaros no campo.

4. Em casa de ferreiro, espeto de pau.

5. Numa toca vive a toupeira com toda a família de toupeirinhas.
```

### Textos de uma categoria específica

```python
from fonolib.selecionar import get_por_categoria

print(get_por_categoria("trava_lingua"))
# → "Dedo no dedal, dedal no dedo, dedo no dedal, no dedo o dedal."

print(get_por_categoria("poesia"))
# → "Minha terra tem palmeiras onde canta o sabiá..."

print(get_por_categoria("parlenda"))
# → "Atirei o pau no gato, mas o gato não morreu..."

print(get_por_categoria("proverbio"))
# → "Água mole em pedra dura tanto bate até que fura."

print(get_por_categoria("conto"))
# → "Era uma vez uma menina chamada Maria que morava..."
```

### Pegar todos os textos de uma vez

```python
from fonolib.selecionar import _carregar_corpus

todos = _carregar_corpus()              # lista com todas as frases
texto_completo = "\n".join(todos)       # string única

print(f"Total: {len(todos)} textos")
print(f"Tamanho: {len(texto_completo)} caracteres")
```

### Usar o corpus embutido diretamente (sem arquivo)

```python
from fonolib.generator import CORPUS_EMBUTIDO, TRAVA_LINGUAS, PARLENDAS

# Lista completa de todos os textos
print(len(CORPUS_EMBUTIDO))   # → 245

# Só os trava-línguas
for t in TRAVA_LINGUAS:
    print(t)

# Só as parlendas
for p in PARLENDAS:
    print(p)
```

---

## Todas as funções disponíveis

```python
from fonolib import (
    get_trecho,            # Um trecho aleatório qualquer
    get_trechos,           # N trechos aleatórios (lista)
    get_trecho_por_tamanho,# Trecho com min/max de palavras
    get_trava_linguas,     # Trava-língua aleatório
    get_parlenda,          # Parlenda/cantiga aleatória
)

from fonolib.selecionar import (
    get_bloco_terapeutico, # N frases formatadas para sessão
    get_por_categoria,     # Texto de categoria específica
    estatisticas_corpus,   # Dicionário com stats do corpus
)

from fonolib.generator import (
    CORPUS_EMBUTIDO,       # Lista com todos os 245 textos
    TRAVA_LINGUAS,         # Lista só com trava-línguas
    PARLENDAS,             # Lista só com parlendas
    POESIA_DOMINIO_PUBLICO,# Lista só com poesia
    FRASES_ARTICULATORIAS, # Lista só com exercícios articulatórios
    CONTOS_CURTOS,         # Lista só com trechos narrativos
    PROVERBIOS,            # Lista só com provérbios
    FONETICAMENTE_RICOS,   # Lista só com frases foneticamente ricas
    TEXTOS_PROSODIA,       # Lista só com textos para prosódia
    CATEGORIAS,            # Dicionário nome → lista
    exportar_corpus,       # Grava corpus embutido em corpus/textos.txt
)
```

### Referência rápida

| Função | O que faz | Retorno |
|---|---|---|
| `get_trecho()` | Um texto aleatório do corpus | `str` |
| `get_trechos(n)` | N textos aleatórios sem repetição | `list[str]` |
| `get_trecho_por_tamanho(min, max)` | Texto dentro do intervalo de palavras | `str` |
| `get_trava_linguas()` | Trava-língua aleatório | `str` |
| `get_parlenda()` | Parlenda/cantiga aleatória | `str` |
| `get_bloco_terapeutico(n)` | N frases numeradas para sessão | `str` |
| `get_por_categoria("nome")` | Texto da categoria informada | `str` |
| `estatisticas_corpus()` | Total, média, min, max de palavras | `dict` |

---

## Interface de linha de comando

```bash
source venv/bin/activate

python main.py --baixar            # inicializa corpus/textos.txt (offline)
python main.py --baixar --online   # + baixa do Gutenberg e Wikisource
python main.py --limpar            # limpa e deduplica o corpus
python main.py --trecho            # imprime um trecho aleatório
python main.py --bloco 5           # bloco terapêutico com 5 frases
python main.py --categoria trava_lingua
python main.py --categoria poesia
python main.py --categoria proverbio
python main.py --categoria articulatorio
python main.py --categoria conto
python main.py --stats             # estatísticas do corpus
```

---

## Menu interativo

```bash
python main.py
```

```
╔══════════════════════════════════════════════════════════════╗
║          F O N O C O R P U S  — v1.0                        ║
║   Textos para treino fonoaudiológico em Português Brasileiro ║
╚══════════════════════════════════════════════════════════════╝

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
```

---

## Categorias do corpus

Todas as categorias estão definidas em `fonolib/generator.py` como listas Python.
Para ver ou editar os textos, abra esse arquivo diretamente.

| Categoria | Nome para código | Qtd. textos | Uso terapêutico |
|---|---|---|---|
| Trava-línguas | `trava_lingua` | ~40 | Articulação, agilidade oral |
| Parlendas | `parlenda` | ~25 | Ritmo, prosódia, memória |
| Foneticamente ricos | `fonetico` | ~35 | Treino de fonemas isolados (/r/, /l/, /s/...) |
| Poesia domínio público | `poesia` | ~25 | Leitura expressiva, dicção |
| Exercícios articulatórios | `articulatorio` | ~35 | Pontos articulatórios específicos |
| Contos curtos | `conto` | ~24 | Leitura oral fluente, narrativa |
| Provérbios | `proverbio` | ~40 | Prosódia, entonação |
| Textos de prosódia | `prosodia` | ~15 | Controle respiratório, pausa, ritmo |

---

## Limpeza automática dos textos

`python main.py --limpar` ou `from fonolib import limpar_corpus` descarta
automaticamente qualquer linha que:

- Contenha qualquer dígito (números)
- Contenha URL ou e-mail
- Tenha menos de 4 palavras
- Tenha mais de 80 palavras
- Seja metadado técnico (cabeçalhos do Gutenberg, HTML, etc.)
- Seja duplicata exata de outra linha
- Tenha menos de 50% do conteúdo formado por letras

---

## Coleta online opcional

Ao usar `--online`, o scraper coleta textos adicionais de:

| Fonte | Endereço | Conteúdo |
|---|---|---|
| Project Gutenberg | gutenberg.org | Machado de Assis, Gonçalves Dias, Eça de Queirós... |
| Wikisource PT | pt.wikisource.org | Olavo Bilac, Casimiro de Abreu, Alphonsus de Guimaraens... |

O scraper sempre verifica `robots.txt`, usa retry automático e salva
incrementalmente — nunca perde o que já foi coletado.

---

## Dependências

```
requests>=2.28.0       # requisições HTTP
beautifulsoup4>=4.11.0 # parser HTML
lxml>=4.9.0            # backend rápido para BeautifulSoup
urllib3>=1.26.0        # pool de conexões HTTP
```

Nenhuma API paga, chave privada ou cadastro é necessário.

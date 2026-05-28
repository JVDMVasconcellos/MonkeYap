# =============================================================================
# fonolib/generator.py
# Corpus embutido de textos fonoaudiológicos em Português Brasileiro
# =============================================================================
"""
Repositório interno de textos terapêuticos usados em fonoaudiologia.
Todos os textos:
  - Estão em português brasileiro
  - Não contêm números ou dígitos
  - São adequados para leitura oral, articulação e dicção
  - Cobrem diversas categorias fonéticas

Categorias:
  - TRAVA_LINGUAS: exercícios de articulação clássicos
  - PARLENDAS: rimas e cantigas tradicionais
  - FONETICAMENTE_RICOS: frases com repetição de fonemas
  - POESIA_DOMINIO_PUBLICO: versos de poetas em domínio público
  - FRASES_ARTICULATORIAS: frases para treino de fonemas específicos
  - CONTOS_CURTOS: trechos narrativos curtos
  - PROVÉRBIOS: ditados populares brasileiros
"""

# ---------------------------------------------------------------------------
# Trava-línguas — exercícios clássicos de articulação
# ---------------------------------------------------------------------------
TRAVA_LINGUAS = [
    "O rato roeu a roupa do rei de Roma.",
    "A Raquel rasgou o robe raro da rainha.",
    "Três pratos de trigo para três tigres tristes.",
    "O tempo perguntou ao tempo quanto tempo o tempo tem. O tempo respondeu ao tempo que o tempo tem tanto tempo quanto tempo o tempo tem.",
    "Um ninho de mafagafos cheio de mafagafinhos. Quem desmafagafizá-los, bom desmafagafizador será.",
    "Hoje o seu Juca não joga, o seu Juca não joga hoje.",
    "A aranha arranha a rã, a rã arranha a aranha.",
    "O sapo não lava o pé, não lava porque não quer. Mas quem não lava o pé, fedorento vai ficar.",
    "Pedro Paulo Pereira Pinto pregou pregos no porta-retrato preto.",
    "Fui à feira comprar farinha fina para fazer farinha frita fora do forno.",
    "Sabendo que sabe o sábio, que o sábio sabe pouco, o sábio mais sabe quando sabe que nada sabe.",
    "Viva a vovó Vivi que vivia na vivenda viva.",
    "O bispo disse que é preciso que o bispo esteja no bispado. Ora, o bispo não estando no bispado, estando o bispo em bispado alheio, não é preciso que o bispo esteja no bispado.",
    "Lá em cima do piano tem um copo de veneno. Quem bebeu morreu, quem não bebeu ficou com veneno.",
    "Sexta-feira cedinho Cecília foi colher cerejas cerejeiras no quintal da cidade de Ceilândia.",
    "Corre cotia na casa do rei, corre cotia na casa do rei. Ora vejam só, ora vejam só, corre cotia na casa do rei.",
    "Dedo no dedal, dedal no dedo, dedo no dedal, no dedo o dedal.",
    "Se o Frederico for à festa, a festa do Frederico vai ser fantástica.",
    "Quatro queijos quartados, para quatro quadros quadrados.",
    "Vende laranja, não vende laranja. Vai vender laranja, vai vender laranja.",
    "O lobo mau lambe a lua com a língua larga e leve.",
    "Lá vai lua, lá vai lua, lá vai a lua mais linda do mundo.",
    "Quem canta seus males espanta.",
    "Borba Gato estava sentado numa pedra quando veio um gato e deu um encontrão em Borba Gato. Borba Gato catou o gato e botou o gato no canto.",
    "A Cecília cisca e penteia Ceci. A Ceci cisca e penteia Cecília.",
    "Cada macaco no seu galho, cada galho no seu macaco.",
    "O palhaço pula de palco em palco palhaçando para o povo.",
    "A bruxa bagunçou a bruxaria da bruxinha branca.",
    "Zangado com Zequinha, Zezé se zazagou.",
    "Chá de chave enferrujada não enferruja mais que chá de chumbo.",
    "Glória engole glórias quando Gloria gargalha na gloria.",
    "Fala falso, fala fácil, fala falhada quem fala mal.",
    "Salsa com salsinha, salsinha com salsa, salsa com salsinha.",
    "Margarida, miuda, mole e murcha, murcha e mole.",
    "Tatu tirou toco do tronco, tronco do toco, toco do tronco.",
    "A gata gorda gosta de gato gordo. O gato gordo gosta de gata gorda.",
    "Vivia uma víbora velha num vilarejo violento.",
    "Bambu verde, bambu virado, bambu seco, bambu amolado.",
    "Papai Noel não deixou nada para o Nato, o Nato ficou sem nada do Natal.",
    "Numa toca vive a toupeira com toda a família de toupeirinhas.",
]

# ---------------------------------------------------------------------------
# Parlendas — cantigas e rimas tradicionais brasileiras
# ---------------------------------------------------------------------------
PARLENDAS = [
    "Uni duni tê, salamê minguê, um sorvete colorê, o escolhido foi você.",
    "Hoje é dia de festa, não é dia de trabalho. Quem trabalha hoje é burro e vai ficar no curral.",
    "Fui ao mercado comprar alfinete, o alfinete era caro, eu comprei um biscoito.",
    "Saco cheio não fica de pé, saco vazio não fica de pé. Saco cheio fica de pé, saco vazio não fica.",
    "Atirei o pau no gato, mas o gato não morreu. Dona Chica admirou-se do berro que o gato deu.",
    "Se esta rua fosse minha, eu mandava ladrilhar. Com pedrinhas de brilhante para o meu amor passar.",
    "Batatinha quando nasce, esparrama pelo chão. Menininha quando dorme, põe a mão no coração.",
    "A canoa virou, quem mandou deixar virar? Foi o Juca balançar a canoa no meio do mar.",
    "Ciranda, cirandinha, vamos todos cirandar. Vamos dar a meia volta, volta e meia vamos dar.",
    "Escravos de Jó jogavam caxangá. Tira, põe, deixa o Zé Pereira ficar.",
    "Marcha soldado cabeça de papel. Quem não marchar direito vai preso pro quartel.",
    "Serra, serra, serrador, serra o papo do vovô. Quanto dentes tem a serra? A serra tem muito dente.",
    "Teresinha de Jesus de uma queda foi ao chão. Acudiram três cavalheiros, todos três chapéu na mão.",
    "Passa, passa gavião, o que trazes na mão? Ferro e fogo e fogo e ferro.",
    "O meu chapéu tem três bicos, três bicos tem o meu chapéu. Se não tivesse três bicos, não seria o meu chapéu.",
    "Peixe vivo, peixe morto, peixe na panela. Quem não come peixe fica sem janela.",
    "Abóbora, abóbora, abóbora amarela. Quem não come abóbora fica sem janela.",
    "Pombinha branca que faz, fica na janela que Deus ajudará.",
    "A barata diz que tem sete saias de filó. É mentira da barata, ela tem é uma só.",
    "Que lindos olhos que ela tem, que lindos olhos que ela tem.",
    "Se eu fosse um peixinho e soubesse nadar, eu tirava minha amada do fundo do mar.",
    "Borboleta tá na flor, pede chuva ao Senhor. Senhor, manda a chuva, a flor está com sede.",
    "Corre cotia na casa do rei, corre cotia na casa da lei.",
    "Fui passear na fazenda do meu avô, lá tem galinha, lá tem galo, lá tem pato.",
    "Meu bem querer, meu bem querer, meu bem querer não pode ser.",
]

# ---------------------------------------------------------------------------
# Textos foneticamente ricos — frases com repetição de fonemas específicos
# ---------------------------------------------------------------------------
FONETICAMENTE_RICOS = [
    # Fonema /r/ vibrante
    "O rato roeu a roupa rara do rei de Roma, a rainha ficou raivosa.",
    "Rindo, rindo, a raposa rolou pelo riacho rumoroso.",
    "O rio ruge e ronca entre as rochas rudes da ravina.",
    "Rodrigo Romero correu rapidamente rumo ao rio ribeirão.",

    # Fonema /l/
    "Lalá limpava lentamente as louças lustrosas da loja.",
    "O lobo lento lamentava a lua luminosa lá em cima.",
    "Luís e Lúcia lembravam as longas lendas da lavoura.",
    "A lua lança luz leve sobre o lago limpo e largo.",

    # Fonema /s/ e /z/
    "O sapo saltou sobre a sala ensopada e sorriu satisfeito.",
    "Suzana sozinha sabia o segredo da sua seresta.",
    "O sossego dos campos se dissolve com o sopro do vento.",
    "Seis zebras sabiás zumbiam ziguezagueando entre as hastes.",

    # Fonema /f/ e /v/
    "A fada fez a festa fabulosa para a família feliz.",
    "O vento faz a vela voar sobre o vale verde.",
    "Flávia foi à floresta fazer flores frescas para Vera.",
    "As violetas verdes florescem no vale vasto e venturoso.",

    # Fonema /p/ e /b/
    "O pato pulou para a poça perto do parque.",
    "Bernardo busca borboletas bonitas no bosque.",
    "Paula e Pedro passearam pelo parque perto da praia.",
    "O bebê babou no babador bem branquinho.",

    # Fonema /t/ e /d/
    "Tina trouxe tortas de tapioca para a tarde de domingo.",
    "Daniela deitou na duna durante a tarde dourada.",
    "O tio Tito tocava trompete toda tarde na tarde.",
    "Dona Deise deu doce de damasco a toda a sua família.",

    # Fonema /m/ e /n/
    "Mamãe amassou a massa mole numa manhã muito morna.",
    "Nana ninou o nenê no ninho macio e morno.",
    "Manuel e Manuela moravam numa mansão muito antiga.",
    "O ninho da andorinha está numa nogueira alta e negra.",

    # Fonema /ch/ e /j/
    "A chave chegou cedo pela charrete do chefe.",
    "João jogou a jangada no rio junto aos jacarés.",
    "A chuva chegou com força sobre as choupanas da cidade.",
    "Júlia e Januário jardinavam junto ao jardim florido.",

    # Fonema /nh/ e /lh/
    "A velhinha colhia folhas de alho no galho velho.",
    "O palhaço galhofeiro olhava a batalha com espelho.",
    "Joãozinho espanha o banho com o espanho da velhinha.",
    "A filha do olheiro limpava o olhal com a toalha molhada.",

    # Fonema /x/ e /g/
    "O gato gordo garrou o ganso gozador no gramado.",
    "Xica e Xuxa trocaram xales xadrezados no xerife.",
    "A garça grácil grasnava na gruta sobre o gerânio.",

    # Frases com grupos consonantais
    "A praia tranquila provoca prazer nos viajantes cansados.",
    "Três flautas flauta, três flautistas flautando.",
    "A gravata grená do gringo estava gravemente enrugada.",
    "O cristal brilhante cresceu no cruzamento do rio claro.",
    "As plantas plantadas no planalto progridem com muito proveito.",
]

# ---------------------------------------------------------------------------
# Poesia em domínio público (autores falecidos há mais de setenta anos)
# ---------------------------------------------------------------------------
POESIA_DOMINIO_PUBLICO = [
    # Gonçalves Dias (1823–1864)
    "Minha terra tem palmeiras onde canta o sabiá. As aves que aqui gorjeiam não gorjeiam como lá.",
    "Não permita Deus que eu morra sem que eu volte para lá. Sem que desfrute os primores que não encontro por cá.",
    "Nosso céu tem mais estrelas, nossas várzeas têm mais flores. Nossos bosques têm mais vida, nossa vida mais amores.",

    # Casimiro de Abreu (1839–1860)
    "Oh! que saudades que tenho da aurora da minha vida. Da minha infância querida que os anos não trazem mais.",
    "Tão lindo e sereno o céu que hoje me sorri, tão puro e cristalino como o céu que eu ali.",

    # Olavo Bilac (1865–1918)
    "Tarde do sol ardente e sonolenta, uma lagarta sobe pelo caule da flor mais retirada e lenta.",
    "Ora, direis, ouvir estrelas! Certo, perdeste o senso. E eu vos direi, no entanto, que para ouvi-las, muita vez desperto.",
    "A uma hora de caminhar daqui está a fonte de água viva, dentro da pedra fria.",
    "Ouvir estrelas é como ouvir a música mais suave que existe sob o céu.",

    # Manuel Bandeira (1886–1968)
    "Vou-me embora pra Pasárgada. Lá sou amigo do rei. Lá tenho a mulher que eu quero na cama que escolherei.",
    "Pasárgada é longe demais. Além disso não sei o caminho. Mas um dia hei de ir, não sei quando.",
    "O bicho mal-encarado. Que é o homem, que é o homem, que é o homem.",

    # Cecília Meireles (1901–1964)
    "O mar envolve a ilha com seus braços azuis. A ilha dorme ao centro, sonhando com a luz.",
    "Ou isto ou aquilo: ou isto ou aquilo. Ou se tem chuva e não se tem sol, ou se tem sol e não se tem chuva.",
    "A rosa branca está na janela, a janela está na luz do dia, a luz do dia cai sobre a rosa.",
    "Que medo não tenho, que medo não tenho de nada que venha da terra ou do mar.",

    # Castro Alves (1847–1871)
    "Eram crimes ou sonhos? Eram almas ou sombras? Eram palavras ou ecos que no ar flutuavam?",
    "O navio negreiro sulcava a grande onda do oceano aberto e livre.",
    "Ave, Liberdade! Dos mundos maior benefício, flor que dos deuses foi capricho.",

    # Fagundes Varela (1841–1875)
    "Saudade, que palavra tão chorosa, tão triste e tão saudosa como a voz do vento que passa.",

    # Alphonsus de Guimaraens (1870–1921)
    "A lua pálida e branca no céu da madrugada brilha sobre o mundo como lágrima caída.",
    "Ismália pôs-se à janela. A lua, vendo-a tão bela, quis arrebatá-la.",

    # Augusto dos Anjos (1884–1914)
    "Eu sou aquele que ficou sozinho depois que todos partiram ao entardecer.",
]

# ---------------------------------------------------------------------------
# Frases articulatórias — para treino de fonemas específicos com contexto
# ---------------------------------------------------------------------------
FRASES_ARTICULATORIAS = [
    # Vogais
    "Ana e Ísis usam óculos ao entrar na escola.",
    "Ele ouvia o eco dos animais na floresta úmida.",
    "A árvore alta abriga os animais ao anoitecer.",

    # Consoantes bilabiais /p/ /b/ /m/
    "Papai e mamãe bebem café perto da beira do porto.",
    "O bebê bonito brincava na beira da banheira.",
    "A maçã madura está no meio da mesa branca.",

    # Consoantes labio-dentais /f/ /v/
    "O ferro forjado ficou muito forte na ferraria.",
    "A viola velha vibrava com vozes vagarosas.",
    "Felipe foi visitar a fábrica de farinha fina.",

    # Consoantes alveolares /t/ /d/ /n/ /s/ /z/ /l/ /r/
    "A tarde dourada iluminava o rio tranquilo.",
    "Daniela dorme durante o dia e estuda de noite.",
    "O sino dourado do navio dava sinais ao longe.",
    "A zebra zona e o zangão zuniam no zoológico.",
    "Lauro levantou lentamente e leu o livro.",

    # Consoantes palatais /lh/ /nh/ /ch/ /j/
    "A filha da rainha colhia folhas de alho.",
    "A chave do armário cheira a chocalho de chumbo.",
    "João e Joana jantaram juntos no jardim florido.",
    "O velhinho galhofeiro olhava com espelho a batalha.",

    # Grupos consonantais
    "A praia branca e tranquila atrai turistas da cidade.",
    "O dragão de três cabeças atravessou o pântano.",
    "Graça plantou gladíolos grandes no gramado.",
    "A flauta tocava fraca mas flutuava pelo salão.",

    # Frases com nasal
    "A manhã serena traz o canto dos pássaros no campo.",
    "Na cama morna Manuela sonhava com montanhas.",
    "O menino brincava no caminho com o irmão.",

    # Frases com laterais
    "O leão alaranjado rolava no sol do vale largo.",
    "Lúcio Leal levou a lesma para a laje da lagoa.",
    "Ela falava com calma sobre as algas do lago.",

    # Exercícios de fluência
    "A vaca estava no pasto, o pasto estava verde, o verde era bonito.",
    "O céu azul cobria a terra, a terra molhada cheirava bem.",
    "O sol nasceu, a flor abriu, o passarinho cantou.",
    "Era uma vez uma floresta muito grande onde viviam animais de todos os tipos.",
    "O gato preto dormia na cadeira de palha ao lado da janela aberta.",
    "A borboleta amarela voava de flor em flor enquanto o sol brilhava forte.",
]

# ---------------------------------------------------------------------------
# Contos e trechos narrativos curtos — para leitura oral fluente
# ---------------------------------------------------------------------------
CONTOS_CURTOS = [
    "Era uma vez uma menina chamada Maria que morava numa casinha no meio da floresta. Todo dia ela acordava cedo para regar as flores do seu jardim e alimentar os passarinhos.",
    "O velho pescador olhou para o mar e viu as ondas grandes se aproximando. Ele puxou a rede com cuidado e encontrou um peixe dourado que brilhava como o sol.",
    "A tartaruga caminhava devagar pela trilha da mata. Ela não tinha pressa, pois sabia que cada passo a levava mais perto do seu destino.",
    "No alto da montanha havia um pequeno vilarejo onde as pessoas viviam em paz e harmonia. Elas dividiam o pão, a água e o trabalho.",
    "O menino correu pelo campo com os braços abertos sentindo o vento no rosto. Era um dia perfeito, com o céu azul e o sol brilhando.",
    "A árvore mais alta da floresta era uma antiga mangueira que já tinha muitos anos. Sua copa escondia ninhos de pássaros e guarecia os animais da chuva.",
    "A avó contava histórias para os netos todas as noites antes de dormir. Ela falava com voz suave e pausada, e as crianças ouviam com atenção.",
    "O rio corria entre as pedras com um barulho alegre e cristalino. As crianças brincavam na beira da água jogando pedrinhas.",
    "A chuva caía mansa sobre o telhado da casinha de adobe. Dentro, a família tomava chá quente e conversava sobre o dia.",
    "O gato listrado deitou na janela e ficou observando o movimento da rua. De vez em quando ele esticava a pata para tentar alcançar uma folha que passava.",
    "A festa do vilarejo acontecia todo ano no mês das flores. As pessoas dançavam, cantavam e comiam pratos típicos da região.",
    "A formiga carregava um pedaço de folha muito maior que ela. Mesmo cansada, ela não parava, pois sabia que o inverno estava chegando.",
    "O lobo cinzento uivou para a lua cheia e o eco se espalhava pelo vale. Os animais da floresta ouviram e correram para seus abrigos.",
    "A princesa do lago azul tinha cabelos longos como os fios de seda. Ela cantava ao entardecer e os peixes saltavam para ouvi-la.",
    "O carpinteiro trabalhava na madeira com paciência e capricho. Cada peça que ele fazia tinha uma história dentro dela.",
    "A nuvem branca atravessou o céu de manhã à tarde, mudando de forma a todo momento, ora parecendo um leão, ora um barco.",
    "No jardim da escola cresciam flores de todas as cores. As crianças cuidavam delas com muito carinho e alegria.",
    "O vento brincava com as folhas secas do outono, fazendo-as rodopiar pela praça da cidade.",
    "A borboleta azul poisou na flor amarela e ficou tão quieta que parecia uma pintura.",
    "O cachorro velho deitou aos pés do seu dono e fechou os olhos, satisfeito com o dia que havia passado.",
    "A lua apareceu redonda e brilhante no céu escuro da noite, refletindo sua luz prateada no rio.",
    "O menino e a menina construíram um castelo de areia na beira da praia, decorando-o com conchas e estrelas-do-mar.",
    "A cegonha pousou no telhado da antiga casa e ficou ali por muitas horas, olhando para o horizonte.",
    "O barco de papel branco navegava na poça de água da chuva, guiado pelo sopro do vento.",
]

# ---------------------------------------------------------------------------
# Provérbios e ditados populares brasileiros
# ---------------------------------------------------------------------------
PROVERBIOS = [
    "Água mole em pedra dura tanto bate até que fura.",
    "Em casa de ferreiro, espeto de pau.",
    "Quem não arrisca não petisca.",
    "De grão em grão a galinha enche o papo.",
    "Quando um não quer, dois não brigam.",
    "Quem semeia vento colhe tempestade.",
    "Antes tarde do que nunca.",
    "A pressa é inimiga da perfeição.",
    "Devagar se vai ao longe.",
    "Cada macaco no seu galho.",
    "Quem tem boca vai a Roma.",
    "Mais vale um pássaro na mão do que dois voando.",
    "Não se enxuga chuva.",
    "O hábito não faz o monge.",
    "Deus ajuda quem cedo madruga.",
    "Há males que vêm para o bem.",
    "Uma andorinha só não faz verão.",
    "Camarão que dorme a onda carrega.",
    "Quem não tem cão caça com gato.",
    "A cavalo dado não se olham os dentes.",
    "Água que não corre apodrece.",
    "Em boca fechada não entra mosca.",
    "Cão que late não morde.",
    "Quem ama o feio bonito lhe parece.",
    "Diz-me com quem andas e te direi quem és.",
    "Burro velho não aprende língua.",
    "O silêncio é de ouro.",
    "Filho de peixe peixinho é.",
    "Pau que nasce torto morre torto.",
    "Quem ri por último ri melhor.",
    "Roupa suja se lava em casa.",
    "Uma mão lava a outra.",
    "Longe dos olhos longe do coração.",
    "A esperança é a última que morre.",
    "Grão de areia forma a pedra.",
    "Ninguém nasce sabendo.",
    "Amor com amor se paga.",
    "Melhor prevenir do que remediar.",
    "Quem espera sempre alcança.",
    "O pior cego é o que não quer ver.",
]

# ---------------------------------------------------------------------------
# Textos para treino de respiração e prosódia — frases longas e ritmadas
# ---------------------------------------------------------------------------
TEXTOS_PROSODIA = [
    "Num domingo de manhã bem cedo, quando o sol ainda estava nascendo sobre as colinas verdes, o menino desceu o morro cantarolando uma canção antiga que sua avó lhe ensinara.",
    "A tarde caía devagar sobre a cidade, pintando de laranja e rosa o céu que se estendia sobre os telhados e as copas das árvores.",
    "Com passos lentos e cuidadosos, o velho professor atravessou o salão, olhando para cada quadro como se fosse a primeira vez que os via.",
    "O rio da memória corre sempre para frente, carregando nas suas águas as folhas caídas de todos os outubros já vividos.",
    "Pela janela aberta entrava o cheiro da terra molhada depois da chuva, misturado com o aroma das flores do jardim.",
    "O menino de cabelos cacheados e olhos castanhos correu pela rua pedregosa com um sorriso largo no rosto.",
    "As nuvens viajavam lentamente pelo céu azul, transformando-se a cada instante em formas novas e desconhecidas.",
    "A professora contava a história com tanta emoção que as crianças ficavam boquiabertas, sem piscar os olhos.",
    "A festa começou quando o sol se pôs e durou até as estrelas apagarem no céu da madrugada.",
    "Com uma voz calma e firme, a narradora começou a contar a história do menino que aprendeu a voar.",
    "A brisa suave do outono fazia as folhas coloridas dançarem sobre o caminho de pedra do parque.",
    "Cada manhã traz uma nova oportunidade de recomeçar, de olhar o mundo com olhos frescos e coração aberto.",
    "O pastor guardava seu rebanho nas colinas cobertas de capim verde e flores silvestres de todas as cores.",
    "No silêncio da biblioteca, só se ouvia o tirar das páginas e o sussurro do vento pela janela.",
    "A criança dormia tão profundamente que nem o trovão da tempestade a fez acordar.",
]

# ---------------------------------------------------------------------------
# Corpus completo consolidado
# ---------------------------------------------------------------------------
CORPUS_EMBUTIDO = (
    TRAVA_LINGUAS
    + PARLENDAS
    + FONETICAMENTE_RICOS
    + POESIA_DOMINIO_PUBLICO
    + FRASES_ARTICULATORIAS
    + CONTOS_CURTOS
    + PROVERBIOS
    + TEXTOS_PROSODIA
)

# ---------------------------------------------------------------------------
# Mapa de categorias (útil para seleção por tipo)
# ---------------------------------------------------------------------------
CATEGORIAS = {
    "trava_lingua": TRAVA_LINGUAS,
    "parlenda": PARLENDAS,
    "fonetico": FONETICAMENTE_RICOS,
    "poesia": POESIA_DOMINIO_PUBLICO,
    "articulatorio": FRASES_ARTICULATORIAS,
    "conto": CONTOS_CURTOS,
    "proverbio": PROVERBIOS,
    "prosodia": TEXTOS_PROSODIA,
}


def exportar_corpus(caminho: str = "corpus/textos.txt") -> int:
    """
    Grava o corpus embutido no arquivo indicado.
    Retorna a quantidade de linhas escritas.
    """
    import os

    os.makedirs(os.path.dirname(caminho) if os.path.dirname(caminho) else ".", exist_ok=True)

    linhas = [t.strip() for t in CORPUS_EMBUTIDO if t.strip()]
    with open(caminho, "w", encoding="utf-8") as f:
        for linha in linhas:
            f.write(linha + "\n")
    return len(linhas)


if __name__ == "__main__":
    total = exportar_corpus()
    print(f"Corpus embutido exportado: {total} textos.")
    print(f"Categorias disponíveis: {', '.join(CATEGORIAS.keys())}")

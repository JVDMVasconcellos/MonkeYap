from fonolib import get_trava_linguas, get_trechos

# Trava-língua aleatório
print(get_trava_linguas())

# 5 trechos aleatórios
trechos = get_trechos(50)

# Juntar com quebra de linha
texto = "".join(trechos)
print(texto)


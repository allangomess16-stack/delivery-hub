# Guia de ajustes manuais

## Trocar cores

Abra:

```text
src/interface/estilos/tema.css
```

As principais variaveis sao:

```css
--fundo
--painel
--texto
--primaria
--sucesso
--atencao
--perigo
--borda
```

Nao e necessario procurar cores nas telas.

## Alterar tamanhos e espacamentos

Abra:

```text
src/interface/estilos/app.css
```

## Alterar regras de identificacao das transportadoras

Abra:

```text
src/configuracao/transportadoras.ts
```

Todas as regex ficam centralizadas nesse arquivo.

## Alterar textos das telas

```text
src/interface/telas/
```

## Regra importante

Nao coloque regras de negocio dentro dos arquivos CSS ou das telas.
Quando surgir nova regra operacional, crie/ajuste em `src/aplicacao/` ou `src/configuracao/`.

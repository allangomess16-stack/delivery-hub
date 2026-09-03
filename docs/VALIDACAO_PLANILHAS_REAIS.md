# Validação com as 4 planilhas reais

A lógica inicial foi conferida contra os quatro arquivos operacionais fornecidos para o desenvolvimento.

## Resultado

| Arquivo | Pacotes | Entregadores | J&T | Anjun | iMile | Outros | Revisar | Grupos duplicados no arquivo |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 20-08-26 | 1.057 | 8 | 479 | 186 | 146 | 246 | 9 | 16 |
| 21-08-26 | 984 | 9 | 447 | 255 | 137 | 145 | 9 | 4 |
| 22-08-26 | 951 | 6 | 442 | 168 | 148 | 193 | 6 | 5 |
| 24-08-26 | 1.574 | 7 | 456 | 528 | 313 | 277 | 7 | 66 |
| **Total** | **4.566** | — | **1.824** | **1.137** | **744** | **861** | — | — |

## Cobertura atual

As regras iniciais identificam 3.705 de 4.566 registros, aproximadamente 81% da amostra.

Os 861 restantes continuam corretamente como `OUTRA`, sem tentativa de adivinhar a empresa. Entre eles existem famílias como `CNBR`, `KW`, `NR` e códigos numéricos curtos que ainda precisam ser associados a uma transportadora com evidência de campo.

## Normalizações comprovadas

Além de códigos limpos, o normalizador já trata textos de leitor com `TN`, por exemplo:

```text
^ID^...^TN^888002431695151...
```

virando:

```text
888002431695151
```

Também recupera códigos Anjun quando há caracteres extras antes do `AJ`, desde que o código completo esteja preservado.

## Duplicidade

Considerando os quatro arquivos em conjunto, existem códigos repetidos em mais de uma ocorrência. O sistema não sobrescreve automaticamente; a regra de resolução/transferência entre entregadores será implementada na etapa de conferência da carga.

## Observação sobre Excel

Tracking é tratado como `string` dentro do domínio. Valores numéricos inseguros ou com possível perda de precisão são marcados para revisão em vez de terem dígitos inventados.

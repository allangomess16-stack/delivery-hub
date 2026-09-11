# Fechamento iMile — Nivel 1

## Contrato congelado

| Campo | Valor aprovado |
|---|---|
| Aplicativo | iMile ReDelivery |
| Package | `com.imile.redelivery` |
| Versao | `2.3.18` |
| Version code | `458` |
| URI | `crredelivery:?requestCode=${tracking}` |
| Rota de destino | `/delivery/deliveryCommonSearchPage` |
| Evidencia | `DEVICE_VALIDATED` |
| Escopo | Pesquisa contextual |

O scanner do Delivery Hub, a Intent restrita por package, a abertura da iMile,
o preenchimento do requestCode, o retorno ao Hub e a Outbox offline foram
aprovados no aparelho.

## Limite do fechamento

Este fechamento nao declara baixa automatica. Nome, documento, foto, assinatura,
GPS, confirmacao do POD e retorno de sucesso pela iMile continuam fora do
contrato comprovado. O entregador conclui essa parte dentro da iMile.

## Isolamento por transportadora

- cada empresa implementa `IntegracaoTransportadora` em adaptador proprio;
- cada adaptador possui package, versao, gramática e validacoes proprias;
- `PonteNativa` e generica e nao conhece regras da iMile;
- evidencias sao registradas por transportadora e capacidade;
- uma aprovacao iMile nunca promove Anjun ou J&T;
- versao externa desconhecida entra em fallback assistido.

## Proxima fase

A V0.4.7 deve validar o caminho Admin, backend de homologacao e APK do
entregador. Isso fecha a sincronizacao do Delivery Hub antes de iniciar a
engenharia do adaptador Anjun.

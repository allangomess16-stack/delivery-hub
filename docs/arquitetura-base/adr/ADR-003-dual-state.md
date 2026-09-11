# ADR-003 — Estado físico separado do estado sistêmico

**Status:** ACEITO

## Contexto

A encomenda pode estar fisicamente entregue enquanto o aplicativo externo está offline ou falhando.

## Decisão

Manter `physicalStatus` e `externalStatus` independentes.

## Consequências

Falha de integração não bloqueia a rota.

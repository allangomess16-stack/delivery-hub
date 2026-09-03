# ADR-002 — Prova universal de entrega

**Status:** ACEITO

## Contexto

Cada transportadora possui campos e protocolos próprios.

## Decisão

Capturar uma única `DeliveryProof` interna e transformar a saída por adapters.

## Consequências

UI e domínio não precisam ser reescritos para cada empresa.

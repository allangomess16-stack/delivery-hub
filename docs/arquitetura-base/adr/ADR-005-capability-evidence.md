# ADR-005 — CapabilityEvidence obrigatório

**Status:** ACEITO

## Contexto

Manifest e análise estática podem gerar falsos positivos.

## Decisão

Usar `UNKNOWN`, `MANIFEST_DISCOVERED`, `CODE_DISCOVERED`, `ADB_VALIDATED`, `DEVICE_VALIDATED` e `PRODUCTION_VALIDATED`.

## Consequências

O sistema diferencia hipótese de integração comprovada.

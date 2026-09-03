# ADR-004 — Integrações versionadas por app

**Status:** ACEITO

## Contexto

Atualizações externas podem mudar Activities, Intents e fluxos.

## Decisão

Chavear capabilities por `companyId + packageName + versionCode`.

## Consequências

Versão desconhecida não herda confiança da anterior.

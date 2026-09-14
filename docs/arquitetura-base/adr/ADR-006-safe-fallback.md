# ADR-006 — Fallback seguro e degradação graciosa

**Status:** ACEITO

## Contexto

Integrações externas podem quebrar a qualquer momento.

## Decisão

Usar hierarquia: API → Deep Link → Share → Clipboard/App Launch → Assistente manual → Accessibility.

## Consequências

Falha reduz conveniência, não interrompe a entrega.

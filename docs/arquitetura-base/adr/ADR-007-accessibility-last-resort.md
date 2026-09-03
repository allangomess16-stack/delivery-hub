# ADR-007 — AccessibilityService somente como último recurso

**Status:** ACEITO

## Contexto

Automação de UI de terceiros via AccessibilityService é frágil e possui implicações de política, segurança e distribuição.

## Decisão

Não usar AccessibilityService como requisito da V1.

## Consequências

O projeto permanece mais sustentável e menos dependente da UI externa.

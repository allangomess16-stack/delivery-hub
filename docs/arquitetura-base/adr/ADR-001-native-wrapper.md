# ADR-001 — Wrapper nativo em vez de PWA puro

**Status:** ACEITO

## Contexto

O Hub precisa consultar apps instalados, versionCode, disparar Intents, compartilhar content URIs e interagir com recursos Android além do limite confortável de um PWA.

## Decisão

Usar aplicação com camada nativa Android. Opção inicial sugerida: TypeScript + Capacitor, sem acoplar o domínio ao framework.

## Consequências

Ganha-se interoperabilidade Android mantendo o Core portátil.

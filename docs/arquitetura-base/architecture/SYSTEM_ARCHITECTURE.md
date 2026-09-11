# Arquitetura do Sistema

## Visão geral

```text
                         DELIVERY HUB
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
     Delivery Core        Proof Core         Sync Core
                                                  │
                                                  ▼
                                        Integration Engine
                                                  │
                         ┌────────────────────────┼─────────────────────┐
                         │                        │                     │
                 IntegrationRegistry        NativeBridge          Adapters
                         │                        │                     │
                   versionCode             PackageManager             J&T
                   evidence                Intent                     Anjun
                   fallback                FileProvider               iMile
                                           Clipboard
```

## Domain

Não conhece Android, HTTP ou UI. Responsável por entrega, prova, estados, validação, idempotência e invariantes.

## Application

Casos de uso:
- registrar entrega;
- concluir entrega física;
- validar prova;
- preparar baixa;
- selecionar integração;
- registrar confirmação externa;
- enfileirar sincronização.

## Infrastructure

- banco local;
- filesystem;
- câmera;
- geolocalização;
- NativeBridge Android;
- rede;
- sincronização.

## Integrations

```text
integrations/
├── jnt/
├── anjun/
├── imile/
└── manual/
```

## Tecnologia sugerida para V1

- TypeScript;
- interface web;
- Capacitor como wrapper Android;
- SQLite ou armazenamento local equivalente;
- plugin nativo próprio para PackageManager/Intents/FileProvider;
- backend opcional para Registry remoto e telemetria.

## Estrutura sugerida

```text
src/
├── domain/
│   ├── delivery/
│   ├── proof/
│   ├── company/
│   └── integration/
├── application/
│   ├── deliveries/
│   ├── proofs/
│   └── integrations/
├── infrastructure/
│   ├── database/
│   ├── media/
│   ├── android/
│   └── network/
├── integrations/
│   ├── jnt/
│   ├── anjun/
│   ├── imile/
│   └── manual/
└── ui/
    ├── home/
    ├── delivery/
    ├── history/
    └── pending/
```

## Offline-first

Toda entrega deve ser persistida localmente antes de depender de qualquer sistema externo.

## Idempotência

Cada tentativa externa deve possuir identificador próprio para evitar duplicidades.

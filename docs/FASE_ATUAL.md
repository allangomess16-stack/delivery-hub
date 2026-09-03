# Fase atual — V0.3.9

## Baseline homologada

A V0.3.8 foi homologada em Android para:

- scanner contínuo ao vivo;
- confirmação rápida de tracking;
- fallback por foto;
- fallback manual;
- identificação J&T / Anjun / iMile conforme regras conhecidas;
- seleção de recebedor;
- nome e CPF/documento opcionais.

## Objetivo da V0.3.9

Reenquadrar a camada de interface antes de adicionar novas funções.

Implementado:

- `app.ts` reduzido e mantido como orquestrador;
- controlador dedicado para gestão de cargas;
- controlador dedicado para fluxo de entrega;
- estado visual local de sessão;
- preservação de filtro/scroll/seleção no Admin;
- delegação de eventos em listas principais;
- Bottom Sheet para edição contextual de endereço/região;
- atualização granular de card na edição de localização.

## Arquitetura operacional vigente

- domínio e casos de uso não dependem da interface;
- IndexedDB/cache local é a primeira linha do fluxo offline;
- Firebase é infraestrutura de sincronização, não armazenamento de estado visual;
- integração externa com transportadoras continua capability/evidence-driven;
- automação de baixa permanece bloqueada até validação adequada do app/versão.

## Próxima expansão funcional

Após validar que a V0.3.9 não introduziu regressão, retomar o roadmap operacional:

1. fila offline idempotente para sincronização;
2. estado físico x estado externo visível ao operador;
3. NativeBridge Android para integrações validadas;
4. primeira integração real somente após validação em aparelho autorizado.

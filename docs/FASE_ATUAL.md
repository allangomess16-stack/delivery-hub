# Fase atual — V0.4.0

## Baseline funcional

A V0.3.8 foi homologada em Android para scanner e recebedor. A V0.3.9
reenquadrou a interface antes da expansão funcional.

## Objetivo da V0.4.0

Confiabilidade operacional offline antes das integrações com transportadoras.

Implementado:

- Outbox persistente em IndexedDB;
- UUID por conclusão de entrega;
- retry com backoff;
- recuperação de itens travados em processamento;
- reconciliação Outbox → carga local após interrupção;
- envio idempotente ao Firebase por `operacaoId`;
- estado físico separado do estado de integração;
- estado intermediário `AGUARDANDO_INTEGRACAO` para não confundir Hub com
  confirmação da transportadora;
- painel e filtros de pendências para o entregador;
- tentativa automática ao recuperar conexão e ao retornar ao app;
- modo de homologação com teste offline seguro.

## Regra arquitetural

A interface não acessa a fila IndexedDB diretamente. Conclusão e sincronização
são expostas por serviços da camada `aplicacao/`; IndexedDB e Firebase são
adapters da camada `infraestrutura/`.

## Próxima expansão

Depois da homologação offline:

1. validar Firebase real + regras RTDB;
2. armazenar/subir evidências de foto de forma resiliente;
3. NativeBridge Android (app instalado, launch, clipboard, share/deep link);
4. validar uma única transportadora em aparelho autorizado;
5. somente depois marcar operações como `CONFIRMADA` pela transportadora.

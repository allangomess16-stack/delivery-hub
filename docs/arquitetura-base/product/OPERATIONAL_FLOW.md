# Fluxo Operacional

## Antes da rota

A carga pode entrar por scanner, digitação, CSV ou integração futura.

Dados mínimos quando disponíveis:

```text
trackingCode
companyId
recipient
address
region
```

## Durante a entrega

```text
ESCANEAR
   ↓
IDENTIFICAR TRANSPORTADORA
   ↓
CAPTURAR PROVA
   ├── recebedor
   ├── foto
   ├── documento, se exigido
   ├── assinatura, se exigida
   ├── horário
   └── localização
   ↓
SALVAR LOCALMENTE
   ↓
MARCAR ENTREGA FÍSICA COMO CONCLUÍDA
   ↓
TENTAR MELHOR FLUXO DE BAIXA EXTERNA
```

## Regra principal

A entrega física é independente da baixa externa.

```text
Entrega física: CONCLUÍDA
Baixa J&T: PENDENTE
```

Isso é um estado válido e não deve bloquear o entregador.

## Estados físicos

`PENDING → IN_PROGRESS → DELIVERED | FAILED | RETURNED`

## Estados externos

`NOT_STARTED → PREPARED → OPENED_EXTERNAL_APP → SUBMITTING → CONFIRMED`

Alternativas: `FAILED` e `REQUIRES_MANUAL_ACTION`.

## Fallback

`API → Deep Link → ACTION_SEND → Clipboard + App Launch → Assistente manual → AccessibilityService`.

# Integration Registry

## Objetivo

Definir quais capacidades externas podem ser utilizadas para uma determinada versão instalada do aplicativo da transportadora.

A confiança é versionada por:

```text
companyId + packageName + versionCode
```

## CapabilityEvidence

```ts
export type CapabilityEvidence =
  | "UNKNOWN"
  | "MANIFEST_DISCOVERED"
  | "CODE_DISCOVERED"
  | "ADB_VALIDATED"
  | "DEVICE_VALIDATED"
  | "PRODUCTION_VALIDATED";
```

## Capability

```ts
export interface IntegrationCapability {
  capability:
    | "API"
    | "DEEP_LINK"
    | "ACTION_SEND_IMAGE"
    | "TRACKING_EXTRA"
    | "TEXT_EXTRA"
    | "MANUAL_CODE"
    | "GALLERY_IMAGE"
    | "LIVE_CAMERA"
    | "CLIPBOARD"
    | "APP_LAUNCH";

  supported: boolean;
  evidence: CapabilityEvidence;
  appVersion: string;
  versionCode: number;
  discoveredAt: string;
  testedAt?: string;
  notes?: string;
}
```

## Regra de confiança

Somente `PRODUCTION_VALIDATED` pode ser usado automaticamente como fluxo principal sem intervenção.

Resultados negativos também devem ser registrados.

## Versão desconhecida

```text
J&T 1.2.0 → ACTION_SEND_IMAGE → PRODUCTION_VALIDATED
                     ↓ atualização
J&T 1.3.0 → UNKNOWN
                     ↓
fallback seguro: Clipboard + App Launch
```

Capabilities não são herdadas automaticamente.

## Telemetria

Evento mínimo:

```json
{
  "company": "JNT",
  "detectedVersion": 130,
  "status": "UNKNOWN_VERSION"
}
```

Não incluir dados do cliente, tracking, foto ou documento nessa telemetria.

## Discovery Data x Registry

Discovery Data contém dados brutos. Registry contém apenas conclusões classificadas e testadas.

> Informação encontrada em Manifest/JADX nunca entra automaticamente como regra de produção.

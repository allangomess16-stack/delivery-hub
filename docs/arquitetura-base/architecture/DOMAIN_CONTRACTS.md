# Contratos de Domínio

## DeliveryProof

```ts
export type CompanyId = "JNT" | "ANJUN" | "IMILE" | "OTHER";

export type RecipientType =
  | "SELF"
  | "FAMILY"
  | "DOORMAN"
  | "NEIGHBOR"
  | "COMPANY_EMPLOYEE"
  | "MAILBOX"
  | "OTHER";

export interface DeliveryProof {
  deliveryId: string;
  companyId: CompanyId;
  trackingCode: string;

  recipient: {
    type: RecipientType;
    name?: string;
    documentType?: "CPF" | "RG" | "OTHER";
    documentValue?: string;
  };

  evidence: {
    photos: string[];
    signature?: string;
  };

  location?: {
    latitude: number;
    longitude: number;
  };

  deliveredAt: string;

  physicalStatus:
    | "PENDING"
    | "IN_PROGRESS"
    | "DELIVERED"
    | "FAILED"
    | "RETURNED";

  externalStatus:
    | "NOT_STARTED"
    | "PREPARED"
    | "OPENED_EXTERNAL_APP"
    | "SUBMITTING"
    | "CONFIRMED"
    | "FAILED"
    | "REQUIRES_MANUAL_ACTION";
}
```

## CompanyWorkflow

```ts
export interface CompanyWorkflow {
  companyId: CompanyId;
  androidPackageName?: string;
  targetActivityName?: string;
  deepLinkUri?: string;

  supportsManualCode: boolean;
  supportsActionSendImage: boolean;
  supportsTrackingExtra: boolean;
  supportsTextExtra: boolean;
  forcesLiveCamera: boolean;

  requiresRecipient: boolean;
  requiresDocument: boolean;
  requiresSignature: boolean;
  requiresPhoto: boolean;
}
```

## AndroidAppBridge

```ts
export interface InstalledApp {
  packageName: string;
  versionName?: string;
  versionCode: number;
}

export interface AndroidAppBridge {
  getInstalledApp(packageName: string): Promise<InstalledApp | null>;
  launchApp(packageName: string): Promise<void>;
  launchActivity(
    packageName: string,
    activityName: string,
    extras?: Record<string, string>
  ): Promise<void>;
  openDeepLink(uri: string): Promise<void>;
  shareImage(packageName: string, contentUri: string, mimeType: string): Promise<void>;
  copyText(text: string): Promise<void>;
}
```

## DeliveryRepository

```ts
export interface DeliveryRepository {
  save(proof: DeliveryProof): Promise<void>;
  findById(deliveryId: string): Promise<DeliveryProof | null>;
  findByTrackingCode(trackingCode: string): Promise<DeliveryProof | null>;
  listToday(): Promise<DeliveryProof[]>;
  listPendingExternalSync(): Promise<DeliveryProof[]>;
}
```

## Regra de separação

A UI não acessa diretamente banco, Intent, FileProvider ou APIs externas. A UI chama casos de uso; os casos de uso dependem de contratos.

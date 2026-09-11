import type { IdTransportadora } from "../transportadora/tipos";

export type NivelEvidenciaIntegracao =
  | "UNKNOWN"
  | "MANIFEST_DISCOVERED"
  | "CODE_DISCOVERED"
  | "ADB_VALIDATED"
  | "DEVICE_VALIDATED"
  | "PRODUCTION_VALIDATED";

export type CapacidadeIntegracao =
  | "ABRIR_APP"
  | "LOGIN"
  | "FLUXO_ENTREGA"
  | "SCANNER_INTERNO"
  | "PROVA_FOTO"
  | "ASSINATURA"
  | "MODO_OFFLINE"
  | "DEEP_LINK"
  | "INTENT_EXPLICITO"
  | "COMPARTILHAR_TEXTO"
  | "COMPARTILHAR_IMAGEM";

export interface EvidenciaCapacidade {
  capacidade: CapacidadeIntegracao;
  nivel: NivelEvidenciaIntegracao;
  origem: string;
  detalhes: string;
}

export interface ApkAnalisado {
  arquivo: string;
  sha256: string;
  versaoNome: string | null;
  versaoCodigo: string | null;
  origemVersao: string;
}

export interface RegistroIntegracaoTransportadora {
  transportadora: IdTransportadora;
  nomeTransportadora: string;
  nomeAplicativo: string;
  packageName: string | null;
  nivelPackage: NivelEvidenciaIntegracao;
  apk: ApkAnalisado | null;
  applicationClass?: string;
  fileProviderAuthority?: string;
  atividadesDescobertas: string[];
  capacidades: EvidenciaCapacidade[];
  observacoes: string[];
}

export type EstrategiaIntegracao =
  | "API_OFICIAL"
  | "DEEP_LINK"
  | "INTENT_EXPLICITO"
  | "COMPARTILHAMENTO"
  | "CLIPBOARD_E_ABRIR_APP"
  | "ASSISTIDO_MANUAL"
  | "ACCESSIBILITY";

export interface PlanoIntegracao {
  transportadora: IdTransportadora;
  estrategia: EstrategiaIntegracao;
  automatica: boolean;
  motivo: string;
  packageName: string | null;
}

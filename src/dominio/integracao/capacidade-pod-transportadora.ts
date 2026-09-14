import type { IdTransportadora } from "../transportadora/tipos";

/**
 * Contrato de apresentação, não de automação. Ele impede que a interface
 * declare um campo como enviado à transportadora sem evidência por versão.
 */
export type EstadoCampoPodTransportadora =
  | "PREENCHIDO_AUTOMATICAMENTE"
  | "PREENCHER_NO_APP"
  | "NAO_SUPORTADO";

export interface CapacidadePodTransportadora {
  transportadora: IdTransportadora;
  versionCode: string;
  tracking: EstadoCampoPodTransportadora;
  recebedor: EstadoCampoPodTransportadora;
  fotos: EstadoCampoPodTransportadora;
  assinatura: EstadoCampoPodTransportadora;
  confirmacaoBaixa: EstadoCampoPodTransportadora;
  evidencia: "DEVICE_VALIDATED" | "PRODUCTION_VALIDATED" | "UNKNOWN";
}

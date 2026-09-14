import type { IdTransportadora } from "../transportadora/tipos";
export type EtapaTelemetriaIntegracao =
  | "CONSULTAR_APP"
  | "RESOLVER_CONTRATO"
  | "ABRIR_DEEP_LINK"
  | "COPIAR_TRACKING"
  | "ABRIR_APLICATIVO"
  | "RESULTADO";

/**
 * Evento deliberadamente sem tracking, recebedor, documento, foto ou token.
 * O UID fica somente no caminho protegido do Firebase.
 */
export interface EventoTelemetriaIntegracao {
  eventoId: string;
  ocorridoEm: string;
  versaoDeliveryHub: string;
  transportadora: IdTransportadora;
  packageName: string;
  versionCode?: string;
  versaoContrato?: number;
  etapa: EtapaTelemetriaIntegracao;
  codigo: string;
  estrategia: "DEEPLINK" | "CLIPBOARD_APP" | "MANUAL";
}

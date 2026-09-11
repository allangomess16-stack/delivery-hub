import type { IdTransportadora } from "../transportadora/tipos";
import type { NivelEvidenciaIntegracao } from "./tipos";

/**
 * O servidor escolhe apenas protocolos que ja existem no APK. Ele nunca envia
 * package, scheme ou uma URI arbitraria para a ponte Android.
 */
export type ModoContratoIntegracao = "DEEPLINK" | "CLIPBOARD_APP" | "MANUAL";
export type OrigemContratoIntegracao = "REMOTO" | "CACHE" | "EMBARCADO" | "PADRAO_SEGURO";

export interface ConfiguracaoContratoIntegracao {
  versaoSchema: 1;
  transportadora: IdTransportadora;
  versionCode: string;
  protocoloId: string | null;
  versaoContrato: number;
  habilitado: boolean;
  modo: ModoContratoIntegracao;
  evidencia: NivelEvidenciaIntegracao;
  atualizadoEm: string;
  expiraEm?: string;
  motivo?: string;
}

export interface ContratoIntegracaoEfetivo extends ConfiguracaoContratoIntegracao {
  origem: OrigemContratoIntegracao;
  expirado: boolean;
}

export interface ConsultaContratoIntegracao {
  transportadora: IdTransportadora;
  packageName: string;
  versionCode: string;
}


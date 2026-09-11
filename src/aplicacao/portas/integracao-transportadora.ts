import type { IdTransportadora } from "../../dominio/transportadora/tipos";
import type { CapacidadePodTransportadora } from "../../dominio/integracao/capacidade-pod-transportadora";

export type ModoNavegacaoTransportadora = "OPERACAO" | "HOMOLOGACAO";

export interface SolicitacaoPesquisaTracking {
  tracking: string;
  modo: ModoNavegacaoTransportadora;
}

export type CodigoResultadoIntegracao =
  | "DESPACHADO_VALIDADO"
  | "FALLBACK_CLIPBOARD"
  | "ACAO_MANUAL"
  | "TRACKING_INVALIDO"
  | "APP_NAO_INSTALADO"
  | "VERSAO_DESCONHECIDA"
  | "PLATAFORMA_NAO_SUPORTADA"
  | "INTEGRACAO_INDISPONIVEL";

export interface ResultadoIntegracaoTransportadora {
  codigo: CodigoResultadoIntegracao;
  estrategia: "DEEPLINK" | "CLIPBOARD_APP" | "MANUAL";
  despachado: boolean;
  requerAcaoEntregador: boolean;
  mensagem: string;
}

export interface IntegracaoTransportadora {
  readonly transportadora: IdTransportadora;
  /** Exibe somente capacidades comprovadas para a versão homologada. */
  obterCapacidadePod?(): CapacidadePodTransportadora;
  abrirPesquisaPorTracking(
    solicitacao: SolicitacaoPesquisaTracking,
  ): Promise<ResultadoIntegracaoTransportadora>;
}

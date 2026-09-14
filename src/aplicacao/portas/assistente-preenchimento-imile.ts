import type { DadosComprovacaoImile } from "../../dominio/entrega/tipos";

/**
 * Contrato da automacao assistida. A interface nao confirma nem toca no botao
 * de baixa: ela somente deixa o formulario da iMile pronto para conferencia.
 */
export type EstadoAssistenciaImile =
  | "PRONTA"
  | "DESATIVADA"
  | "INDISPONIVEL"
  | "REVISAO_MANUAL";

export interface ResultadoAssistenciaImile {
  estado: EstadoAssistenciaImile;
  mensagem: string;
}

export interface AssistentePreenchimentoImile {
  preparar(dados: DadosComprovacaoImile): Promise<ResultadoAssistenciaImile>;
  abrirConfiguracoes(): Promise<boolean>;
}

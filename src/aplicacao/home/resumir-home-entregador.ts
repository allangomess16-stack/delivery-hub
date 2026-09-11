import { obterEstadoEntrega } from "../estado-entrega";
import { resumirOperacaoEntregador } from "../resumir-operacao-entregador";
import { obterDataLocalIso } from "../tempo/data-local";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";

export interface OperacaoEmAndamento {
  carga: CargaEntregador;
  pacote: PacoteDaCarga;
}

export interface ResumoHomeEntregador {
  entregasSemana: number;
  pendentesHoje: number;
  possuiCargaHoje: boolean;
  retomada: OperacaoEmAndamento | null;
  avisos: string[];
}

function inicioDaSemana(data: Date): string {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - 6);
  return obterDataLocalIso(inicio);
}

function estaEmAndamento(pacote: PacoteDaCarga): boolean {
  const estado = obterEstadoEntrega(pacote).estadoFisico;
  return estado === "PREPARANDO" || estado === "AGUARDANDO_RECEBEDOR";
}

/**
 * Consolida somente dados já carregados no aparelho. Nenhuma estatística da
 * Home abre conexão ou consulta extra ao servidor.
 */
export function resumirHomeEntregador(
  cargas: readonly CargaEntregador[],
  cargaAtual: CargaEntregador | null,
  agora = new Date(),
): ResumoHomeEntregador {
  const inicio = inicioDaSemana(agora);
  const entregasSemana = cargas
    .filter((carga) => carga.dataOperacao >= inicio)
    .flatMap((carga) => carga.pacotes)
    .filter((pacote) => obterEstadoEntrega(pacote).estadoFisico === "ENTREGUE")
    .length;

  const retomada = cargas
    .flatMap((carga) => carga.pacotes.map((pacote) => ({ carga, pacote })))
    .find(({ pacote }) => estaEmAndamento(pacote)) ?? null;

  const operacaoAtual = cargaAtual ? resumirOperacaoEntregador(cargaAtual.pacotes) : null;
  const pendentesHoje = operacaoAtual
    ? operacaoAtual.pendentes + operacaoAtual.emAndamento
    : 0;
  const avisos: string[] = [];

  if (retomada) {
    avisos.push("Existe uma entrega em andamento preservada neste aparelho.");
  } else if (cargaAtual) {
    avisos.push("Sua carga de hoje está pronta para operação.");
  } else {
    avisos.push("Nenhuma carga ativa. O Scanner Universal continua disponível.");
  }

  if (operacaoAtual?.aguardandoSincronizacao) {
    avisos.push(`${operacaoAtual.aguardandoSincronizacao} registro(s) aguardando sincronização.`);
  }

  return {
    entregasSemana,
    pendentesHoje,
    possuiCargaHoje: Boolean(cargaAtual),
    retomada,
    avisos,
  };
}

import { obterEstadoEntrega } from "./estado-entrega";
import type { PacoteDaCarga } from "../dominio/carga/tipos";

export type FiltroPendenciaEntregador =
  | "TODOS"
  | "ENTREGUES_FISICOS"
  | "AGUARDANDO_SYNC"
  | "AGUARDANDO_INTEGRACAO"
  | "CONFIRMADAS"
  | "EXIGE_ACAO";

export interface ResumoOperacaoEntregador {
  total: number;
  pendentes: number;
  emAndamento: number;
  entregues: number;
  naoEntregues: number;
  aguardandoSincronizacao: number;
  aguardandoIntegracao: number;
  baixasConfirmadas: number;
  exigeAcao: number;
}

export function resumirOperacaoEntregador(
  pacotes: PacoteDaCarga[],
): ResumoOperacaoEntregador {
  const resumo: ResumoOperacaoEntregador = {
    total: pacotes.length,
    pendentes: 0,
    emAndamento: 0,
    entregues: 0,
    naoEntregues: 0,
    aguardandoSincronizacao: 0,
    aguardandoIntegracao: 0,
    baixasConfirmadas: 0,
    exigeAcao: 0,
  };

  for (const pacote of pacotes) {
    const entrega = obterEstadoEntrega(pacote);
    const fisico = entrega.estadoFisico;
    if (fisico === "PENDENTE") resumo.pendentes += 1;
    else if (fisico === "ENTREGUE") resumo.entregues += 1;
    else if (fisico === "NAO_ENTREGUE") resumo.naoEntregues += 1;
    else resumo.emAndamento += 1;

    const integracao = entrega.estadoIntegracao;
    if (integracao === "AGUARDANDO_SINCRONIZACAO" || integracao === "SINCRONIZANDO") {
      resumo.aguardandoSincronizacao += 1;
    } else if (integracao === "AGUARDANDO_INTEGRACAO") {
      resumo.aguardandoIntegracao += 1;
    } else if (integracao === "CONFIRMADA") {
      resumo.baixasConfirmadas += 1;
    } else if (integracao === "ERRO" || integracao === "ACAO_MANUAL") {
      resumo.exigeAcao += 1;
    }
  }

  return resumo;
}

export function filtrarPacotesPorPendencia(
  pacotes: PacoteDaCarga[],
  filtro: FiltroPendenciaEntregador,
): PacoteDaCarga[] {
  if (filtro === "TODOS") return pacotes;

  return pacotes.filter((pacote) => {
    const entrega = obterEstadoEntrega(pacote);
    if (filtro === "ENTREGUES_FISICOS") return entrega.estadoFisico === "ENTREGUE";
    if (filtro === "AGUARDANDO_SYNC") {
      return (
        entrega.estadoIntegracao === "AGUARDANDO_SINCRONIZACAO" ||
        entrega.estadoIntegracao === "SINCRONIZANDO"
      );
    }
    if (filtro === "AGUARDANDO_INTEGRACAO") {
      return entrega.estadoIntegracao === "AGUARDANDO_INTEGRACAO";
    }
    if (filtro === "CONFIRMADAS") return entrega.estadoIntegracao === "CONFIRMADA";
    return entrega.estadoIntegracao === "ERRO" || entrega.estadoIntegracao === "ACAO_MANUAL";
  });
}

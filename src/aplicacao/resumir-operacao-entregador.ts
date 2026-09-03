import { obterEstadoEntrega } from "./estado-entrega";
import type { PacoteDaCarga } from "../dominio/carga/tipos";

export interface ResumoOperacaoEntregador {
  total: number;
  pendentes: number;
  emAndamento: number;
  entregues: number;
  naoEntregues: number;
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
  };

  for (const pacote of pacotes) {
    const estado = obterEstadoEntrega(pacote).estadoFisico;
    if (estado === "PENDENTE") resumo.pendentes += 1;
    else if (estado === "ENTREGUE") resumo.entregues += 1;
    else if (estado === "NAO_ENTREGUE") resumo.naoEntregues += 1;
    else resumo.emAndamento += 1;
  }

  return resumo;
}

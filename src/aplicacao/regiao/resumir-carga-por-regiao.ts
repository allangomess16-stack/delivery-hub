import { obterEstadoEntrega } from "../estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";

export const REGIAO_SEM_IDENTIFICACAO = "SEM-REGIAO";

export interface ResumoRegiaoCarga {
  regiaoId: string;
  nome: string;
  total: number;
  restantes: number;
  pendentes: number;
  emAndamento: number;
  finalizados: number;
}

export function idRegiaoPacote(pacote: PacoteDaCarga): string {
  return pacote.regiaoEntrega?.regiaoId ?? REGIAO_SEM_IDENTIFICACAO;
}

export function nomeRegiaoPacote(pacote: PacoteDaCarga): string {
  return pacote.regiaoEntrega?.nome ?? "Sem regiao";
}

export function resumirCargaPorRegiao(pacotes: PacoteDaCarga[]): ResumoRegiaoCarga[] {
  const mapa = new Map<string, ResumoRegiaoCarga>();

  for (const pacote of pacotes) {
    const regiaoId = idRegiaoPacote(pacote);
    const nome = nomeRegiaoPacote(pacote);
    const atual = mapa.get(regiaoId) ?? {
      regiaoId,
      nome,
      total: 0,
      restantes: 0,
      pendentes: 0,
      emAndamento: 0,
      finalizados: 0,
    };

    atual.total += 1;
    const estado = obterEstadoEntrega(pacote).estadoFisico;
    if (estado === "PENDENTE") {
      atual.pendentes += 1;
      atual.restantes += 1;
    } else if (estado === "ENTREGUE" || estado === "NAO_ENTREGUE") {
      atual.finalizados += 1;
    } else {
      atual.emAndamento += 1;
      atual.restantes += 1;
    }

    mapa.set(regiaoId, atual);
  }

  return [...mapa.values()].sort((a, b) => {
    if (a.regiaoId === REGIAO_SEM_IDENTIFICACAO) return 1;
    if (b.regiaoId === REGIAO_SEM_IDENTIFICACAO) return -1;
    if (a.restantes !== b.restantes) return b.restantes - a.restantes;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

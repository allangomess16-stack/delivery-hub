import { describe, expect, it } from "vitest";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";
import { encontrarCargaAtual } from "../src/aplicacao/carga/encontrar-carga-atual";
import { resumirHomeEntregador } from "../src/aplicacao/home/resumir-home-entregador";
import type { CargaEntregador, PacoteDaCarga } from "../src/dominio/carga/tipos";
import type { EstadoFisicoEntrega } from "../src/dominio/entrega/tipos";

function pacote(id: string, estado: EstadoFisicoEntrega): PacoteDaCarga {
  return {
    id,
    entregador: "Allan",
    codigoOriginal: `60823264686${id}`,
    codigoNormalizado: `60823264686${id}`,
    transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
    precisaRevisao: false,
    entrega: { ...criarEstadoEntregaPadrao(), estadoFisico: estado },
  };
}

function carga(
  cargaId: string,
  dataOperacao: string,
  status: CargaEntregador["status"],
  pacotes: PacoteDaCarga[],
): CargaEntregador {
  return {
    cargaId,
    cargaOrigemId: cargaId,
    entregadorId: "ENT-1",
    nomeEntregador: "Allan",
    dataOperacao,
    nomeArquivoOrigem: "teste.xlsx",
    criadaEm: `${dataOperacao}T10:00:00.000Z`,
    pacotes,
    chaveRemotaSimulada: cargaId,
    status,
  };
}

describe("resumo do lobby do entregador", () => {
  it("calcula semana e pendências sem inventar carga quando ela não existe", () => {
    const ativa = carga("ATIVA", "2026-09-11", "EM_OPERACAO", [
      pacote("1", "ENTREGUE"),
      pacote("2", "PENDENTE"),
    ]);
    const antiga = carga("ANTIGA", "2026-09-03", "ENCERRADA", [pacote("3", "ENTREGUE")]);
    const atual = encontrarCargaAtual([ativa, antiga]);
    const resumo = resumirHomeEntregador([ativa, antiga], atual, new Date(2026, 8, 11));

    expect(resumo.entregasSemana).toBe(1);
    expect(resumo.pendentesHoje).toBe(1);
    expect(resumo.possuiCargaHoje).toBe(true);
  });

  it("prioriza retomada de POD preservado", () => {
    const ativa = carga("ATIVA", "2026-09-11", "EM_OPERACAO", [pacote("1", "AGUARDANDO_RECEBEDOR")]);
    const resumo = resumirHomeEntregador([ativa], ativa, new Date(2026, 8, 11));

    expect(resumo.retomada?.pacote.id).toBe("1");
    expect(resumo.avisos[0]).toContain("andamento");
  });

  it("não trata scanner universal como carga oficial", () => {
    const livre = { ...carga("LIVRE", "2026-09-11", "EM_OPERACAO", []), origemOperacional: "SCANNER_UNIVERSAL" as const };
    expect(encontrarCargaAtual([livre])).toBeNull();
  });
});

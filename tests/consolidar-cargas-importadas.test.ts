import { describe, expect, it } from "vitest";
import { consolidarCargasImportadas } from "../src/aplicacao/carga/consolidar-cargas-importadas";
import { criarReferenciaLote } from "../src/aplicacao/carga/referencias-carga";
import type { CargaEntregador } from "../src/dominio/carga/tipos";

function carga(id: string, entregadorId: string, codigo: string, celula?: string): CargaEntregador {
  return {
    cargaId: id,
    cargaOrigemId: `origem-${id}`,
    entregadorId,
    nomeEntregador: entregadorId,
    dataOperacao: "2026-09-08",
    nomeArquivoOrigem: `${id}.xlsx`,
    criadaEm: "2026-09-08T10:00:00.000Z",
    chaveRemotaSimulada: id,
    status: "PUBLICADA",
    pacotes: [{
      id: `p-${id}`,
      entregador: entregadorId,
      codigoOriginal: codigo,
      codigoNormalizado: codigo,
      transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
      precisaRevisao: false,
      origemPlanilha: celula ? {
        aba: "CARGAS",
        linha: Number(celula.match(/\d+/)?.[0]),
        coluna: celula.charCodeAt(0) - 64,
        celula,
        cabecalho: entregadorId,
      } : undefined,
    }],
  };
}

describe("consolidacao de cargas importadas", () => {
  it("adiciona pacotes novos na unica carga ativa do mesmo entregador e dia", () => {
    const existente = carga("antiga", "ENT-A", "1111111111111");
    const nova = carga("nova", "ENT-A", "2222222222222");
    const resultado = consolidarCargasImportadas([nova], [existente]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].cargaId).toBe("antiga");
    expect(resultado[0].pacotes.map((p) => p.codigoNormalizado)).toEqual([
      "1111111111111", "2222222222222",
    ]);
  });

  it("mantem a origem de cada lote quando consolida a operacao diaria", () => {
    const existente = carga("antiga", "ENT-A", "1111111111111");
    existente.lotesOrigem = [{
      loteId: "origem-antiga",
      referencia: criarReferenciaLote("origem-antiga", existente.dataOperacao),
      nomeArquivo: "antiga.xlsx",
      importadaEm: existente.criadaEm,
      quantidadePacotes: 1,
    }];
    const nova = carga("nova", "ENT-A", "2222222222222");
    nova.lotesOrigem = [{
      loteId: "origem-nova",
      referencia: criarReferenciaLote("origem-nova", nova.dataOperacao),
      nomeArquivo: "nova.xlsx",
      importadaEm: nova.criadaEm,
      quantidadePacotes: 1,
    }];

    const [resultado] = consolidarCargasImportadas([nova], [existente]);

    expect(resultado.lotesOrigem?.map((origem) => origem.nomeArquivo)).toEqual([
      "antiga.xlsx", "nova.xlsx",
    ]);
  });

  it("bloqueia tracking repetido entre entregadores na mesma data", () => {
    expect(() => consolidarCargasImportadas(
      [carga("nova", "ENT-B", "1111111111111")],
      [carga("antiga", "ENT-A", "1111111111111")],
    )).toThrow("ja pertence");
  });

  it("informa celula nova e pessoa que ja possui o tracking", () => {
    expect(() => consolidarCargasImportadas(
      [carga("nova", "ENT-B", "1111111111111", "C8")],
      [carga("antiga", "ENT-A", "1111111111111", "B4")],
    )).toThrow(/nova planilha: ENT-B — linha 8, coluna C \(C8\).*carga de ENT-A.*ENT-A — linha 4, coluna B \(B4\)/);
  });

  it("repara duas cargas pendentes preexistentes e preserva uma unica carga ativa", () => {
    const resultado = consolidarCargasImportadas(
      [carga("nova", "ENT-A", "3333333333333")],
      [carga("a", "ENT-A", "1111111111111"), carga("b", "ENT-A", "2222222222222")],
    );
    const ativas = resultado.filter((item) => item.status !== "ENCERRADA");
    const encerradas = resultado.filter((item) => item.status === "ENCERRADA");
    expect(ativas).toHaveLength(1);
    expect(ativas[0].pacotes.map((item) => item.codigoNormalizado)).toEqual([
      "1111111111111", "2222222222222", "3333333333333",
    ]);
    expect(encerradas).toHaveLength(1);
    expect(encerradas[0].pacotes).toEqual([]);
  });

  it("bloqueia reparo quando mais de uma carga ja possui operacao", () => {
    const primeira = carga("a", "ENT-A", "1111111111111");
    const segunda = carga("b", "ENT-A", "2222222222222");
    for (const item of [primeira, segunda]) {
      item.pacotes[0].entrega = {
        estadoFisico: "ENTREGUE",
        estadoIntegracao: "AGUARDANDO_INTEGRACAO",
        fotos: [],
        eventos: [],
      };
    }
    expect(() => consolidarCargasImportadas(
      [carga("nova", "ENT-A", "3333333333333")],
      [primeira, segunda],
    )).toThrow("mais de uma ja possui operacoes");
  });
});

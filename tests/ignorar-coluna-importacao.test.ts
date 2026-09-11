import { describe, expect, it } from "vitest";
import { ignorarColunaImportacao } from "../src/aplicacao/importacao/ignorar-coluna-importacao";
import type { CargaImportada } from "../src/dominio/carga/tipos";

describe("ignorar coluna de importacao", () => {
  it("remove somente a coluna escolhida e registra a decisao", () => {
    const carga: CargaImportada = {
      id: "importacao-1",
      nomeArquivo: "cargas.xlsx",
      importadaEm: "2026-09-09T10:00:00.000Z",
      entregadores: ["ANA", "CONTROLE"],
      pacotes: [
        { id: "1", entregador: "ANA", codigoOriginal: "6082326468665", codigoNormalizado: "6082326468665", transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" }, precisaRevisao: false },
        { id: "2", entregador: "CONTROLE", codigoOriginal: "1", codigoNormalizado: "1", transportadora: { id: "OUTRA", nome: "Outra", confianca: "DESCONHECIDA" }, precisaRevisao: false },
      ],
    };

    const resultado = ignorarColunaImportacao(carga, "CONTROLE");
    expect(resultado.entregadores).toEqual(["ANA"]);
    expect(resultado.pacotes.map((item) => item.codigoNormalizado)).toEqual(["6082326468665"]);
    expect(resultado.colunasIgnoradas?.[0]).toMatchObject({ cabecalho: "CONTROLE", quantidadeDescartada: 1 });
    expect(carga.entregadores).toEqual(["ANA", "CONTROLE"]);
  });
});

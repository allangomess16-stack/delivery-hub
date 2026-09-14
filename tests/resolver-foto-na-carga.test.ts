import { describe, expect, it } from "vitest";
import { resolverFotoNaCarga } from "../src/aplicacao/scanner/resolver-foto-na-carga";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";

function pacote(id: string, codigo: string): PacoteDaCarga {
  return {
    id,
    entregador: "PEDRO",
    codigoOriginal: codigo,
    codigoNormalizado: codigo,
    transportadora: {
      id: "OUTRA",
      nome: "Outra / nao identificada",
      confianca: "DESCONHECIDA",
    },
    precisaRevisao: false,
  };
}

describe("resolverFotoNaCarga", () => {
  it("ignora barcode secundario e usa o codigo que existe na carga", () => {
    const resultado = resolverFotoNaCarga(
      [pacote("1", "999881790335907")],
      ["1234567890", "999881790335907"],
    );

    expect(resultado.pacote?.id).toBe("1");
  });

  it("nao escolhe automaticamente quando a foto contem duas encomendas", () => {
    const resultado = resolverFotoNaCarga(
      [
        pacote("1", "999881790335907"),
        pacote("2", "888002431695151"),
      ],
      ["999881790335907", "888002431695151"],
    );

    expect(resultado.pacote).toBeUndefined();
    expect(resultado.erro).toContain("mais de uma encomenda");
  });

  it("nao aceita codigo lido que nao pertence a carga", () => {
    const resultado = resolverFotoNaCarga(
      [pacote("1", "999881790335907")],
      ["000000000000000"],
    );

    expect(resultado.pacote).toBeUndefined();
    expect(resultado.erro).toContain("nao corresponde");
  });
});

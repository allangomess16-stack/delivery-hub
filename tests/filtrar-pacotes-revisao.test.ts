import { describe, expect, it } from "vitest";
import { filtrarPacotesParaRevisao } from "../src/aplicacao/filtrar-pacotes-revisao";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";

function pacote(
  codigo: string,
  entregador: string,
  precisaRevisao: boolean,
): PacoteDaCarga {
  return {
    id: `${entregador}-${codigo}`,
    entregador,
    codigoOriginal: codigo,
    codigoNormalizado: codigo,
    transportadora: {
      id: "OUTRA",
      nome: "Outra / nao identificada",
      confianca: "DESCONHECIDA",
    },
    precisaRevisao,
    motivoRevisao: precisaRevisao ? "Conferir codigo" : undefined,
  };
}

describe("filtrarPacotesParaRevisao", () => {
  it("retorna somente os pacotes marcados para revisao", () => {
    const resultado = filtrarPacotesParaRevisao([
      pacote("3", "Carlos", false),
      pacote("2", "Bruno", true),
      pacote("1", "Ana", true),
    ]);

    expect(resultado.map((item) => item.codigoNormalizado)).toEqual(["1", "2"]);
  });

  it("nao altera a lista original", () => {
    const original = [
      pacote("2", "Bruno", true),
      pacote("1", "Ana", true),
    ];

    filtrarPacotesParaRevisao(original);

    expect(original.map((item) => item.codigoNormalizado)).toEqual(["2", "1"]);
  });
});

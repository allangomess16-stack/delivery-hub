import { describe, expect, it } from "vitest";
import { detectarDuplicados } from "../src/aplicacao/detectar-duplicados";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";

function pacote(id: string, codigo: string, entregador: string): PacoteDaCarga {
  return {
    id,
    entregador,
    codigoOriginal: codigo,
    codigoNormalizado: codigo,
    transportadora: { id: "JNT", nome: "J&T Express", confianca: "ALTA" },
    precisaRevisao: false,
  };
}

describe("detectarDuplicados", () => {
  it("agrupa o mesmo codigo mesmo em entregadores diferentes", () => {
    const resultado = detectarDuplicados([
      pacote("1", "999881724766056", "ANA"),
      pacote("2", "999881724766056", "PEDRO"),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.ocorrencias).toHaveLength(2);
  });
});

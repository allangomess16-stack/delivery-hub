import { describe, expect, it } from "vitest";
import { localizarPacote } from "../src/aplicacao/localizar-pacote";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";

const pacote: PacoteDaCarga = { id: "1", entregador: "PEDRO", codigoOriginal: "999881790335907", codigoNormalizado: "999881790335907", transportadora: { id: "JNT", nome: "J&T Express", confianca: "ALTA" }, precisaRevisao: false };

describe("localizarPacote", () => {
  it("encontra pacote dentro da carga ja isolada", () => {
    const resultado = localizarPacote([pacote], "999881790335907");
    expect(resultado.encontrados).toHaveLength(1);
    expect(resultado.erro).toBeUndefined();
  });
  it("nao encontra codigo inexistente", () => {
    const resultado = localizarPacote([pacote], "888888888888888");
    expect(resultado.encontrados).toHaveLength(0);
    expect(resultado.erro).toContain("nao encontrado");
  });
});

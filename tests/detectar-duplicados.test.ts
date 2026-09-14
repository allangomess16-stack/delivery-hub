import { describe, expect, it } from "vitest";
import { detectarDuplicados } from "../src/aplicacao/detectar-duplicados";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";

function pacote(id: string, codigo: string, entregador: string, celula?: string): PacoteDaCarga {
  return {
    id,
    entregador,
    codigoOriginal: codigo,
    codigoNormalizado: codigo,
    transportadora: { id: "JNT", nome: "J&T Express", confianca: "ALTA" },
    precisaRevisao: false,
    origemPlanilha: celula ? {
      aba: "CARGAS",
      linha: Number(celula.match(/\d+/)?.[0]),
      coluna: celula.charCodeAt(0) - 64,
      celula,
      cabecalho: entregador,
    } : undefined,
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

  it("preserva pessoa, linha e coluna na descricao operacional", async () => {
    const { descreverDuplicidade } = await import("../src/aplicacao/detectar-duplicados");
    const [duplicidade] = detectarDuplicados([
      pacote("1", "999881724766056", "ANA", "B2"),
      pacote("2", "999881724766056", "PEDRO", "C7"),
    ]);

    expect(descreverDuplicidade(duplicidade)).toContain("ANA — linha 2, coluna B (B2)");
    expect(descreverDuplicidade(duplicidade)).toContain("PEDRO — linha 7, coluna C (C7)");
  });
});

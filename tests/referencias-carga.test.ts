import { describe, expect, it } from "vitest";
import {
  criarReferenciaCarga,
  criarReferenciaLote,
  listarOrigensLote,
  obterReferenciaCarga,
} from "../src/aplicacao/carga/referencias-carga";
import type { CargaEntregador } from "../src/dominio/carga/tipos";

function cargaLegada(): CargaEntregador {
  return {
    cargaId: "550e8400-e29b-41d4-a716-446655440000",
    cargaOrigemId: "lote-antigo-123456",
    entregadorId: "ENT-A",
    nomeEntregador: "Allan",
    dataOperacao: "2026-09-08",
    nomeArquivoOrigem: "pacotes.xlsx",
    criadaEm: "2026-09-08T10:00:00.000Z",
    chaveRemotaSimulada: "carga",
    status: "PUBLICADA",
    pacotes: [],
  };
}

describe("referencias de carga", () => {
  it("gera referencias curtas, legiveis e deterministicas", () => {
    expect(criarReferenciaLote("lote-antigo-123456", "2026-09-08"))
      .toBe("LOTE-20260908-123456");
    expect(criarReferenciaCarga("550e8400-e29b-41d4-a716-446655440000", "2026-09-08"))
      .toBe("CARGA-20260908-440000");
  });

  it("identifica registros legados sem exigir migracao destrutiva", () => {
    const carga = cargaLegada();
    expect(obterReferenciaCarga(carga)).toBe("CARGA-20260908-440000");
    expect(listarOrigensLote(carga)).toEqual([{
      loteId: "lote-antigo-123456",
      referencia: "LOTE-20260908-123456",
      nomeArquivo: "pacotes.xlsx",
      importadaEm: "2026-09-08T10:00:00.000Z",
      quantidadePacotes: 0,
    }]);
  });
});

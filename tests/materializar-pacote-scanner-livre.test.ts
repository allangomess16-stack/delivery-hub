import { describe, expect, it } from "vitest";
import { materializarPacoteScannerLivre } from "../src/aplicacao/scanner/materializar-pacote-scanner-livre";
import type { ResultadoScannerUniversal } from "../src/dominio/scanner/tipos";

const leitura: ResultadoScannerUniversal = {
  tracking: "3320035954712",
  transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
  origem: "SCANNER_LIVRE",
};

describe("materializacao do scanner livre", () => {
  it("cria carga operacional e pacote local sem depender de Excel", () => {
    let sequencia = 0;
    const resultado = materializarPacoteScannerLivre(leitura, null, {
      entregadorId: "e1",
      nomeEntregador: "Allan",
      dataOperacao: "2026-09-10",
      agoraIso: "2026-09-10T12:00:00.000Z",
      novoId: () => `id-${++sequencia}`,
    });

    expect(resultado.cargaCriada).toBe(true);
    expect(resultado.pacoteCriado).toBe(true);
    expect(resultado.carga.pacotes).toEqual([resultado.pacote]);
    expect(resultado.pacote.origem).toBe("MANUAL");
  });

  it("reutiliza o pacote quando o mesmo tracking for lido novamente", () => {
    let sequencia = 0;
    const contexto = {
      entregadorId: "e1",
      nomeEntregador: "Allan",
      dataOperacao: "2026-09-10",
      agoraIso: "2026-09-10T12:00:00.000Z",
      novoId: () => `id-${++sequencia}`,
    };
    const primeira = materializarPacoteScannerLivre(leitura, null, contexto);
    const segunda = materializarPacoteScannerLivre(leitura, primeira.carga, contexto);

    expect(segunda.pacoteCriado).toBe(false);
    expect(segunda.carga.pacotes).toHaveLength(1);
    expect(segunda.pacote.id).toBe(primeira.pacote.id);
  });

  it("preserva marcador auditavel quando a leitura e extra rota", () => {
    const resultado = materializarPacoteScannerLivre({ ...leitura, origem: "EXTRA_ROTA" }, null, {
      entregadorId: "e1", nomeEntregador: "Allan", dataOperacao: "2026-09-10",
      agoraIso: "2026-09-10T12:00:00.000Z", novoId: () => "extra",
    });
    expect(resultado.pacote.situacaoOperacional).toBe("EXTRA_ROTA");
    expect(resultado.pacote.alertaAdmin).toBe(true);
  });
});

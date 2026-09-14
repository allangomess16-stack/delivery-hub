import { describe, expect, it } from "vitest";
import {
  resolverCodigosScannerUniversal,
  resolverScannerUniversal,
  resolverTransportadoraManual,
} from "../src/aplicacao/scanner/resolver-scanner-universal";
import type { CargaEntregador } from "../src/dominio/carga/tipos";

function carga(): CargaEntregador {
  return {
    cargaId: "CARGA-A",
    cargaOrigemId: "LOTE-A",
    entregadorId: "ENT-A",
    nomeEntregador: "Allan",
    dataOperacao: "2026-09-09",
    nomeArquivoOrigem: "carga.xlsx",
    criadaEm: "2026-09-09T10:00:00.000Z",
    chaveRemotaSimulada: "carga",
    status: "PUBLICADA",
    pacotes: [{
      id: "PACOTE-A",
      entregador: "Allan",
      codigoOriginal: "6082326468665",
      codigoNormalizado: "6082326468665",
      transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
      precisaRevisao: false,
    }],
  };
}

describe("scanner universal", () => {
  it("usa a carga apenas como contexto quando o tracking existe nela", () => {
    const resolucao = resolverScannerUniversal("6082326468665", carga());
    expect(resolucao.sucesso).toBe(true);
    if (!resolucao.sucesso) return;
    expect(resolucao.resultado.origem).toBe("CARGA_IMPORTADA");
    expect(resolucao.resultado.pacote?.id).toBe("PACOTE-A");
  });

  it("aceita tracking reconhecido sem carga importada", () => {
    const resolucao = resolverScannerUniversal("6082326468665", null);
    expect(resolucao.sucesso).toBe(true);
    if (!resolucao.sucesso) return;
    expect(resolucao.resultado.origem).toBe("SCANNER_LIVRE");
    expect(resolucao.resultado.transportadora.id).toBe("IMILE");
  });

  it("marca como extra rota uma etiqueta reconhecida fora da carga ativa", () => {
    const resolucao = resolverScannerUniversal("3320035954712", carga());
    expect(resolucao.sucesso).toBe(true);
    if (!resolucao.sucesso) return;
    expect(resolucao.resultado.origem).toBe("EXTRA_ROTA");
  });

  it("nao inventa uma transportadora para codigo desconhecido", () => {
    const resolucao = resolverScannerUniversal("CODIGO-SEM-REGRA", null);
    expect(resolucao).toMatchObject({
      sucesso: false,
      falha: { codigo: "TRANSPORTADORA_NAO_RECONHECIDA" },
    });
  });

  it("prioriza o tracking presente na carga quando a foto possui varios codigos", () => {
    const resolucao = resolverCodigosScannerUniversal(
      ["999881790335907", "6082326468665"],
      carga(),
    );
    expect(resolucao.sucesso).toBe(true);
    if (!resolucao.sucesso) return;
    expect(resolucao.resultado.tracking).toBe("6082326468665");
  });

  it("reconhece o padrão iMile 609 impresso com hífen", () => {
    const resolucao = resolverScannerUniversal("60905264-49890", null);
    expect(resolucao).toMatchObject({
      sucesso: true,
      resultado: { tracking: "6090526449890", transportadora: { id: "IMILE" } },
    });
  });

  it("permite classificar manualmente sem transformar a seleção em regra automática", () => {
    const resolucao = resolverTransportadoraManual("CODIGO-SEM-REGRA", "JNT", null);
    expect(resolucao).toMatchObject({
      sucesso: true,
      resultado: {
        transportadora: { id: "JNT", confianca: "MEDIA", regraUsada: "SELECAO_MANUAL" },
        transportadoraSelecionadaManual: true,
      },
    });
  });
});

import { describe, expect, it } from "vitest";
import { localizarPacotesGlobais } from "../src/aplicacao/carga/localizar-pacote-global";
import type { CargaEntregador } from "../src/dominio/carga/tipos";

function carga(cargaId: string, codigo: string, status: CargaEntregador["status"]): CargaEntregador {
  return {
    cargaId,
    cargaOrigemId: cargaId,
    entregadorId: `ENT-${cargaId}`,
    nomeEntregador: `Pessoa ${cargaId}`,
    dataOperacao: "2026-09-09",
    nomeArquivoOrigem: "teste.xlsx",
    criadaEm: `2026-09-09T10:00:0${cargaId === "nova" ? "2" : "1"}.000Z`,
    chaveRemotaSimulada: cargaId,
    status,
    pacotes: [{ id: `p-${cargaId}`, entregador: cargaId, codigoOriginal: codigo, codigoNormalizado: codigo, transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" }, precisaRevisao: false }],
  };
}

describe("localizacao administrativa global", () => {
  it("normaliza a leitura e abre a ocorrencia exata", () => {
    const resultado = localizarPacotesGlobais([carga("nova", "6082326468665", "PUBLICADA")], [" 6082326468665 "]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].pacote.codigoNormalizado).toBe("6082326468665");
  });

  it("prioriza carga ativa quando existe ocorrencia historica encerrada", () => {
    const resultado = localizarPacotesGlobais([
      carga("antiga", "6082326468665", "ENCERRADA"),
      carga("nova", "6082326468665", "PUBLICADA"),
    ], ["6082326468665"]);
    expect(resultado[0].carga.cargaId).toBe("nova");
    expect(resultado).toHaveLength(2);
  });
});

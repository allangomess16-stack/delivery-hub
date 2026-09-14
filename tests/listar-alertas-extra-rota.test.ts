import { describe, expect, it } from "vitest";
import { listarAlertasExtraRota } from "../src/aplicacao/carga/listar-alertas-extra-rota";
import type { CargaEntregador } from "../src/dominio/carga/tipos";

function carga(id: string, entregadorId: string, codigo: string, extra = false): CargaEntregador {
  return {
    cargaId: id, cargaOrigemId: id, entregadorId, nomeEntregador: entregadorId,
    dataOperacao: "2026-09-10", nomeArquivoOrigem: "teste", criadaEm: "2026-09-10T00:00:00.000Z",
    chaveRemotaSimulada: id, status: "EM_OPERACAO", pacotes: [{
      id: `${id}-P`, entregador: entregadorId, codigoOriginal: codigo, codigoNormalizado: codigo,
      transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" }, precisaRevisao: false,
      alertaAdmin: extra, conciliacaoExtraRota: extra ? { status: "ABERTA" } : undefined,
    }],
  };
}

describe("alertas de extra rota", () => {
  it("sugere o atribuido ao localizar o mesmo AWB em outra carga ativa", () => {
    const alertas = listarAlertasExtraRota([
      { carga: carga("A-extra", "A", "6082326468665", true), nomeEntregador: "Allan" },
      { carga: carga("B-oficial", "B", "6082326468665"), nomeEntregador: "Gabriel" },
    ]);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].atribuidoSugerido).toBe("Gabriel");
  });
});

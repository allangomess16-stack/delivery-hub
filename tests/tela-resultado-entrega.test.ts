import { describe, expect, it } from "vitest";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";
import { CAPACIDADE_POD_IMILE_2_3_21 } from "../src/configuracao/contratos-integracao/imile-2-3-18";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";
import { telaResultadoEntrega } from "../src/interface/telas/tela-resultado-entrega";

function pacoteIMile(): PacoteDaCarga {
  return {
    id: "PK-1",
    entregador: "Allan",
    codigoOriginal: "6082326468665",
    codigoNormalizado: "6082326468665",
    transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
    precisaRevisao: false,
    entrega: { ...criarEstadoEntregaPadrao(), estadoFisico: "ENTREGUE" },
  };
}

describe("tela de resultado da entrega", () => {
  it("mostra apenas capacidades comprovadas do adaptador", () => {
    const html = telaResultadoEntrega(pacoteIMile(), true, CAPACIDADE_POD_IMILE_2_3_21);

    expect(html).toContain("TRANSFERÊNCIA PARA IMILE");
    expect(html).toContain("AUTOMÁTICO");
    expect(html).toContain("PREENCHER NO APP");
    expect(html).toContain("POD salvo no Hub não é enviado sem contrato validado");
  });

  it("não mostra matriz para uma transportadora sem adaptador", () => {
    const html = telaResultadoEntrega(pacoteIMile(), false);
    expect(html).not.toContain("TRANSFERÊNCIA PARA IMILE");
  });
});

import { describe, expect, it } from "vitest";
import {
  criarEstadoDetalheCargaAdmin,
  criarEstadoListaCargasAdmin,
  EstadoUiSessao,
} from "../src/interface/nucleo/estado-ui";

describe("EstadoUiSessao", () => {
  it("mantem filtros e scroll apenas durante a sessao da interface", () => {
    const estadoUi = new EstadoUiSessao();
    const estado = estadoUi.obter("admin:carga:A:1", criarEstadoDetalheCargaAdmin);
    estado.filtroCodigo = "608232";
    estado.filtroRegiao = "CEILANDIA";
    estado.scrollTop = 840;

    expect(estadoUi.obter("admin:carga:A:1", criarEstadoDetalheCargaAdmin)).toEqual({
      filtroCodigo: "608232",
      filtroRegiao: "CEILANDIA",
      selecionados: [],
      scrollTop: 840,
    });
  });

  it("isola o estado entre telas e permite limpar a sessao", () => {
    const estadoUi = new EstadoUiSessao();
    estadoUi.atualizar("admin:cargas", criarEstadoListaCargasAdmin, (estado) => {
      estado.busca = "AJ2608";
    });

    expect(estadoUi.obter("admin:cargas", criarEstadoListaCargasAdmin).busca).toBe("AJ2608");
    estadoUi.limpar();
    expect(estadoUi.obter("admin:cargas", criarEstadoListaCargasAdmin).busca).toBe("");
  });
});

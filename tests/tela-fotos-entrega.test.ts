import { describe, expect, it } from "vitest";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";
import { telaFotosEntrega } from "../src/interface/telas/tela-fotos-entrega";

function pacoteComFoto(): PacoteDaCarga {
  return {
    id: "PK-1",
    entregador: "Allan",
    codigoOriginal: "6082326468665",
    codigoNormalizado: "6082326468665",
    transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
    precisaRevisao: false,
    entrega: {
      ...criarEstadoEntregaPadrao(),
      fotos: [{
        id: "foto-1",
        tipo: "ETIQUETA",
        chaveArquivo: "foto:1",
        capturadaEm: "2026-09-11T12:00:00.000Z",
        origem: "GALERIA",
      }],
    },
  };
}

describe("tela de fotos da entrega", () => {
  it("oferece câmera traseira e galeria para cada evidência", () => {
    const html = telaFotosEntrega(pacoteComFoto());

    expect(html).toContain("CÂMERA");
    expect(html).toContain("GALERIA");
    expect(html).toContain('capture="environment"');
    expect(html).toContain('data-foto-origem="CAMERA"');
    expect(html).toContain('data-foto-origem="GALERIA"');
  });

  it("informa a origem da evidência já registrada", () => {
    expect(telaFotosEntrega(pacoteComFoto())).toContain("REGISTRADA • DA GALERIA");
  });
});

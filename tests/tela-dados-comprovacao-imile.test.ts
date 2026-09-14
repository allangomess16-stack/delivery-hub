import { describe, expect, it } from "vitest";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";
import { telaDadosComprovacaoImile } from "../src/interface/telas/tela-dados-comprovacao-imile";

const pacote: PacoteDaCarga = {
  id: "imile-1",
  entregador: "Allan",
  codigoOriginal: "6082326468665",
  codigoNormalizado: "6082326468665",
  transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
  precisaRevisao: false,
  entrega: criarEstadoEntregaPadrao(),
};

describe("formulario de comprovacao iMile", () => {
  it("mostra os tipos observados e os campos obrigatorios", () => {
    const html = telaDadosComprovacaoImile(pacote);

    expect(html).toContain("FUNCIONÁRIO(A)");
    expect(html).toContain("ASSOCIAÇÃO DE BAIRRO");
    expect(html).toContain("NOME COMPLETO *");
    expect(html).toContain("TIPO DE DOCUMENTO *");
    expect(html).toContain("NÚMERO DO DOCUMENTO *");
  });
});

import { describe, expect, it } from "vitest";
import {
  confirmarEntrega,
  criarEstadoEntregaPadrao,
  definirRecebedor,
  desfazerUltimaConclusao,
  iniciarEntrega,
  marcarNaoEntregue,
} from "../src/aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";

function novoPacote(): PacoteDaCarga {
  return {
    id: "p1",
    entregador: "PEDRO",
    codigoOriginal: "999881790335907",
    codigoNormalizado: "999881790335907",
    transportadora: {
      id: "JNT",
      nome: "J&T Express",
      confianca: "ALTA",
    },
    precisaRevisao: false,
    entrega: criarEstadoEntregaPadrao(),
  };
}

describe("ciclo de vida da entrega", () => {
  it("nao conclui sem recebedor", () => {
    const pacote = novoPacote();
    iniciarEntrega(pacote);
    expect(() => confirmarEntrega(pacote)).toThrow();
  });

  it("conclui e permite desfazer antes da baixa externa", () => {
    const pacote = novoPacote();
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PROPRIO" });
    confirmarEntrega(pacote);

    expect(pacote.entrega?.estadoFisico).toBe("ENTREGUE");

    desfazerUltimaConclusao(pacote);
    expect(pacote.entrega?.estadoFisico).toBe("AGUARDANDO_RECEBEDOR");
  });

  it("registra nao entregue com motivo", () => {
    const pacote = novoPacote();
    iniciarEntrega(pacote);
    marcarNaoEntregue(pacote, "DESTINATARIO_AUSENTE");

    expect(pacote.entrega?.estadoFisico).toBe("NAO_ENTREGUE");
    expect(pacote.entrega?.motivoNaoEntrega).toBe("DESTINATARIO_AUSENTE");
  });
});

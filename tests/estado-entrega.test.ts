import { describe, expect, it } from "vitest";
import {
  confirmarEntrega,
  criarEstadoEntregaPadrao,
  definirAssinatura,
  definirRecebedor,
  desfazerUltimaConclusao,
  iniciarEntrega,
  marcarNaoEntregue,
  removerAssinatura,
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

  it("aceita CPF/documento opcional e preserva quando informado", () => {
    const pacote = novoPacote();
    iniciarEntrega(pacote);

    definirRecebedor(pacote, {
      tipo: "PORTARIA",
      nome: "Joao",
      documento: "12345678900",
    });

    expect(pacote.entrega?.recebedor?.documento).toBe("12345678900");
    confirmarEntrega(pacote);
    expect(pacote.entrega?.estadoFisico).toBe("ENTREGUE");
  });

  it("nao exige CPF/documento para confirmar a entrega", () => {
    const pacote = novoPacote();
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PORTARIA" });

    expect(() => confirmarEntrega(pacote)).not.toThrow();
    expect(pacote.entrega?.recebedor?.documento).toBeUndefined();
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

  it("registra e remove assinatura sem misturar com as fotos", () => {
    const pacote = novoPacote();
    const anterior = definirAssinatura(pacote, {
      chaveArquivo: "assinatura-1",
      capturadaEm: "2026-09-10T12:00:00.000Z",
      largura: 900,
      altura: 360,
      tamanhoBytes: 2048,
    });

    expect(anterior).toBeNull();
    expect(pacote.entrega?.assinatura?.chaveArquivo).toBe("assinatura-1");
    expect(pacote.entrega?.fotos).toHaveLength(0);
    expect(removerAssinatura(pacote)).toBe("assinatura-1");
    expect(pacote.entrega?.assinatura).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import {
  adicionarFoto,
  confirmarEntrega,
  criarEstadoEntregaPadrao,
  definirAssinatura,
  definirDadosComprovacaoImile,
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

function novoPacoteImile(): PacoteDaCarga {
  return {
    ...novoPacote(),
    id: "imile-1",
    transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
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

  it("exige a prova completa observada na iMile antes de concluir", () => {
    const pacote = novoPacoteImile();
    iniciarEntrega(pacote);
    definirDadosComprovacaoImile(pacote, {
      recebedor: "PORTARIA",
      nomeCompleto: "Maria da Portaria",
      tipoDocumento: "CPF",
      numeroDocumento: "12345678900",
      observacao: "Recebido na portaria.",
    });

    expect(() => confirmarEntrega(pacote)).toThrow("comprovante de recebimento");

    adicionarFoto(pacote, {
      id: "comprovante-1",
      tipo: "COMPROVANTE_RECEBIMENTO",
      chaveArquivo: "foto:comprovante-1",
      capturadaEm: "2026-09-11T15:00:00.000Z",
      origem: "CAMERA",
    });
    expect(() => confirmarEntrega(pacote)).toThrow("assinatura");

    definirAssinatura(pacote, {
      chaveArquivo: "assinatura-imile-1",
      capturadaEm: "2026-09-11T15:01:00.000Z",
      largura: 900,
      altura: 360,
      tamanhoBytes: 2048,
    });

    expect(() => confirmarEntrega(pacote)).not.toThrow();
    expect(pacote.entrega?.estadoFisico).toBe("ENTREGUE");
  });

  it("nao aceita dados incompletos exigidos pela iMile", () => {
    const pacote = novoPacoteImile();

    expect(() => definirDadosComprovacaoImile(pacote, {
      recebedor: "PROPRIO",
      nomeCompleto: "",
      tipoDocumento: "CPF",
      numeroDocumento: "",
    })).toThrow("nome completo");
  });
});

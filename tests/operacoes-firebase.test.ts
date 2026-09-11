import { describe, expect, it } from "vitest";
import {
  listarOperacoesPersistidas,
  operacaoMaisRecente,
  prepararParaFirebase,
  type OperacaoPacoteFirebase,
} from "../src/infraestrutura/firebase/operacoes-firebase";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";

function operacao(id: string, atualizadoEm: string): OperacaoPacoteFirebase {
  return {
    operacaoId: id,
    tipo: "ENTREGA_CONFIRMADA",
    entrega: criarEstadoEntregaPadrao(),
    usuarioId: "usuario-1",
    atualizadoEm,
  };
}

describe("operacoes Firebase V0.4.0", () => {
  it("mantem UUIDs diferentes do mesmo pacote em registros independentes e escolhe o mais recente", () => {
    const antiga = operacao("uuid-antigo-123456", "2026-09-03T10:00:00.000Z");
    const nova = operacao("uuid-novo-12345678", "2026-09-03T10:05:00.000Z");
    const arvore = {
      [antiga.operacaoId]: antiga,
      [nova.operacaoId]: nova,
    };

    expect(listarOperacoesPersistidas(arvore).map((item) => item.operacaoId).sort()).toEqual(
      [antiga.operacaoId, nova.operacaoId].sort(),
    );
    expect(operacaoMaisRecente(arvore)?.operacaoId).toBe(nova.operacaoId);
  });

  it("continua lendo o formato transitório antigo de uma operacao direta por pacote", () => {
    const antiga = operacao("uuid-legado-123456", "2026-09-03T09:00:00.000Z");
    expect(operacaoMaisRecente(antiga)?.operacaoId).toBe(antiga.operacaoId);
  });

  it("remove undefined em profundidade antes do Realtime Database", () => {
    const valor = {
      a: "ok",
      opcional: undefined,
      interno: {
        b: 1,
        removido: undefined,
      },
      lista: [{ c: "x", removido: undefined }],
    };

    const preparado = prepararParaFirebase(valor) as Record<string, unknown>;
    expect(preparado).toEqual({
      a: "ok",
      interno: { b: 1 },
      lista: [{ c: "x" }],
    });
  });
});

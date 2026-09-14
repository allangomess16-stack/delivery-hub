import { describe, expect, it } from "vitest";
import {
  filtrarPacotesPorPendencia,
  resumirOperacaoEntregador,
} from "../src/aplicacao/resumir-operacao-entregador";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../src/dominio/carga/tipos";
import type { EstadoIntegracaoEntrega } from "../src/dominio/entrega/tipos";

function pacote(id: string, estadoIntegracao: EstadoIntegracaoEntrega): PacoteDaCarga {
  const entrega = criarEstadoEntregaPadrao();
  entrega.estadoFisico = "ENTREGUE";
  entrega.estadoIntegracao = estadoIntegracao;
  return {
    id,
    entregador: "E",
    codigoOriginal: id,
    codigoNormalizado: id,
    transportadora: { id: "OUTRA", nome: "Outra", confianca: "DESCONHECIDA" },
    precisaRevisao: false,
    entrega,
  };
}

describe("resumo fisico x sistemico", () => {
  it("nao confunde recebimento pelo Hub com confirmacao na transportadora", () => {
    const pacotes = [
      pacote("1", "AGUARDANDO_SINCRONIZACAO"),
      pacote("2", "AGUARDANDO_INTEGRACAO"),
      pacote("3", "CONFIRMADA"),
      pacote("4", "ACAO_MANUAL"),
    ];

    const resumo = resumirOperacaoEntregador(pacotes);
    expect(resumo.entregues).toBe(4);
    expect(resumo.aguardandoSincronizacao).toBe(1);
    expect(resumo.aguardandoIntegracao).toBe(1);
    expect(resumo.baixasConfirmadas).toBe(1);
    expect(resumo.exigeAcao).toBe(1);
    expect(filtrarPacotesPorPendencia(pacotes, "AGUARDANDO_INTEGRACAO").map((p) => p.id)).toEqual(["2"]);
  });
});

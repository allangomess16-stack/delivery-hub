import { describe, expect, it } from "vitest";
import type { DestinoSincronizacaoEntrega } from "../src/aplicacao/portas/destino-sincronizacao-entrega";
import { criarEstadoEntregaPadrao, definirRecebedor, iniciarEntrega } from "../src/aplicacao/estado-entrega";
import { ServicoOperacoesEntrega } from "../src/aplicacao/sincronizacao/servico-operacoes-entrega";
import { ServicoSincronizacaoEntrega } from "../src/aplicacao/sincronizacao/servico-sincronizacao-entrega";
import type { CargaEntregador } from "../src/dominio/carga/tipos";
import type { ItemOutboxEntrega, ResultadoEnvioOperacao } from "../src/dominio/sincronizacao/tipos";
import { RepositorioCargaLocalAdapter } from "../src/infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";
import { RepositorioOutboxIndexedDb } from "../src/infraestrutura/outbox/repositorio-outbox-indexeddb";

class ServidorPilotoCompartilhado implements DestinoSincronizacaoEntrega {
  private readonly operacoes = new Map<string, ItemOutboxEntrega>();
  private readonly ouvintes = new Set<(operacaoId: string) => void>();

  assinar(ouvinte: (operacaoId: string) => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  listar(): ItemOutboxEntrega[] {
    return [...this.operacoes.values()].map((item) => structuredClone(item));
  }

  async enviar(item: ItemOutboxEntrega): Promise<ResultadoEnvioOperacao> {
    const processadaAntes = this.operacoes.has(item.operacaoId);
    if (!processadaAntes) {
      this.operacoes.set(item.operacaoId, structuredClone(item));
      for (const ouvinte of this.ouvintes) ouvinte(item.operacaoId);
    }
    return { tipo: "RECEBIDA_PELO_HUB", processadaAntes };
  }
}

function cargaPiloto(): CargaEntregador {
  return {
    cargaId: "carga-piloto-1",
    cargaOrigemId: "admin-piloto",
    entregadorId: "entregador-piloto",
    nomeEntregador: "Entregador Piloto",
    dataOperacao: "2026-09-08",
    nomeArquivoOrigem: "piloto-v047.xlsx",
    criadaEm: "2026-09-08T10:00:00.000Z",
    chaveRemotaSimulada: "cargas/entregador-piloto/carga-piloto-1",
    status: "PUBLICADA",
    pacotes: [{
      id: "pacote-piloto-1",
      entregador: "Entregador Piloto",
      codigoOriginal: "6082326468665",
      codigoNormalizado: "6082326468665",
      transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
      precisaRevisao: false,
      entrega: criarEstadoEntregaPadrao(),
    }],
  };
}

describe("Piloto remoto com dois clientes", () => {
  it("entregador reinicia offline e administrador recebe uma unica operacao", async () => {
    const armazenamentoAparelho = new ArmazenamentoMemoria();
    const servidor = new ServidorPilotoCompartilhado();
    const eventosAdmin: string[] = [];
    servidor.assinar((operacaoId) => eventosAdmin.push(operacaoId));
    let online = false;

    const cargasPrimeiraSessao = new RepositorioCargaLocalAdapter(armazenamentoAparelho);
    const outboxPrimeiraSessao = new RepositorioOutboxIndexedDb(armazenamentoAparelho);
    const operacoes = new ServicoOperacoesEntrega(outboxPrimeiraSessao, cargasPrimeiraSessao);
    const sincronizacaoOffline = new ServicoSincronizacaoEntrega(
      outboxPrimeiraSessao,
      cargasPrimeiraSessao,
      servidor,
      () => online,
    );

    const carga = cargaPiloto();
    await cargasPrimeiraSessao.salvarCarga(carga.entregadorId, carga);
    const pacote = carga.pacotes[0];
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PORTARIA" });
    await operacoes.confirmarEntrega(carga, pacote);

    const itemOriginal = (await outboxPrimeiraSessao.listar(carga.entregadorId))[0];
    await sincronizacaoOffline.sincronizarAgora(carga.entregadorId);
    expect(eventosAdmin).toEqual([]);
    expect(await outboxPrimeiraSessao.listar(carga.entregadorId)).toHaveLength(1);

    // Nova instancia representa o APK reaberto usando o mesmo IndexedDB.
    const cargasReabertas = new RepositorioCargaLocalAdapter(armazenamentoAparelho);
    const outboxReaberta = new RepositorioOutboxIndexedDb(armazenamentoAparelho);
    const sincronizacaoReaberta = new ServicoSincronizacaoEntrega(
      outboxReaberta,
      cargasReabertas,
      servidor,
      () => online,
    );
    await sincronizacaoReaberta.reconciliar(carga.entregadorId);

    online = true;
    await sincronizacaoReaberta.sincronizarAgora(carga.entregadorId);
    expect(eventosAdmin).toEqual([itemOriginal.operacaoId]);
    expect(servidor.listar()).toHaveLength(1);
    expect(await outboxReaberta.listar(carga.entregadorId)).toHaveLength(0);

    // Simula perda da resposta: o mesmo UUID reaparece, mas o servidor nao duplica.
    await outboxReaberta.salvar({ ...itemOriginal, estado: "PENDENTE" });
    await sincronizacaoReaberta.sincronizarAgora(carga.entregadorId);
    expect(eventosAdmin).toEqual([itemOriginal.operacaoId]);
    expect(servidor.listar().map((item) => item.operacaoId)).toEqual([itemOriginal.operacaoId]);
    expect(await outboxReaberta.listar(carga.entregadorId)).toHaveLength(0);
  });
});

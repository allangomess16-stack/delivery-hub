import { describe, expect, it, vi } from "vitest";
import type { DestinoSincronizacaoEntrega } from "../src/aplicacao/portas/destino-sincronizacao-entrega";
import type { RepositorioCargaEntregador } from "../src/aplicacao/portas/repositorio-carga-entregador";
import { ServicoOperacoesEntrega } from "../src/aplicacao/sincronizacao/servico-operacoes-entrega";
import { ServicoSincronizacaoEntrega } from "../src/aplicacao/sincronizacao/servico-sincronizacao-entrega";
import { criarEstadoEntregaPadrao, definirRecebedor, iniciarEntrega } from "../src/aplicacao/estado-entrega";
import type { CargaEntregador } from "../src/dominio/carga/tipos";
import type { ItemOutboxEntrega, ResultadoEnvioOperacao } from "../src/dominio/sincronizacao/tipos";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";
import { RepositorioOutboxIndexedDb } from "../src/infraestrutura/outbox/repositorio-outbox-indexeddb";

class RepositorioCargaMemoria implements RepositorioCargaEntregador {
  private cargas: CargaEntregador[] = [];

  async salvarCarga(entregadorId: string, carga: CargaEntregador): Promise<void> {
    if (carga.entregadorId !== entregadorId) throw new Error("entregador invalido");
    this.cargas = this.cargas.filter((item) => item.cargaId !== carga.cargaId);
    this.cargas.push(structuredClone(carga));
  }

  async salvarCargas(cargas: readonly CargaEntregador[]): Promise<void> {
    for (const carga of cargas) await this.salvarCarga(carga.entregadorId, carga);
  }

  async obterCargaAtual(entregadorId: string): Promise<CargaEntregador | null> {
    return structuredClone(this.cargas.find((item) => item.entregadorId === entregadorId) ?? null);
  }

  async listarCargas(entregadorId: string): Promise<CargaEntregador[]> {
    return structuredClone(this.cargas.filter((item) => item.entregadorId === entregadorId));
  }
}

class RepositorioCargaComFalhaControlada implements RepositorioCargaEntregador {
  falharAoSalvar = false;

  constructor(private readonly base: RepositorioCargaEntregador) {}

  salvarCarga(entregadorId: string, carga: CargaEntregador): Promise<void> {
    if (this.falharAoSalvar) return Promise.reject(new Error("falha local simulada"));
    return this.base.salvarCarga(entregadorId, carga);
  }

  salvarCargas(cargas: readonly CargaEntregador[]): Promise<void> {
    if (this.falharAoSalvar) return Promise.reject(new Error("falha local simulada"));
    return this.base.salvarCargas(cargas);
  }

  obterCargaAtual(entregadorId: string): Promise<CargaEntregador | null> {
    return this.base.obterCargaAtual(entregadorId);
  }

  listarCargas(entregadorId: string): Promise<CargaEntregador[]> {
    return this.base.listarCargas(entregadorId);
  }
}

class DestinoIdempotente implements DestinoSincronizacaoEntrega {
  readonly chamadas: string[] = [];
  private readonly processadas = new Set<string>();

  async enviar(item: ItemOutboxEntrega): Promise<ResultadoEnvioOperacao> {
    this.chamadas.push(item.operacaoId);
    const processadaAntes = this.processadas.has(item.operacaoId);
    this.processadas.add(item.operacaoId);
    return { tipo: "RECEBIDA_PELO_HUB", processadaAntes };
  }
}

function cargaDemo(): CargaEntregador {
  return {
    cargaId: "carga-1",
    cargaOrigemId: "origem-1",
    entregadorId: "entregador-1",
    nomeEntregador: "Entregador",
    dataOperacao: "2026-09-03",
    nomeArquivoOrigem: "teste.xlsx",
    criadaEm: "2026-09-03T10:00:00.000Z",
    chaveRemotaSimulada: "teste",
    pacotes: [
      {
        id: "pacote-1",
        entregador: "Entregador",
        codigoOriginal: "6082326246225",
        codigoNormalizado: "6082326246225",
        transportadora: { id: "ANJUN", nome: "Anjun", confianca: "ALTA" },
        precisaRevisao: false,
        entrega: criarEstadoEntregaPadrao(),
      },
    ],
  };
}

describe("Outbox idempotente", () => {
  it("salva primeiro no aparelho e so remove da fila apos aceite do Hub", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const outbox = new RepositorioOutboxIndexedDb(armazenamento);
    const cargas = new RepositorioCargaMemoria();
    const destino = new DestinoIdempotente();
    const operacoes = new ServicoOperacoesEntrega(outbox, cargas);
    let online = false;
    const sync = new ServicoSincronizacaoEntrega(outbox, cargas, destino, () => online);

    const carga = cargaDemo();
    await cargas.salvarCarga(carga.entregadorId, carga);
    const pacote = carga.pacotes[0];
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PROPRIO" });

    await operacoes.confirmarEntrega(carga, pacote);

    const filaAntes = await outbox.listar(carga.entregadorId);
    expect(filaAntes).toHaveLength(1);
    expect(filaAntes[0].operacaoId).toBeTruthy();
    expect(pacote.entrega?.estadoFisico).toBe("ENTREGUE");
    expect(pacote.entrega?.estadoIntegracao).toBe("AGUARDANDO_SINCRONIZACAO");

    const offline = await sync.sincronizarAgora(carga.entregadorId);
    expect(offline.online).toBe(false);
    expect(destino.chamadas).toHaveLength(0);
    expect(await outbox.listar(carga.entregadorId)).toHaveLength(1);

    online = true;
    const resultado = await sync.sincronizarAgora(carga.entregadorId);
    expect(resultado.processadas).toBe(1);
    expect(await outbox.listar(carga.entregadorId)).toHaveLength(0);

    const atualizada = await cargas.obterCargaAtual(carga.entregadorId);
    expect(atualizada?.pacotes[0].entrega?.estadoIntegracao).toBe("AGUARDANDO_INTEGRACAO");
  });

  it("reutiliza o mesmo UUID quando a mesma operacao precisa ser reenviada", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const outbox = new RepositorioOutboxIndexedDb(armazenamento);
    const cargas = new RepositorioCargaMemoria();
    const destino = new DestinoIdempotente();
    const operacoes = new ServicoOperacoesEntrega(outbox, cargas);
    const sync = new ServicoSincronizacaoEntrega(outbox, cargas, destino, () => true);

    const carga = cargaDemo();
    await cargas.salvarCarga(carga.entregadorId, carga);
    const pacote = carga.pacotes[0];
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PROPRIO" });
    await operacoes.confirmarEntrega(carga, pacote);

    const original = (await outbox.listar())[0];
    await sync.sincronizarAgora();

    // Simula uma confirmacao de rede perdida depois do servidor ter recebido o UUID.
    await outbox.salvar({ ...original, estado: "PENDENTE" });
    await sync.sincronizarAgora();

    expect(destino.chamadas).toEqual([original.operacaoId, original.operacaoId]);
    expect(await outbox.listar()).toHaveLength(0);
  });

  it("forca tentativa manual mesmo durante o backoff temporario", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const outbox = new RepositorioOutboxIndexedDb(armazenamento);
    const cargas = new RepositorioCargaMemoria();
    const destino = new DestinoIdempotente();
    const operacoes = new ServicoOperacoesEntrega(outbox, cargas);
    const sync = new ServicoSincronizacaoEntrega(outbox, cargas, destino, () => true);
    const carga = cargaDemo();
    await cargas.salvarCarga(carga.entregadorId, carga);
    const pacote = carga.pacotes[0];
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PROPRIO" });
    await operacoes.confirmarEntrega(carga, pacote);

    const item = (await outbox.listar())[0];
    await outbox.salvar({
      ...item,
      estado: "ERRO",
      proximaTentativaEm: "2999-01-01T00:00:00.000Z",
    });

    expect((await sync.sincronizarAgora()).processadas).toBe(0);
    expect(await outbox.listar()).toHaveLength(1);
    expect((await sync.sincronizarAgora(undefined, { forcarTentativa: true })).processadas).toBe(1);
    expect(await outbox.listar()).toHaveLength(0);
  });

  it("limpa a Outbox aceita pelo Hub mesmo se a projecao local falhar", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const outbox = new RepositorioOutboxIndexedDb(armazenamento);
    const base = new RepositorioCargaMemoria();
    const cargas = new RepositorioCargaComFalhaControlada(base);
    const destino = new DestinoIdempotente();
    const operacoes = new ServicoOperacoesEntrega(outbox, cargas);
    const sync = new ServicoSincronizacaoEntrega(outbox, cargas, destino, () => true);
    const carga = cargaDemo();
    await cargas.salvarCarga(carga.entregadorId, carga);
    const pacote = carga.pacotes[0];
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PROPRIO" });
    await operacoes.confirmarEntrega(carga, pacote);

    cargas.falharAoSalvar = true;
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const resultado = await sync.sincronizarAgora();

    expect(resultado.processadas).toBe(1);
    expect(await outbox.listar()).toHaveLength(0);
    expect(aviso).toHaveBeenCalledWith(
      expect.stringContaining("DH-SYNC-S03-PROJECAO"),
      expect.any(Error),
    );
    aviso.mockRestore();
  });

  it("bloqueia erros permanentes para nao reenviar em loop automatico", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const outbox = new RepositorioOutboxIndexedDb(armazenamento);
    const cargas = new RepositorioCargaMemoria();
    const chamadas: string[] = [];
    const destino: DestinoSincronizacaoEntrega = {
      async enviar(item) {
        chamadas.push(item.operacaoId);
        return { tipo: "ERRO_PERMANENTE", mensagem: "Operacao requer revisao." };
      },
    };
    const operacoes = new ServicoOperacoesEntrega(outbox, cargas);
    const sync = new ServicoSincronizacaoEntrega(outbox, cargas, destino, () => true);

    const carga = cargaDemo();
    await cargas.salvarCarga(carga.entregadorId, carga);
    const pacote = carga.pacotes[0];
    iniciarEntrega(pacote);
    definirRecebedor(pacote, { tipo: "PROPRIO" });
    await operacoes.confirmarEntrega(carga, pacote);

    await sync.sincronizarAgora();
    await sync.sincronizarAgora();

    expect(chamadas).toHaveLength(1);
    const fila = await outbox.listar();
    expect(fila).toHaveLength(1);
    expect(fila[0].estado).toBe("BLOQUEADO");

    const atualizada = await cargas.obterCargaAtual(carga.entregadorId);
    expect(atualizada?.pacotes[0].entrega?.estadoIntegracao).toBe("ERRO");
  });

  it("isola um HTTP 400 e continua enviando a proxima operacao", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const outbox = new RepositorioOutboxIndexedDb(armazenamento);
    const cargas = new RepositorioCargaMemoria();
    const carga = cargaDemo();
    const segundo = structuredClone(carga.pacotes[0]);
    segundo.id = "pacote-2";
    segundo.codigoNormalizado = "6082326468665";
    segundo.codigoOriginal = segundo.codigoNormalizado;
    segundo.entrega = criarEstadoEntregaPadrao();
    carga.pacotes.push(segundo);
    await cargas.salvarCarga(carga.entregadorId, carga);

    const operacoes = new ServicoOperacoesEntrega(outbox, cargas);
    for (const pacote of carga.pacotes) {
      iniciarEntrega(pacote);
      definirRecebedor(pacote, { tipo: "PROPRIO" });
      await operacoes.confirmarEntrega(carga, pacote);
    }

    const destino: DestinoSincronizacaoEntrega = {
      async enviar(item) {
        if (item.pacoteId === "pacote-1") {
          return { tipo: "ERRO_PERMANENTE", mensagem: "DH-SYNC-S02-HTTP" };
        }
        return { tipo: "RECEBIDA_PELO_HUB", processadaAntes: false };
      },
    };
    const sync = new ServicoSincronizacaoEntrega(outbox, cargas, destino, () => true);
    const resultado = await sync.sincronizarAgora();

    expect(resultado.processadas).toBe(1);
    const fila = await outbox.listar();
    expect(fila).toHaveLength(1);
    expect(fila[0].pacoteId).toBe("pacote-1");
    expect(fila[0].estado).toBe("BLOQUEADO");
  });

});

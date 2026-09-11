import { criarEstadoEntregaPadrao, definirRecebedor, iniciarEntrega } from "../../aplicacao/estado-entrega";
import { ServicoOperacoesEntrega } from "../../aplicacao/sincronizacao/servico-operacoes-entrega";
import { ServicoSincronizacaoEntrega } from "../../aplicacao/sincronizacao/servico-sincronizacao-entrega";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { TipoRecebedor } from "../../dominio/entrega/tipos";
import type { IdTransportadora, TransportadoraIdentificada } from "../../dominio/transportadora/tipos";
import { ArmazenamentoIndexedDb } from "../../infraestrutura/armazenamento/armazenamento-indexeddb";
import { RepositorioCargaLocalAdapter } from "../../infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { DestinoSincronizacaoLocal } from "../../infraestrutura/mock/destino-sincronizacao-local";
import { RepositorioOutboxIndexedDb } from "../../infraestrutura/outbox/repositorio-outbox-indexeddb";
import { SincronizadorAutomaticoOutbox } from "../../infraestrutura/outbox/sincronizador-automatico-outbox";
import type { ArmazenamentoChaveValor } from "../../infraestrutura/armazenamento/armazenamento-chave-valor";
import { ConectividadeHomologacaoControlavel } from "../../infraestrutura/homologacao/conectividade-homologacao-controlavel";

export interface ReferenciaOperacaoHomologacao {
  entregadorId: string;
  cargaId: string;
  pacoteId: string;
}

export interface EstadoOperacaoHomologacao {
  estadoFisico: string;
  estadoIntegracao: string;
  operacaoId?: string;
  fila: number;
  ultimoErro?: string;
}

export interface InicializacaoHomologacaoOutbox {
  referenciaPendente: ReferenciaOperacaoHomologacao | null;
  offlineSimulado: boolean;
}

export interface OpcoesHomologacaoOutbox {
  armazenamento?: ArmazenamentoChaveValor;
  iniciarSincronizacaoAutomatica?: boolean;
  agendar?: (acao: () => void, atrasoMs: number) => void;
}

function idTransportadora(nome: string): IdTransportadora {
  const normalizado = nome.toLowerCase();
  if (normalizado.includes("j&t")) return "JNT";
  if (normalizado.includes("anjun")) return "ANJUN";
  if (normalizado.includes("imile")) return "IMILE";
  return "OUTRA";
}

function tipoRecebedor(texto: string): TipoRecebedor {
  const normalizado = texto.toLowerCase();
  if (normalizado.includes("proprio")) return "PROPRIO";
  if (normalizado.includes("portaria")) return "PORTARIA";
  if (normalizado.includes("familiar")) return "FAMILIAR";
  if (normalizado.includes("vizinho")) return "VIZINHO";
  return "OUTRO";
}

export class HomologacaoOutbox {
  private readonly armazenamento: ArmazenamentoChaveValor;
  private readonly repositorioCargas: RepositorioCargaLocalAdapter;
  private readonly repositorioOutbox: RepositorioOutboxIndexedDb;
  private readonly operacoes: ServicoOperacoesEntrega;
  private readonly sincronizacao: ServicoSincronizacaoEntrega;
  private readonly conectividade: ConectividadeHomologacaoControlavel;
  private readonly automatico: SincronizadorAutomaticoOutbox;
  private readonly iniciarAutomatico: boolean;
  private readonly agendar: (acao: () => void, atrasoMs: number) => void;
  private pararAutomatico: (() => void) | null = null;

  constructor(opcoes: OpcoesHomologacaoOutbox = {}) {
    this.armazenamento = opcoes.armazenamento
      ?? new ArmazenamentoIndexedDb("delivery-hub-homologacao-v0461");
    this.repositorioCargas = new RepositorioCargaLocalAdapter(this.armazenamento);
    this.repositorioOutbox = new RepositorioOutboxIndexedDb(this.armazenamento);
    this.operacoes = new ServicoOperacoesEntrega(this.repositorioOutbox, this.repositorioCargas);
    this.conectividade = new ConectividadeHomologacaoControlavel(this.armazenamento);
    this.sincronizacao = new ServicoSincronizacaoEntrega(
      this.repositorioOutbox,
      this.repositorioCargas,
      new DestinoSincronizacaoLocal(),
      () => this.conectividade.estaOnline(),
    );
    this.automatico = new SincronizadorAutomaticoOutbox(this.sincronizacao, 5_000);
    this.iniciarAutomatico = opcoes.iniciarSincronizacaoAutomatica ?? true;
    this.agendar = opcoes.agendar
      ?? ((acao, atrasoMs) => { window.setTimeout(acao, atrasoMs); });
  }

  async iniciar(): Promise<InicializacaoHomologacaoOutbox> {
    await this.conectividade.iniciar();
    await this.sincronizacao.reconciliar("homologacao");
    const referenciaPendente = await this.obterReferenciaPendente();

    // Sem operação pendente não existe teste offline a recuperar. Isso evita
    // iniciar uma nova simulação em offline por uma configuração abandonada.
    if (!referenciaPendente && this.conectividade.estaOfflineSimulado()) {
      await this.conectividade.definirOfflineSimulado(false);
    }

    if (this.iniciarAutomatico && !this.pararAutomatico) {
      this.pararAutomatico = this.automatico.iniciar("homologacao");
    }

    return {
      referenciaPendente,
      offlineSimulado: this.conectividade.estaOfflineSimulado(),
    };
  }

  async concluir(input: {
    tracking: string;
    transportadora: string;
    recebedor: string;
    nome?: string;
    documento?: string;
  }): Promise<ReferenciaOperacaoHomologacao> {
    const agora = new Date().toISOString();
    const pacoteId = `hom-pacote-${crypto.randomUUID()}`;
    const cargaId = `hom-carga-${crypto.randomUUID()}`;
    const transportadora: TransportadoraIdentificada = {
      id: idTransportadora(input.transportadora),
      nome: input.transportadora,
      confianca: "ALTA",
    };
    const pacote: PacoteDaCarga = {
      id: pacoteId,
      entregador: "Homologacao",
      codigoOriginal: input.tracking,
      codigoNormalizado: input.tracking,
      transportadora,
      precisaRevisao: false,
      entrega: criarEstadoEntregaPadrao(),
    };
    const carga: CargaEntregador = {
      cargaId,
      cargaOrigemId: "homologacao-v040",
      entregadorId: "homologacao",
      nomeEntregador: "Homologacao",
      dataOperacao: agora.slice(0, 10),
      nomeArquivoOrigem: "homologacao",
      criadaEm: agora,
      pacotes: [pacote],
      chaveRemotaSimulada: `homologacao/${cargaId}`,
      status: "EM_OPERACAO",
    };

    iniciarEntrega(pacote);
    definirRecebedor(pacote, {
      tipo: tipoRecebedor(input.recebedor),
      nome: input.nome || undefined,
      documento: input.documento || undefined,
    });
    await this.repositorioCargas.salvarCarga(carga.entregadorId, carga);
    await this.operacoes.confirmarEntrega(carga, pacote);

    // Nao bloqueia o fechamento da entrega esperando rede. Quando online, o
    // processador tenta logo em seguida; offline, o evento `online` retomara.
    this.agendar(
      () => void this.sincronizacao.sincronizarAgora("homologacao"),
      350,
    );

    return { entregadorId: "homologacao", cargaId, pacoteId };
  }

  async obterEstado(referencia: ReferenciaOperacaoHomologacao): Promise<EstadoOperacaoHomologacao | null> {
    const cargas = await this.repositorioCargas.listarCargas(referencia.entregadorId);
    const carga = cargas.find((item) => item.cargaId === referencia.cargaId);
    const pacote = carga?.pacotes.find((item) => item.id === referencia.pacoteId);
    if (!pacote?.entrega) return null;
    const fila = await this.repositorioOutbox.listar(referencia.entregadorId);
    return {
      estadoFisico: pacote.entrega.estadoFisico,
      estadoIntegracao: pacote.entrega.estadoIntegracao,
      operacaoId: pacote.entrega.operacaoIntegracaoId,
      fila: fila.length,
      ultimoErro: pacote.entrega.ultimoErroIntegracao,
    };
  }

  async sincronizarAgora(): Promise<void> {
    await this.sincronizacao.sincronizarAgora("homologacao");
  }

  estaOfflineSimulado(): boolean {
    return this.conectividade.estaOfflineSimulado();
  }

  async definirOfflineSimulado(offline: boolean): Promise<void> {
    await this.conectividade.definirOfflineSimulado(offline);
  }

  async restaurarModoOnline(): Promise<void> {
    await this.conectividade.definirOfflineSimulado(false);
  }

  private async obterReferenciaPendente(): Promise<ReferenciaOperacaoHomologacao | null> {
    const fila = await this.repositorioOutbox.listar("homologacao");
    const item = fila[fila.length - 1];
    if (!item) return null;
    return {
      entregadorId: item.entregadorId,
      cargaId: item.cargaId,
      pacoteId: item.pacoteId,
    };
  }
}

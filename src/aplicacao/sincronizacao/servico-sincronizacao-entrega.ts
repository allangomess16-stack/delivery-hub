import {
  ErroTemporarioSincronizacao,
  type DestinoSincronizacaoEntrega,
} from "../portas/destino-sincronizacao-entrega";
import type { RepositorioCargaEntregador } from "../portas/repositorio-carga-entregador";
import type { RepositorioOutboxEntrega } from "../portas/repositorio-outbox-entrega";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { ItemOutboxEntrega } from "../../dominio/sincronizacao/tipos";
import { novoEventoEntrega, normalizarEstadoEntrega, obterEstadoEntrega } from "../estado-entrega";
import { CODIGOS_ERRO } from "../../dominio/diagnostico/codigos-erro";

export interface ResultadoProcessamentoOutbox {
  processadas: number;
  restantes: number;
  online: boolean;
}

export interface OpcoesSincronizacaoOutbox {
  /** Ação explícita do entregador: ignora apenas espera temporária/backoff. */
  forcarTentativa?: boolean;
}

function proximoAtrasoMs(tentativas: number): number {
  const atrasos = [5_000, 30_000, 120_000, 600_000, 1_800_000];
  return atrasos[Math.min(Math.max(0, tentativas - 1), atrasos.length - 1)];
}

function podeTentar(item: ItemOutboxEntrega, agora: number, forcarTentativa = false): boolean {
  if (item.estado === "BLOQUEADO") return false;
  if (forcarTentativa) return true;

  if (item.estado === "PROCESSANDO") {
    // Se o app caiu no meio do envio, nao podemos deixar a operacao travada
    // para sempre. Depois de 60 s ela volta a ser elegivel para reenvio.
    const atualizadoEm = new Date(item.atualizadoEm).getTime();
    return Number.isFinite(atualizadoEm) && atualizadoEm <= agora - 60_000;
  }
  if (!item.proximaTentativaEm) return true;
  return new Date(item.proximaTentativaEm).getTime() <= agora;
}

export class ServicoSincronizacaoEntrega {
  private processamentoAtual: Promise<ResultadoProcessamentoOutbox> | null = null;
  private ouvintes = new Set<() => void>();

  constructor(
    private readonly repositorioOutbox: RepositorioOutboxEntrega,
    private readonly repositorioCargas: RepositorioCargaEntregador,
    private readonly destino: DestinoSincronizacaoEntrega,
    private readonly estaOnline: () => boolean,
  ) {}

  assinar(ouvinte: () => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  private notificar(): void {
    for (const ouvinte of this.ouvintes) ouvinte();
  }

  async listarFila(entregadorId?: string): Promise<ItemOutboxEntrega[]> {
    return this.repositorioOutbox.listar(entregadorId);
  }

  async reconciliar(entregadorId?: string): Promise<void> {
    const itens = await this.repositorioOutbox.listar(entregadorId);
    if (!itens.length) return;

    const porEntregador = new Map<string, ItemOutboxEntrega[]>();
    for (const item of itens) {
      const grupo = porEntregador.get(item.entregadorId) ?? [];
      grupo.push(item);
      porEntregador.set(item.entregadorId, grupo);
    }

    for (const [id, grupo] of porEntregador) {
      const cargas = await this.repositorioCargas.listarCargas(id);
      let alterou = false;

      for (const item of grupo) {
        const carga = cargas.find((candidata) => candidata.cargaId === item.cargaId);
        const pacote = carga?.pacotes.find((candidato) => candidato.id === item.pacoteId);
        if (!carga || !pacote) continue;

        const atual = pacote.entrega ? normalizarEstadoEntrega(pacote.entrega) : null;
        if (atual?.operacaoIntegracaoId === item.operacaoId) continue;
        if (
          atual?.operacaoIntegracaoId &&
          atual.operacaoIntegracaoId !== item.operacaoId
        ) {
          // Existe uma operacao local mais nova; uma entrada antiga da fila nao
          // pode retroceder o estado fisico durante a recuperacao.
          continue;
        }

        pacote.entrega = structuredClone(item.payload.entrega);
        alterou = true;
      }

      if (alterou) {
        for (const carga of cargas) {
          await this.repositorioCargas.salvarCarga(id, carga);
        }
      }
    }
  }

  private async localizarPacote(item: ItemOutboxEntrega): Promise<{
    carga: CargaEntregador;
    pacote: PacoteDaCarga;
  } | null> {
    const cargas = await this.repositorioCargas.listarCargas(item.entregadorId);
    const carga = cargas.find((candidata) => candidata.cargaId === item.cargaId);
    const pacote = carga?.pacotes.find((candidato) => candidato.id === item.pacoteId);
    return carga && pacote ? { carga, pacote } : null;
  }

  private async atualizarEstadoPacote(
    item: ItemOutboxEntrega,
    estado: "SINCRONIZANDO" | "AGUARDANDO_INTEGRACAO" | "CONFIRMADA" | "ERRO" | "ACAO_MANUAL",
    mensagem?: string,
  ): Promise<void> {
    const localizado = await this.localizarPacote(item);
    if (!localizado) return;

    const entrega = obterEstadoEntrega(localizado.pacote);
    entrega.estadoIntegracao = estado;
    entrega.operacaoIntegracaoId = item.operacaoId;

    if (estado === "SINCRONIZANDO") {
      entrega.eventos.push(
        novoEventoEntrega("SINCRONIZACAO_INICIADA", `Enviando operacao ${item.operacaoId}.`),
      );
    } else if (estado === "AGUARDANDO_INTEGRACAO") {
      entrega.sincronizadaEm = new Date().toISOString();
      entrega.ultimoErroIntegracao = undefined;
      entrega.eventos.push(
        novoEventoEntrega(
          "SINCRONIZACAO_CONFIRMADA",
          "Operacao recebida pelo Delivery Hub. Aguardando integracao com a transportadora.",
        ),
      );
    } else if (estado === "CONFIRMADA") {
      entrega.sincronizadaEm ??= new Date().toISOString();
      entrega.confirmadaTransportadoraEm = new Date().toISOString();
      entrega.ultimoErroIntegracao = undefined;
      entrega.eventos.push(
        novoEventoEntrega("INTEGRACAO_CONFIRMADA", "Baixa confirmada na transportadora."),
      );
    } else if (estado === "ACAO_MANUAL") {
      entrega.ultimoErroIntegracao = mensagem;
      entrega.eventos.push(
        novoEventoEntrega("ACAO_MANUAL_EXIGIDA", mensagem ?? "A operacao exige acao manual."),
      );
    } else {
      entrega.ultimoErroIntegracao = mensagem;
      entrega.eventos.push(
        novoEventoEntrega("SINCRONIZACAO_FALHOU", mensagem ?? "Falha de sincronizacao."),
      );
    }

    await this.repositorioCargas.salvarCarga(item.entregadorId, localizado.carga);
  }

  private async atualizarEstadoPacoteSeguro(
    item: ItemOutboxEntrega,
    estado: "SINCRONIZANDO" | "AGUARDANDO_INTEGRACAO" | "CONFIRMADA" | "ERRO" | "ACAO_MANUAL",
    mensagem?: string,
  ): Promise<void> {
    try {
      await this.atualizarEstadoPacote(item, estado, mensagem);
    } catch (erro) {
      // A carga local pode ser reconstruída pela operação remota. Uma falha de
      // projeção visual não pode impedir o envio ou manter a Outbox presa.
      console.warn(`${CODIGOS_ERRO.PROJECAO_LOCAL}: falha ao atualizar a projecao local.`, erro);
    }
  }

  async sincronizarAgora(
    entregadorId?: string,
    opcoes: OpcoesSincronizacaoOutbox = {},
  ): Promise<ResultadoProcessamentoOutbox> {
    if (this.processamentoAtual) {
      const resultadoAtual = await this.processamentoAtual;
      if (opcoes.forcarTentativa) {
        return this.sincronizarAgora(entregadorId, opcoes);
      }
      return resultadoAtual;
    }

    const processamento = this.executarSincronizacao(entregadorId, opcoes);
    this.processamentoAtual = processamento;

    try {
      return await processamento;
    } finally {
      if (this.processamentoAtual === processamento) this.processamentoAtual = null;
    }
  }

  private async executarSincronizacao(
    entregadorId: string | undefined,
    opcoes: OpcoesSincronizacaoOutbox,
  ): Promise<ResultadoProcessamentoOutbox> {
    if (!this.estaOnline()) {
      const restantes = (await this.repositorioOutbox.listar(entregadorId)).length;
      return { processadas: 0, restantes, online: false };
    }

    let processadas = 0;

    const agora = Date.now();
    const itens = (await this.repositorioOutbox.listar(entregadorId)).filter((item) =>
      podeTentar(item, agora, opcoes.forcarTentativa === true),
    );

    for (const item of itens) {
        const emProcessamento: ItemOutboxEntrega = {
          ...item,
          estado: "PROCESSANDO",
          tentativas: item.tentativas + 1,
          atualizadoEm: new Date().toISOString(),
          ultimoErro: undefined,
          proximaTentativaEm: undefined,
        };
        await this.repositorioOutbox.salvar(emProcessamento);
        await this.atualizarEstadoPacoteSeguro(emProcessamento, "SINCRONIZANDO");
        this.notificar();

        try {
          const resultado = await this.destino.enviar(emProcessamento);

          if (resultado.tipo === "RECEBIDA_PELO_HUB") {
            // O aceite remoto é a fonte de verdade. Limpar primeiro a Outbox
            // impede que uma falha posterior de UI/cache deixe o item preso.
            await this.repositorioOutbox.remover(emProcessamento.operacaoId);
            await this.atualizarEstadoPacoteSeguro(emProcessamento, "AGUARDANDO_INTEGRACAO");
            processadas += 1;
          } else if (resultado.tipo === "CONFIRMADA_TRANSPORTADORA") {
            await this.repositorioOutbox.remover(emProcessamento.operacaoId);
            await this.atualizarEstadoPacoteSeguro(emProcessamento, "CONFIRMADA");
            processadas += 1;
          } else if (resultado.tipo === "ACAO_MANUAL") {
            const bloqueado: ItemOutboxEntrega = {
              ...emProcessamento,
              estado: "BLOQUEADO",
              atualizadoEm: new Date().toISOString(),
              ultimoErro: resultado.mensagem,
              proximaTentativaEm: undefined,
            };
            await this.repositorioOutbox.salvar(bloqueado);
            await this.atualizarEstadoPacoteSeguro(bloqueado, "ACAO_MANUAL", resultado.mensagem);
          } else {
            const bloqueado: ItemOutboxEntrega = {
              ...emProcessamento,
              estado: "BLOQUEADO",
              atualizadoEm: new Date().toISOString(),
              ultimoErro: resultado.mensagem,
              proximaTentativaEm: undefined,
            };
            await this.repositorioOutbox.salvar(bloqueado);
            await this.atualizarEstadoPacoteSeguro(bloqueado, "ERRO", resultado.mensagem);
          }
        } catch (erro) {
          const mensagem = erro instanceof Error ? erro.message : "Falha temporaria de sincronizacao.";
          const tentativas = emProcessamento.tentativas;
          const atrasoSugerido = erro instanceof ErroTemporarioSincronizacao
            ? erro.tentarNovamenteAposMs ?? 0
            : 0;
          const atraso = Math.max(proximoAtrasoMs(tentativas), atrasoSugerido);
          const comErro: ItemOutboxEntrega = {
            ...emProcessamento,
            estado: "ERRO",
            atualizadoEm: new Date().toISOString(),
            ultimoErro: mensagem,
            proximaTentativaEm: new Date(Date.now() + atraso).toISOString(),
          };
          await this.repositorioOutbox.salvar(comErro);
          await this.atualizarEstadoPacoteSeguro(comErro, "ERRO", mensagem);
        }

        this.notificar();
    }

    const restantes = (await this.repositorioOutbox.listar(entregadorId)).length;
    return { processadas, restantes, online: true };
  }
}

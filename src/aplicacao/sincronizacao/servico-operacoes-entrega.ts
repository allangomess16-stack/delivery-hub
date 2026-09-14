import type { RepositorioCargaEntregador } from "../portas/repositorio-carga-entregador";
import type { RepositorioOutboxEntrega } from "../portas/repositorio-outbox-entrega";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { MotivoNaoEntrega } from "../../dominio/entrega/tipos";
import type { ItemOutboxEntrega, TipoOperacaoOutboxEntrega } from "../../dominio/sincronizacao/tipos";
import {
  confirmarEntrega as confirmarEntregaDominio,
  desfazerUltimaConclusao as desfazerDominio,
  marcarNaoEntregue as marcarNaoEntregueDominio,
  novoEventoEntrega,
  obterEstadoEntrega,
} from "../estado-entrega";

function criarItemOutbox(
  carga: CargaEntregador,
  pacote: PacoteDaCarga,
  tipo: TipoOperacaoOutboxEntrega,
): ItemOutboxEntrega {
  const agora = new Date().toISOString();
  const entrega = obterEstadoEntrega(pacote);
  const operacaoId = crypto.randomUUID();

  entrega.operacaoIntegracaoId = operacaoId;
  entrega.estadoIntegracao = "AGUARDANDO_SINCRONIZACAO";
  entrega.eventos.push(
    novoEventoEntrega(
      "SINCRONIZACAO_ENFILEIRADA",
      `Operacao ${operacaoId} salva na fila offline.`,
    ),
  );

  return {
    operacaoId,
    tipo,
    estado: "PENDENTE",
    entregadorId: carga.entregadorId,
    cargaId: carga.cargaId,
    pacoteId: pacote.id,
    tracking: pacote.codigoNormalizado,
    transportadoraId: pacote.transportadora.id,
    criadoEm: agora,
    atualizadoEm: agora,
    tentativas: 0,
    payload: {
      entrega: structuredClone(entrega),
      contextoOperacional: pacote.situacaoOperacional,
      alertaAdmin: pacote.alertaAdmin === true,
    },
  };
}

export class ServicoOperacoesEntrega {
  constructor(
    private readonly repositorioOutbox: RepositorioOutboxEntrega,
    private readonly repositorioCargas: RepositorioCargaEntregador,
  ) {}

  private async persistirConclusao(
    carga: CargaEntregador,
    pacote: PacoteDaCarga,
    tipo: TipoOperacaoOutboxEntrega,
    estadoAnterior: PacoteDaCarga["entrega"],
  ): Promise<void> {
    const item = criarItemOutbox(carga, pacote, tipo);

    try {
      // A fila e gravada antes da carga. Se o processo for interrompido entre
      // as duas gravacoes, a reconciliacao da V0.4.0 consegue restaurar a
      // conclusao a partir do payload imutavel da Outbox.
      await this.repositorioOutbox.salvar(item);
      await this.repositorioCargas.salvarCarga(carga.entregadorId, carga);
    } catch (erro) {
      pacote.entrega = estadoAnterior ? structuredClone(estadoAnterior) : undefined;
      await this.repositorioOutbox.remover(item.operacaoId).catch(() => undefined);
      throw erro;
    }
  }

  async confirmarEntrega(
    carga: CargaEntregador,
    pacote: PacoteDaCarga,
  ): Promise<void> {
    const anterior = pacote.entrega ? structuredClone(pacote.entrega) : undefined;
    confirmarEntregaDominio(pacote);
    await this.persistirConclusao(carga, pacote, "ENTREGA_CONFIRMADA", anterior);
  }

  async marcarNaoEntregue(
    carga: CargaEntregador,
    pacote: PacoteDaCarga,
    motivo: MotivoNaoEntrega,
  ): Promise<void> {
    const anterior = pacote.entrega ? structuredClone(pacote.entrega) : undefined;
    marcarNaoEntregueDominio(pacote, motivo);
    await this.persistirConclusao(carga, pacote, "NAO_ENTREGUE", anterior);
  }

  async desfazerUltimaConclusao(
    carga: CargaEntregador,
    pacote: PacoteDaCarga,
  ): Promise<void> {
    const entrega = obterEstadoEntrega(pacote);
    const operacaoId = entrega.operacaoIntegracaoId;

    // Somente uma operacao que ainda nao saiu do aparelho pode ser retirada
    // silenciosamente da fila. Depois do recebimento pelo Hub, o fluxo correto
    // sera uma operacao de correcao/auditoria.
    if (operacaoId) {
      const item = await this.repositorioOutbox.obter(operacaoId);
      if (!item) {
        throw new Error("A operacao ja saiu do aparelho. Use o fluxo de correcao.");
      }
      if (item.estado === "PROCESSANDO") {
        throw new Error("A sincronizacao ja esta em andamento. Aguarde a conclusao.");
      }
      await this.repositorioOutbox.remover(operacaoId);
    }

    desfazerDominio(pacote);
    await this.repositorioCargas.salvarCarga(carga.entregadorId, carga);
  }
}

import type {
  RegistroTelemetriaIntegracao,
  RepositorioTelemetriaIntegracao,
} from "../../aplicacao/portas/repositorio-telemetria-integracao";
import type { EventoTelemetriaIntegracao } from "../../dominio/integracao/telemetria-integracao";
import type { ArmazenamentoChaveValor } from "../armazenamento/armazenamento-chave-valor";
import { ErroHttpFirebaseRest } from "../firebase/cliente-realtime-rest";

const PREFIXO = "telemetria-integracao-outbox/";
const MAX_ITENS = 200;
const MAX_TENTATIVAS = 6;

interface ItemTelemetriaPendente {
  evento: EventoTelemetriaIntegracao;
  tentativas: number;
  proximaTentativaEm: number;
  estado: "PENDENTE" | "BLOQUEADO";
}

function chave(eventoId: string): string {
  return `${PREFIXO}${eventoId}`;
}

function atraso(tentativas: number): number {
  return Math.min(15 * 60_000, 5_000 * 2 ** Math.max(0, tentativas - 1));
}

function falhaPermanente(erro: unknown): boolean {
  return erro instanceof ErroHttpFirebaseRest && erro.status >= 400 && erro.status < 500 &&
    erro.status !== 401 && erro.status !== 408 && erro.status !== 429;
}

/**
 * Fila de baixa prioridade e isolada da Outbox operacional. Nunca altera
 * entrega/carga e limita o armazenamento local para evitar crescimento sem fim.
 */
export class RepositorioTelemetriaIntegracaoComFila
implements RepositorioTelemetriaIntegracao {
  private sincronizando: Promise<void> | null = null;

  constructor(
    private readonly armazenamento: ArmazenamentoChaveValor,
    private readonly remoto: RepositorioTelemetriaIntegracao,
    private readonly agora: () => number = Date.now,
  ) {}

  async registrar(evento: EventoTelemetriaIntegracao): Promise<void> {
    await this.armazenamento.salvar<ItemTelemetriaPendente>(chave(evento.eventoId), {
      evento,
      tentativas: 0,
      proximaTentativaEm: 0,
      estado: "PENDENTE",
    });
    await this.limitarFila();
    void this.sincronizarPendentes();
  }

  listarDia(dia: string): Promise<RegistroTelemetriaIntegracao[]> {
    return this.remoto.listarDia(dia);
  }

  iniciar(): void {
    const tentar = () => void this.sincronizarPendentes();
    window.addEventListener("online", tentar);
    window.addEventListener("focus", tentar);
    window.setTimeout(tentar, 2_000);
  }

  sincronizarPendentes(): Promise<void> {
    if (this.sincronizando) return this.sincronizando;
    this.sincronizando = this.executarSincronizacao().finally(() => {
      this.sincronizando = null;
    });
    return this.sincronizando;
  }

  private async executarSincronizacao(): Promise<void> {
    const itens = await this.armazenamento.listar<ItemTelemetriaPendente>(PREFIXO);
    for (const item of itens) {
      const atual = item.valor;
      if (atual.estado === "BLOQUEADO" || atual.proximaTentativaEm > this.agora()) continue;
      try {
        await this.remoto.registrar(atual.evento);
        await this.armazenamento.remover(item.chave);
      } catch (erro) {
        const tentativas = atual.tentativas + 1;
        await this.armazenamento.salvar<ItemTelemetriaPendente>(item.chave, {
          ...atual,
          tentativas,
          estado: falhaPermanente(erro) || tentativas >= MAX_TENTATIVAS
            ? "BLOQUEADO"
            : "PENDENTE",
          proximaTentativaEm: this.agora() + atraso(tentativas),
        });
      }
    }
  }

  private async limitarFila(): Promise<void> {
    const itens = await this.armazenamento.listar<ItemTelemetriaPendente>(PREFIXO);
    if (itens.length <= MAX_ITENS) return;
    const excedentes = itens
      .sort((a, b) => a.valor.evento.ocorridoEm.localeCompare(b.valor.evento.ocorridoEm))
      .slice(0, itens.length - MAX_ITENS);
    for (const item of excedentes) await this.armazenamento.remover(item.chave);
  }
}

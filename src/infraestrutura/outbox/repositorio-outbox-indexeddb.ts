import type { RepositorioOutboxEntrega } from "../../aplicacao/portas/repositorio-outbox-entrega";
import type { ItemOutboxEntrega } from "../../dominio/sincronizacao/tipos";
import type { ArmazenamentoChaveValor } from "../armazenamento/armazenamento-chave-valor";

const PREFIXO = "outbox/entregas/";

function chave(operacaoId: string): string {
  return `${PREFIXO}${operacaoId}`;
}

export class RepositorioOutboxIndexedDb implements RepositorioOutboxEntrega {
  constructor(private readonly armazenamento: ArmazenamentoChaveValor) {}

  salvar(item: ItemOutboxEntrega): Promise<void> {
    return this.armazenamento.salvar(chave(item.operacaoId), item);
  }

  obter(operacaoId: string): Promise<ItemOutboxEntrega | null> {
    return this.armazenamento.obter<ItemOutboxEntrega>(chave(operacaoId));
  }

  async listar(entregadorId?: string): Promise<ItemOutboxEntrega[]> {
    const itens = await this.armazenamento.listar<ItemOutboxEntrega>(PREFIXO);
    return itens
      .map((item) => item.valor)
      .filter((item) => !entregadorId || item.entregadorId === entregadorId)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  }

  remover(operacaoId: string): Promise<void> {
    return this.armazenamento.remover(chave(operacaoId));
  }
}

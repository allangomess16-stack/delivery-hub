import type { ItemOutboxEntrega } from "../../dominio/sincronizacao/tipos";

export interface RepositorioOutboxEntrega {
  salvar(item: ItemOutboxEntrega): Promise<void>;
  obter(operacaoId: string): Promise<ItemOutboxEntrega | null>;
  listar(entregadorId?: string): Promise<ItemOutboxEntrega[]>;
  remover(operacaoId: string): Promise<void>;
}

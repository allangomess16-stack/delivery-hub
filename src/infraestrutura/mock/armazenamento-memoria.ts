import type { ArmazenamentoChaveValor } from "../armazenamento/armazenamento-chave-valor";

export class ArmazenamentoMemoria implements ArmazenamentoChaveValor {
  private readonly dados = new Map<string, unknown>();

  async salvar<T>(chave: string, valor: T): Promise<void> {
    this.dados.set(chave, structuredClone(valor));
  }

  async obter<T>(chave: string): Promise<T | null> {
    const valor = this.dados.get(chave);
    return valor === undefined ? null : structuredClone(valor as T);
  }

  async listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>> {
    return [...this.dados.entries()]
      .filter(([chave]) => chave.startsWith(prefixo))
      .map(([chave, valor]) => ({ chave, valor: structuredClone(valor as T) }));
  }

  async remover(chave: string): Promise<void> {
    this.dados.delete(chave);
  }
}

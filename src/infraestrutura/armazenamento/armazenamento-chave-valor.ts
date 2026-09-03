export interface ArmazenamentoChaveValor {
  salvar<T>(chave: string, valor: T): Promise<void>;
  obter<T>(chave: string): Promise<T | null>;
  listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>>;
  remover(chave: string): Promise<void>;
}

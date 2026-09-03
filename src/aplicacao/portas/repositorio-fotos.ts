export interface ResultadoFotoSalva {
  chave: string;
  tamanhoBytes: number;
  largura?: number;
  altura?: number;
}

export interface RepositorioFotos {
  salvar(arquivo: File): Promise<ResultadoFotoSalva>;
  obterUrl(chave: string): Promise<string | null>;
  remover(chave: string): Promise<void>;
}

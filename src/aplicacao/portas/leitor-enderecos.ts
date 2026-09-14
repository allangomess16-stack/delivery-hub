export interface RegistroEnderecoImportado {
  codigo: string;
  endereco: string;
  regiao?: string;
}

export interface LeitorEnderecos {
  ler(arquivo: File): Promise<RegistroEnderecoImportado[]>;
}

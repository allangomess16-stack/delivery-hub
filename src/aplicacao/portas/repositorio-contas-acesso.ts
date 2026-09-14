import type { ContaAcessoEntregador } from "../../dominio/identidade/tipos";

export interface DadosSalvarContaAcesso {
  entregadorId: string;
  email: string;
  nome: string;
  ativo: boolean;
  /** Obrigatoria na criacao; opcional na edicao para manter a senha atual. */
  senhaNova?: string;
}

export interface RepositorioContasAcesso {
  listar(): Promise<ContaAcessoEntregador[]>;
  obterPorEntregadorId(entregadorId: string): Promise<ContaAcessoEntregador | null>;
  salvar(dados: DadosSalvarContaAcesso): Promise<ContaAcessoEntregador>;
  excluirPorEntregadorId(entregadorId: string): Promise<void>;
}

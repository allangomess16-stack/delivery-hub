import type { UsuarioAtual } from "../../dominio/identidade/tipos";

export interface ServicoAutenticacao {
  obterUsuarioAtual(): Promise<UsuarioAtual | null>;
  entrar(email: string, senha: string): Promise<UsuarioAtual>;
  /** Envia um fluxo seguro; o Admin nunca lê nem define a senha atual. */
  solicitarRedefinicaoSenha(email: string): Promise<void>;
  sair(): Promise<void>;
}

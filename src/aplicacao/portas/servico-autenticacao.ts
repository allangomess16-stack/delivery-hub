import type { UsuarioAtual } from "../../dominio/identidade/tipos";

export interface ServicoAutenticacao {
  obterUsuarioAtual(): Promise<UsuarioAtual | null>;
  entrar(email: string, senha: string): Promise<UsuarioAtual>;
  sair(): Promise<void>;
}

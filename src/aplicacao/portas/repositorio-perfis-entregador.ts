import type { PerfilEntregador } from "../../dominio/identidade/tipos";

export interface RepositorioPerfisEntregador {
  listar(): Promise<PerfilEntregador[]>;
  obter(entregadorId: string): Promise<PerfilEntregador | null>;
  salvar(perfil: PerfilEntregador): Promise<void>;
  excluir(entregadorId: string): Promise<void>;
  adicionarAlias(entregadorId: string, alias: string): Promise<PerfilEntregador>;
  removerAlias(entregadorId: string, alias: string): Promise<PerfilEntregador>;
  definirAtivo(entregadorId: string, ativo: boolean): Promise<PerfilEntregador>;
}

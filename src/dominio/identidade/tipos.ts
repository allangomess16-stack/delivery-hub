export type TipoPerfil = "ADMIN" | "SUPORTE" | "ENTREGADOR";

export interface UsuarioAtual {
  usuarioId: string;
  email: string;
  nome: string;
  tipo: TipoPerfil;
  entregadorId?: string;
}

export interface PerfilEntregador {
  entregadorId: string;
  nomeOficial: string;
  ativo: boolean;
  excelAliases: string[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface VinculoColunaExcel {
  id: string;
  aliasOriginal: string;
  aliasNormalizado: string;
  entregadorId: string;
  confirmadoEm: string;
  confirmadoPorUsuarioId: string;
}


export interface ContaAcessoEntregador {
  usuarioId: string;
  entregadorId: string;
  email: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

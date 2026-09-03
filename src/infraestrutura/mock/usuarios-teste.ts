import type { UsuarioAtual } from "../../dominio/identidade/tipos";

export interface UsuarioTeste {
  email: string;
  senha: string;
  usuario: UsuarioAtual;
}

/** SOMENTE DESENVOLVIMENTO. Nunca reutilizar em producao. */
export const USUARIO_ADMIN_TESTE: UsuarioTeste = {
  email: "admin@deliveryhub.local",
  senha: "admin123",
  usuario: {
    usuarioId: "DEV-ADMIN-001",
    email: "admin@deliveryhub.local",
    nome: "Administrador Local",
    tipo: "ADMIN",
  },
};

/** Perfil inicial para smoke test. Novos entregadores usam contas cadastradas pelo Admin. */
export const USUARIO_ENTREGADOR_TESTE: UsuarioTeste = {
  email: "entregador@deliveryhub.local",
  senha: "entrega123",
  usuario: {
    usuarioId: "DEV-ENTREGADOR-001",
    email: "entregador@deliveryhub.local",
    nome: "Entregador Teste",
    tipo: "ENTREGADOR",
    entregadorId: "ENT-TESTE",
  },
};

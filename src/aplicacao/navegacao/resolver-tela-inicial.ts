import type { UsuarioAtual } from "../../dominio/identidade/tipos";

export type DestinoInicial =
  | "LOGIN"
  | "ADMIN_IMPORTAR"
  | "ENTREGADOR_RESUMO"
  | "PERFIL_SEM_VINCULO";

export function resolverTelaInicial(usuario: UsuarioAtual | null): DestinoInicial {
  if (!usuario) return "LOGIN";
  if (usuario.tipo === "ADMIN") return "ADMIN_IMPORTAR";
  if (!usuario.entregadorId) return "PERFIL_SEM_VINCULO";
  return "ENTREGADOR_RESUMO";
}

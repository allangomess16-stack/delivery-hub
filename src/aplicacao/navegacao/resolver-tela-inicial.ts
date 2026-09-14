import type { UsuarioAtual } from "../../dominio/identidade/tipos";

export type DestinoInicial =
  | "LOGIN"
  | "ADMIN_IMPORTAR"
  | "SUPORTE_INTEGRACOES"
  | "ENTREGADOR_LOBBY"
  | "PERFIL_SEM_VINCULO";

export function resolverTelaInicial(usuario: UsuarioAtual | null): DestinoInicial {
  if (!usuario) return "LOGIN";
  if (usuario.tipo === "ADMIN") return "ADMIN_IMPORTAR";
  if (usuario.tipo === "SUPORTE") return "SUPORTE_INTEGRACOES";
  if (!usuario.entregadorId) return "PERFIL_SEM_VINCULO";
  return "ENTREGADOR_LOBBY";
}

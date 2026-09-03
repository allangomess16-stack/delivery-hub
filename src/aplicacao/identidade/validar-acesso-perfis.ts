import type { RepositorioContasAcesso } from "../portas/repositorio-contas-acesso";
import type { PerfilEncontrado } from "./conciliar-perfis-planilha";

export async function listarPerfisSemContaAtiva(
  encontrados: PerfilEncontrado[],
  repositorioContas: RepositorioContasAcesso,
): Promise<string[]> {
  const ids = [...new Set(encontrados.map((item) => item.entregadorId))];
  const faltantes: string[] = [];

  for (const entregadorId of ids) {
    const conta = await repositorioContas.obterPorEntregadorId(entregadorId);
    if (!conta?.ativo) faltantes.push(entregadorId);
  }

  return faltantes;
}

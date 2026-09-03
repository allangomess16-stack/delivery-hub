import type { RepositorioContasAcesso } from "../portas/repositorio-contas-acesso";
import type { RepositorioPerfisEntregador } from "../portas/repositorio-perfis-entregador";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";

export interface EntradaSalvarPerfilComAcesso {
  perfil: PerfilEntregador;
  email: string;
  senhaNova?: string;
}

export async function salvarPerfilComAcesso(
  entrada: EntradaSalvarPerfilComAcesso,
  repositorioPerfis: RepositorioPerfisEntregador,
  repositorioContas: RepositorioContasAcesso,
): Promise<void> {
  const email = entrada.email.trim().toLowerCase();
  if (!email) throw new Error("Informe o email de acesso do entregador.");

  const perfilAnterior = await repositorioPerfis.obter(entrada.perfil.entregadorId);
  const contaAnterior = await repositorioContas.obterPorEntregadorId(entrada.perfil.entregadorId);

  if (!contaAnterior && (!entrada.senhaNova || entrada.senhaNova.length < 6)) {
    throw new Error("Informe uma senha inicial com pelo menos 6 caracteres.");
  }
  if (entrada.senhaNova && entrada.senhaNova.length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
  }

  await repositorioPerfis.salvar(entrada.perfil);

  try {
    await repositorioContas.salvar({
      entregadorId: entrada.perfil.entregadorId,
      email,
      nome: entrada.perfil.nomeOficial,
      ativo: entrada.perfil.ativo,
      senhaNova: entrada.senhaNova || undefined,
    });
  } catch (erro) {
    if (perfilAnterior) await repositorioPerfis.salvar(perfilAnterior);
    else await repositorioPerfis.excluir(entrada.perfil.entregadorId);
    throw erro;
  }
}

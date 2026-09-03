import type { RepositorioContasAcesso } from "../../aplicacao/portas/repositorio-contas-acesso";
import type { RepositorioPerfisEntregador } from "../../aplicacao/portas/repositorio-perfis-entregador";

export async function prepararDadosTeste(
  repositorioPerfis: RepositorioPerfisEntregador,
  repositorioContas: RepositorioContasAcesso,
): Promise<void> {
  const agora = new Date().toISOString();

  if (!(await repositorioPerfis.obter("ENT-TESTE"))) {
    await repositorioPerfis.salvar({
      entregadorId: "ENT-TESTE",
      nomeOficial: "Entregador Teste",
      ativo: true,
      excelAliases: ["ENTREGADOR TESTE", "TESTE"],
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  try {
    if (!(await repositorioContas.obterPorEntregadorId("ENT-TESTE"))) {
      await repositorioContas.salvar({
        entregadorId: "ENT-TESTE",
        email: "entregador@deliveryhub.local",
        nome: "Entregador Teste",
        ativo: true,
        senhaNova: "entrega123",
      });
    }
  } catch (erro) {
    // O modo npm run dev nao possui a API compartilhada. Nao bloquear a UI.
    console.warn("Conta ENT-TESTE nao foi sincronizada com o servidor local.", erro);
  }
}

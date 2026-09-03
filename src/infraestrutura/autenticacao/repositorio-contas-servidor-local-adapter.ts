import type {
  DadosSalvarContaAcesso,
  RepositorioContasAcesso,
} from "../../aplicacao/portas/repositorio-contas-acesso";
import type { ContaAcessoEntregador } from "../../dominio/identidade/tipos";

interface RespostaConta {
  ok: boolean;
  conta?: ContaAcessoEntregador;
  contas?: ContaAcessoEntregador[];
  erro?: string;
}

async function lerErro(resposta: Response, padrao: string): Promise<string> {
  try {
    const dados = (await resposta.json()) as RespostaConta;
    return dados.erro || padrao;
  } catch {
    return padrao;
  }
}

export class RepositorioContasServidorLocalAdapter implements RepositorioContasAcesso {
  async listar(): Promise<ContaAcessoEntregador[]> {
    const resposta = await fetch("/api/accounts", { cache: "no-store" });
    if (!resposta.ok) throw new Error(await lerErro(resposta, "Nao foi possivel listar contas de acesso."));
    const dados = (await resposta.json()) as RespostaConta;
    return dados.contas ?? [];
  }

  async obterPorEntregadorId(entregadorId: string): Promise<ContaAcessoEntregador | null> {
    const resposta = await fetch(`/api/accounts?courierId=${encodeURIComponent(entregadorId)}`, {
      cache: "no-store",
    });
    if (resposta.status === 404) return null;
    if (!resposta.ok) throw new Error(await lerErro(resposta, "Nao foi possivel consultar a conta de acesso."));
    const dados = (await resposta.json()) as RespostaConta;
    return dados.conta ?? null;
  }

  async salvar(dados: DadosSalvarContaAcesso): Promise<ContaAcessoEntregador> {
    const resposta = await fetch("/api/accounts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!resposta.ok) throw new Error(await lerErro(resposta, "Nao foi possivel salvar a conta de acesso."));
    const corpo = (await resposta.json()) as RespostaConta;
    if (!corpo.conta) throw new Error("Servidor nao retornou a conta salva.");
    return corpo.conta;
  }

  async excluirPorEntregadorId(entregadorId: string): Promise<void> {
    const resposta = await fetch(`/api/accounts?courierId=${encodeURIComponent(entregadorId)}`, {
      method: "DELETE",
    });
    if (resposta.status === 404) return;
    if (!resposta.ok) throw new Error(await lerErro(resposta, "Nao foi possivel excluir a conta de acesso."));
  }
}

import type { ArmazenamentoChaveValor } from "./armazenamento-chave-valor";

interface RespostaObter<T> {
  ok: boolean;
  encontrado: boolean;
  valor: T | null;
}

interface RespostaListar<T> {
  ok: boolean;
  itens: Array<{ chave: string; valor: T }>;
}

export class ArmazenamentoServidorLocal implements ArmazenamentoChaveValor {
  async estaDisponivel(): Promise<boolean> {
    try {
      const resposta = await fetch("/api/health", { cache: "no-store" });
      return resposta.ok;
    } catch {
      return false;
    }
  }

  async salvar<T>(chave: string, valor: T): Promise<void> {
    const resposta = await fetch("/api/storage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave, valor }),
    });
    if (!resposta.ok) throw new Error("Servidor local nao conseguiu salvar os dados.");
  }

  async obter<T>(chave: string): Promise<T | null> {
    const resposta = await fetch(`/api/storage?key=${encodeURIComponent(chave)}`, { cache: "no-store" });
    if (!resposta.ok) throw new Error("Servidor local indisponivel.");
    const dados = (await resposta.json()) as RespostaObter<T>;
    return dados.encontrado ? dados.valor : null;
  }

  async listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>> {
    const resposta = await fetch(`/api/storage?prefix=${encodeURIComponent(prefixo)}`, { cache: "no-store" });
    if (!resposta.ok) throw new Error("Servidor local indisponivel.");
    const dados = (await resposta.json()) as RespostaListar<T>;
    return dados.itens ?? [];
  }

  async remover(chave: string): Promise<void> {
    const resposta = await fetch(`/api/storage?key=${encodeURIComponent(chave)}`, { method: "DELETE" });
    if (!resposta.ok) throw new Error("Servidor local nao conseguiu remover o registro.");
  }
}

import type { ArmazenamentoRemoto } from "../armazenamento/armazenamento-remoto-com-cache";
import type { ClienteRealtimeRest } from "./cliente-realtime-rest";

interface RegistroFirebase<T> {
  __deliveryHubRegistro: true;
  valor: T;
}

function caminho(chave: string): string {
  return `dados/${chave.replace(/^\/+|\/+$/g, "")}`;
}

function coletar<T>(
  valor: unknown,
  chaveAtual: string,
  saida: Array<{ chave: string; valor: T }>,
): void {
  if (!valor || typeof valor !== "object") return;

  const candidato = valor as Partial<RegistroFirebase<T>>;
  if (candidato.__deliveryHubRegistro === true && "valor" in candidato) {
    saida.push({ chave: chaveAtual, valor: candidato.valor as T });
    return;
  }

  for (const [filho, conteudo] of Object.entries(valor as Record<string, unknown>)) {
    coletar<T>(
      conteudo,
      chaveAtual ? `${chaveAtual}/${filho}` : filho,
      saida,
    );
  }
}

export class ArmazenamentoRealtimeFirebase implements ArmazenamentoRemoto {
  constructor(private readonly rest: ClienteRealtimeRest) {}

  async estaDisponivel(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      await this.rest.obter<unknown>(".info/serverTimeOffset");
      return true;
    } catch {
      return false;
    }
  }

  async salvar<T>(chave: string, valor: T): Promise<void> {
    const registro: RegistroFirebase<T> = {
      __deliveryHubRegistro: true,
      valor,
    };
    await this.rest.salvar(caminho(chave), registro);
  }

  async obter<T>(chave: string): Promise<T | null> {
    const registro = await this.rest.obter<Partial<RegistroFirebase<T>>>(caminho(chave));
    if (!registro) return null;
    if (registro.__deliveryHubRegistro !== true) return null;
    return registro.valor as T;
  }

  async listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>> {
    const prefixoLimpo = prefixo.replace(/^\/+|\/+$/g, "");
    const valor = await this.rest.obter<unknown>(caminho(prefixoLimpo));
    if (!valor) return [];

    const itens: Array<{ chave: string; valor: T }> = [];
    coletar<T>(valor, prefixoLimpo, itens);
    return itens;
  }

  async remover(chave: string): Promise<void> {
    await this.rest.remover(caminho(chave));
  }
}

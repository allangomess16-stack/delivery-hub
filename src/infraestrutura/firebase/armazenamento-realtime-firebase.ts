import {
  get,
  ref,
  remove,
  set,
  type Database,
} from "firebase/database";
import type { ArmazenamentoRemoto } from "../armazenamento/armazenamento-remoto-com-cache";

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
  constructor(private readonly database: Database) {}

  async estaDisponivel(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      await get(ref(this.database, ".info/serverTimeOffset"));
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
    await set(ref(this.database, caminho(chave)), registro);
  }

  async obter<T>(chave: string): Promise<T | null> {
    const snapshot = await get(ref(this.database, caminho(chave)));
    if (!snapshot.exists()) return null;

    const registro = snapshot.val() as Partial<RegistroFirebase<T>>;
    if (registro.__deliveryHubRegistro !== true) return null;
    return registro.valor as T;
  }

  async listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>> {
    const prefixoLimpo = prefixo.replace(/^\/+|\/+$/g, "");
    const snapshot = await get(ref(this.database, caminho(prefixoLimpo)));
    if (!snapshot.exists()) return [];

    const itens: Array<{ chave: string; valor: T }> = [];
    coletar<T>(snapshot.val(), prefixoLimpo, itens);
    return itens;
  }

  async remover(chave: string): Promise<void> {
    await remove(ref(this.database, caminho(chave)));
  }
}

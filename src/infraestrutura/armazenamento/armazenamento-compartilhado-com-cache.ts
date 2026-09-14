import type { ArmazenamentoChaveValor } from "./armazenamento-chave-valor";
import { ArmazenamentoServidorLocal } from "./armazenamento-servidor-local";

const CHAVE_MIGRACAO = "delivery-hub:migracao-servidor-local:v1";

/**
 * Escreve sempre no cache local e, quando o servidor estiver acessivel,
 * replica os dados para que outros navegadores/celulares vejam a mesma carga.
 */
export class ArmazenamentoCompartilhadoComCache implements ArmazenamentoChaveValor {
  constructor(
    private readonly local: ArmazenamentoChaveValor,
    private readonly servidor: ArmazenamentoServidorLocal,
  ) {}

  async servidorAtivo(): Promise<boolean> {
    return this.servidor.estaDisponivel();
  }

  async migrarCacheParaServidor(): Promise<void> {
    if (localStorage.getItem(CHAVE_MIGRACAO) === "ok") return;
    if (!(await this.servidor.estaDisponivel())) return;

    const locais = await this.local.listar<unknown>("");
    for (const item of locais) {
      const remoto = await this.servidor.obter<unknown>(item.chave);
      if (remoto === null) await this.servidor.salvar(item.chave, item.valor);
    }
    localStorage.setItem(CHAVE_MIGRACAO, "ok");
  }

  async salvar<T>(chave: string, valor: T): Promise<void> {
    await this.local.salvar(chave, valor);
    try {
      await this.servidor.salvar(chave, valor);
    } catch (erro) {
      console.warn("Dados salvos apenas no cache local; servidor compartilhado indisponivel.", erro);
    }
  }

  async obter<T>(chave: string): Promise<T | null> {
    try {
      const remoto = await this.servidor.obter<T>(chave);
      if (remoto !== null) await this.local.salvar(chave, remoto);
      return remoto;
    } catch {
      return this.local.obter<T>(chave);
    }
  }

  async listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>> {
    try {
      const remotos = await this.servidor.listar<T>(prefixo);
      for (const item of remotos) await this.local.salvar(item.chave, item.valor);
      return remotos;
    } catch {
      return this.local.listar<T>(prefixo);
    }
  }

  async remover(chave: string): Promise<void> {
    await this.local.remover(chave);
    try {
      await this.servidor.remover(chave);
    } catch (erro) {
      console.warn("Registro removido apenas do cache local; servidor compartilhado indisponivel.", erro);
    }
  }
}

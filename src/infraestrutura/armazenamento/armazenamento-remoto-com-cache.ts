import type { ArmazenamentoChaveValor } from "./armazenamento-chave-valor";

export interface ArmazenamentoRemoto extends ArmazenamentoChaveValor {
  estaDisponivel(): Promise<boolean>;
}

/**
 * Cache offline simples para a fase Firebase inicial.
 *
 * Nao migra automaticamente dados do ambiente local antigo para a nuvem.
 * Isso evita publicar cargas/perfis de teste sem confirmacao do Admin.
 */
export class ArmazenamentoRemotoComCache implements ArmazenamentoChaveValor {
  constructor(
    private readonly local: ArmazenamentoChaveValor,
    private readonly remoto: ArmazenamentoRemoto,
  ) {}

  remotoAtivo(): Promise<boolean> {
    return this.remoto.estaDisponivel();
  }

  async salvar<T>(chave: string, valor: T): Promise<void> {
    await this.local.salvar(chave, valor);
    try {
      await this.remoto.salvar(chave, valor);
    } catch (erro) {
      console.warn("Registro salvo no cache local e ainda nao confirmado no Firebase.", erro);
    }
  }

  async obter<T>(chave: string): Promise<T | null> {
    try {
      const remoto = await this.remoto.obter<T>(chave);
      if (remoto !== null) await this.local.salvar(chave, remoto);
      return remoto;
    } catch {
      return this.local.obter<T>(chave);
    }
  }

  async listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>> {
    try {
      const remotos = await this.remoto.listar<T>(prefixo);
      for (const item of remotos) {
        await this.local.salvar(item.chave, item.valor);
      }
      return remotos;
    } catch {
      return this.local.listar<T>(prefixo);
    }
  }

  async remover(chave: string): Promise<void> {
    await this.local.remover(chave);
    try {
      await this.remoto.remover(chave);
    } catch (erro) {
      console.warn("Remocao mantida apenas no cache local por enquanto.", erro);
    }
  }
}

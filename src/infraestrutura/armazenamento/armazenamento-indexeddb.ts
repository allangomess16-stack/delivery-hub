import type { ArmazenamentoChaveValor } from "./armazenamento-chave-valor";

const BANCO_PADRAO = "delivery-hub-operacao";
const VERSAO = 1;
const STORE = "registros";

interface RegistroLocal<T> {
  chave: string;
  valor: T;
  atualizadoEm: string;
}

function abrirBanco(nomeBanco: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(nomeBanco, VERSAO);

    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result;
      if (!banco.objectStoreNames.contains(STORE)) {
        banco.createObjectStore(STORE, { keyPath: "chave" });
      }
    };

    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () => reject(requisicao.error);
  });
}

export class ArmazenamentoIndexedDb implements ArmazenamentoChaveValor {
  constructor(private readonly nomeBanco = BANCO_PADRAO) {}

  async salvar<T>(chave: string, valor: T): Promise<void> {
    const banco = await abrirBanco(this.nomeBanco);
    await new Promise<void>((resolve, reject) => {
      const transacao = banco.transaction(STORE, "readwrite");
      const registro: RegistroLocal<T> = {
        chave,
        valor,
        atualizadoEm: new Date().toISOString(),
      };
      transacao.objectStore(STORE).put(registro);
      transacao.oncomplete = () => resolve();
      transacao.onerror = () => reject(transacao.error);
    });
    banco.close();
  }

  async obter<T>(chave: string): Promise<T | null> {
    const banco = await abrirBanco(this.nomeBanco);
    const registro = await new Promise<RegistroLocal<T> | undefined>((resolve, reject) => {
      const requisicao = banco.transaction(STORE, "readonly").objectStore(STORE).get(chave);
      requisicao.onsuccess = () => resolve(requisicao.result as RegistroLocal<T> | undefined);
      requisicao.onerror = () => reject(requisicao.error);
    });
    banco.close();
    return registro?.valor ?? null;
  }

  async listar<T>(prefixo: string): Promise<Array<{ chave: string; valor: T }>> {
    const banco = await abrirBanco(this.nomeBanco);
    const registros = await new Promise<Array<{ chave: string; valor: T }>>((resolve, reject) => {
      const resultados: Array<{ chave: string; valor: T }> = [];
      const cursor = banco.transaction(STORE, "readonly").objectStore(STORE).openCursor();

      cursor.onsuccess = () => {
        const atual = cursor.result;
        if (!atual) {
          resolve(resultados);
          return;
        }

        const registro = atual.value as RegistroLocal<T>;
        if (registro.chave.startsWith(prefixo)) {
          resultados.push({ chave: registro.chave, valor: registro.valor });
        }
        atual.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });
    banco.close();
    return registros;
  }

  async remover(chave: string): Promise<void> {
    const banco = await abrirBanco(this.nomeBanco);
    await new Promise<void>((resolve, reject) => {
      const transacao = banco.transaction(STORE, "readwrite");
      transacao.objectStore(STORE).delete(chave);
      transacao.oncomplete = () => resolve();
      transacao.onerror = () => reject(transacao.error);
    });
    banco.close();
  }
}

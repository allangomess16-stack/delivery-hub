import type { RepositorioFotos } from "../../aplicacao/portas/repositorio-fotos";
const BANCO = "delivery-hub-fotos";
const VERSAO = 1;
const STORE = "fotos";

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(BANCO, VERSAO);

    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result;
      if (!banco.objectStoreNames.contains(STORE)) {
        banco.createObjectStore(STORE);
      }
    };

    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () => reject(requisicao.error);
  });
}

async function comprimirImagem(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Selecione uma imagem valida.");
  }

  const bitmap = await createImageBitmap(arquivo);
  const limite = 1800;
  const escala = Math.min(1, limite / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Nao foi possivel preparar a foto.");

  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir a foto."))),
      "image/jpeg",
      0.78,
    );
  });
}

export class RepositorioFotosNavegador implements RepositorioFotos {
  async salvar(arquivo: File): Promise<{
    chave: string;
    tamanhoBytes: number;
    largura?: number;
    altura?: number;
  }> {
    const blob = await comprimirImagem(arquivo);
    const chave = `foto:${crypto.randomUUID()}`;
    const banco = await abrirBanco();

    await new Promise<void>((resolve, reject) => {
      const transacao = banco.transaction(STORE, "readwrite");
      transacao.objectStore(STORE).put(blob, chave);
      transacao.oncomplete = () => resolve();
      transacao.onerror = () => reject(transacao.error);
    });

    banco.close();

    return {
      chave,
      tamanhoBytes: blob.size,
    };
  }

  async obterUrl(chave: string): Promise<string | null> {
    const banco = await abrirBanco();

    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const transacao = banco.transaction(STORE, "readonly");
      const requisicao = transacao.objectStore(STORE).get(chave);
      requisicao.onsuccess = () => resolve(requisicao.result as Blob | undefined);
      requisicao.onerror = () => reject(requisicao.error);
    });

    banco.close();
    return blob ? URL.createObjectURL(blob) : null;
  }

  async remover(chave: string): Promise<void> {
    const banco = await abrirBanco();

    await new Promise<void>((resolve, reject) => {
      const transacao = banco.transaction(STORE, "readwrite");
      transacao.objectStore(STORE).delete(chave);
      transacao.oncomplete = () => resolve();
      transacao.onerror = () => reject(transacao.error);
    });

    banco.close();
  }
}

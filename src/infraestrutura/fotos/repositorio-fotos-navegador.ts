import type { RepositorioFotos } from "../../aplicacao/portas/repositorio-fotos";
const BANCO = "delivery-hub-fotos";
const VERSAO = 1;
const STORE = "fotos";
const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024;

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

interface ImagemComprimida {
  blob: Blob;
  largura: number;
  altura: number;
}

function validarArquivoImagem(arquivo: File): void {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Selecione uma imagem valida.");
  }
  if (arquivo.size === 0) throw new Error("A imagem selecionada esta vazia.");
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("A foto excede 15 MB. Escolha uma imagem menor.");
  }
}

async function comprimirImagem(arquivo: File): Promise<ImagemComprimida> {
  validarArquivoImagem(arquivo);

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

  // Assinaturas possuem fundo transparente. O fundo branco evita perder o
  // traco escuro quando todo arquivo e normalizado para JPEG compacto.
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, largura, altura);
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir a foto."))),
      "image/jpeg",
      0.78,
    );
  });
  return { blob, largura, altura };
}

export class RepositorioFotosNavegador implements RepositorioFotos {
  async salvar(arquivo: File): Promise<{
    chave: string;
    tamanhoBytes: number;
    largura?: number;
    altura?: number;
  }> {
    const imagem = await comprimirImagem(arquivo);
    const chave = `foto:${crypto.randomUUID()}`;
    const banco = await abrirBanco();

    await new Promise<void>((resolve, reject) => {
      const transacao = banco.transaction(STORE, "readwrite");
      transacao.objectStore(STORE).put(imagem.blob, chave);
      transacao.oncomplete = () => resolve();
      transacao.onerror = () => reject(transacao.error);
    });

    banco.close();

    return {
      chave,
      tamanhoBytes: imagem.blob.size,
      largura: imagem.largura,
      altura: imagem.altura,
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

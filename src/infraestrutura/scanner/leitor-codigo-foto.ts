import { BrowserMultiFormatReader } from "@zxing/browser";

export interface ResultadoLeituraFoto {
  codigos: string[];
  mecanismo: "BARCODE_DETECTOR" | "ZXING";
}

function limparCodigo(valor: unknown): string {
  return String(valor ?? "").trim();
}

function unicos(valores: string[]): string[] {
  return [...new Set(valores.map(limparCodigo).filter(Boolean))];
}

async function carregarImagem(arquivo: File): Promise<{
  imagem: HTMLImageElement;
  liberar: () => void;
}> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Selecione ou fotografe uma imagem da etiqueta.");
  }

  const url = URL.createObjectURL(arquivo);
  const imagem = new Image();

  try {
    imagem.src = url;
    await imagem.decode();
    return {
      imagem,
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Nao foi possivel abrir a foto da etiqueta.");
  }
}

async function tentarBarcodeDetector(
  imagem: HTMLImageElement,
): Promise<string[]> {
  const Construtor = (
    globalThis as typeof globalThis & {
      BarcodeDetector?: new (opcoes?: { formats?: string[] }) => {
        detect: (fonte: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
      };
    }
  ).BarcodeDetector;

  if (!Construtor) return [];

  try {
    const detector = new Construtor();
    const resultados = await detector.detect(imagem);
    return unicos(resultados.map((item) => item.rawValue ?? ""));
  } catch {
    return [];
  }
}

async function tentarZxing(imagem: HTMLImageElement): Promise<string[]> {
  const leitor = new BrowserMultiFormatReader();

  try {
    const resultado = await leitor.decodeFromImageElement(imagem);
    return unicos([resultado.getText()]);
  } catch {
    return [];
  }
}

export async function lerCodigosDaFoto(
  arquivo: File,
): Promise<ResultadoLeituraFoto> {
  const { imagem, liberar } = await carregarImagem(arquivo);

  try {
    const nativos = await tentarBarcodeDetector(imagem);
    if (nativos.length) {
      return {
        codigos: nativos,
        mecanismo: "BARCODE_DETECTOR",
      };
    }

    const zxing = await tentarZxing(imagem);
    if (zxing.length) {
      return {
        codigos: zxing,
        mecanismo: "ZXING",
      };
    }

    throw new Error(
      "Nenhum codigo de barras ou QR foi identificado. Aproxime a camera do codigo principal da etiqueta e tente novamente.",
    );
  } finally {
    liberar();
  }
}

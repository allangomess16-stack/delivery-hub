import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";
import type { ResultadoLeituraFoto } from "./leitor-codigo-foto";

export interface EventoLeituraCamera extends ResultadoLeituraFoto {}

export interface ControleScannerCamera {
  parar(): void;
  alternarLanterna(): Promise<boolean>;
  possuiLanterna(): boolean;
}

export interface OpcoesScannerCamera {
  intervaloMs?: number;
  onLeitura: (evento: EventoLeituraCamera) => void | Promise<void>;
  onErro?: (erro: Error) => void;
}

interface CapacidadesVideoComLanterna extends MediaTrackCapabilities {
  torch?: boolean;
}

interface RestricaoAvancadaLanterna extends MediaTrackConstraintSet {
  torch?: boolean;
}

interface ResultadoBarcodeDetector {
  rawValue?: string;
}

interface InstanciaBarcodeDetector {
  detect(fonte: ImageBitmapSource): Promise<ResultadoBarcodeDetector[]>;
}

type ConstrutorBarcodeDetector = new (opcoes?: {
  formats?: string[];
}) => InstanciaBarcodeDetector;

function obterBarcodeDetector(): ConstrutorBarcodeDetector | null {
  return (
    globalThis as typeof globalThis & {
      BarcodeDetector?: ConstrutorBarcodeDetector;
    }
  ).BarcodeDetector ?? null;
}

function unicos(valores: string[]): string[] {
  return [...new Set(valores.map((valor) => valor.trim()).filter(Boolean))];
}

function erroLegivelCamera(erro: unknown): Error {
  if (erro instanceof DOMException) {
    if (erro.name === "NotAllowedError") {
      return new Error(
        "Permissao da camera negada. Autorize a camera para usar o scanner ao vivo.",
      );
    }

    if (erro.name === "NotFoundError") {
      return new Error("Nenhuma camera traseira foi encontrada neste aparelho.");
    }

    if (erro.name === "NotReadableError") {
      return new Error(
        "A camera esta ocupada por outro aplicativo. Feche a outra camera e tente novamente.",
      );
    }
  }

  return erro instanceof Error
    ? erro
    : new Error("Nao foi possivel iniciar a camera ao vivo.");
}

/**
 * Scanner continuo otimizado para operacao em rota.
 *
 * Ordem:
 * 1. BarcodeDetector diretamente no elemento <video>, quando o WebView oferece a API.
 *    Nao gera JPEG nem reabre a imagem a cada tentativa.
 * 2. ZXing diretamente no stream de video como fallback.
 *
 * A foto continua existindo em outro fluxo apenas como redundancia.
 */
export async function iniciarScannerCameraContinuo(
  video: HTMLVideoElement,
  opcoes: OpcoesScannerCamera,
): Promise<ControleScannerCamera> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Este aparelho nao disponibilizou camera continua para o aplicativo.",
    );
  }

  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  } catch (erro) {
    throw erroLegivelCamera(erro);
  }

  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  try {
    await video.play();
  } catch (erro) {
    stream.getTracks().forEach((trilha) => trilha.stop());
    throw erroLegivelCamera(erro);
  }

  let ativo = true;
  let temporizador: number | null = null;
  let lanternaLigada = false;
  let ultimoErroEm = 0;
  let controlesZxing: { stop(): void } | null = null;
  let processandoNativo = false;
  const intervaloMs = Math.max(90, opcoes.intervaloMs ?? 140);
  const trilhaVideo = stream.getVideoTracks()[0] ?? null;

  const capacidades = trilhaVideo?.getCapabilities?.() as
    | CapacidadesVideoComLanterna
    | undefined;
  const temLanterna = Boolean(capacidades?.torch);

  const emitir = async (
    codigos: string[],
    mecanismo: ResultadoLeituraFoto["mecanismo"],
  ): Promise<void> => {
    if (!ativo) return;
    const normalizados = unicos(codigos);
    if (!normalizados.length) return;
    await opcoes.onLeitura({ codigos: normalizados, mecanismo });
  };

  const BarcodeDetector = obterBarcodeDetector();

  if (BarcodeDetector) {
    let detector: InstanciaBarcodeDetector;
    try {
      detector = new BarcodeDetector({
        formats: ["code_128", "code_39", "qr_code", "ean_13", "itf"],
      });
    } catch {
      detector = new BarcodeDetector();
    }

    const agendarNativo = (): void => {
      if (!ativo) return;
      temporizador = window.setTimeout(
        () => void analisarNativo(),
        intervaloMs,
      );
    };

    const analisarNativo = async (): Promise<void> => {
      if (!ativo || processandoNativo) return agendarNativo();
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return agendarNativo();
      }

      processandoNativo = true;
      try {
        const resultados = await detector.detect(video);
        await emitir(
          resultados.map((resultado) => resultado.rawValue ?? ""),
          "BARCODE_DETECTOR",
        );
      } catch (erro) {
        if (Date.now() - ultimoErroEm > 3_000) {
          ultimoErroEm = Date.now();
          opcoes.onErro?.(
            erro instanceof Error
              ? erro
              : new Error("Falha temporaria ao analisar a camera."),
          );
        }
      } finally {
        processandoNativo = false;
        agendarNativo();
      }
    };

    agendarNativo();
  } else {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.ITF,
    ]);

    const leitor = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: intervaloMs,
      delayBetweenScanSuccess: 80,
    });

    try {
      controlesZxing = await leitor.decodeFromStream(
        stream,
        video,
        (resultado, erro) => {
          if (!ativo) return;

          if (resultado) {
            void emitir([resultado.getText()], "ZXING");
            return;
          }

          if (
            erro &&
            !(erro instanceof NotFoundException) &&
            Date.now() - ultimoErroEm > 3_000
          ) {
            ultimoErroEm = Date.now();
            opcoes.onErro?.(
              erro instanceof Error
                ? erro
                : new Error("Falha temporaria ao analisar a camera."),
            );
          }
        },
      );
    } catch (erro) {
      stream.getTracks().forEach((trilha) => trilha.stop());
      video.srcObject = null;
      throw erroLegivelCamera(erro);
    }
  }

  return {
    parar(): void {
      ativo = false;
      if (temporizador !== null) window.clearTimeout(temporizador);
      controlesZxing?.stop();
      stream.getTracks().forEach((trilha) => trilha.stop());
      video.srcObject = null;
    },

    possuiLanterna(): boolean {
      return temLanterna;
    },

    async alternarLanterna(): Promise<boolean> {
      if (!trilhaVideo || !temLanterna) return false;
      lanternaLigada = !lanternaLigada;

      try {
        await trilhaVideo.applyConstraints({
          advanced: [
            { torch: lanternaLigada } as RestricaoAvancadaLanterna,
          ],
        });
        return lanternaLigada;
      } catch {
        lanternaLigada = false;
        return false;
      }
    },
  };
}

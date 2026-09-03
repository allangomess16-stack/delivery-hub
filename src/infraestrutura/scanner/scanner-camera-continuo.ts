import {
  lerCodigosDaFoto,
  type ResultadoLeituraFoto,
} from "./leitor-codigo-foto";

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

async function frameParaArquivo(video: HTMLVideoElement): Promise<File> {
  const larguraOrigem = video.videoWidth;
  const alturaOrigem = video.videoHeight;

  if (!larguraOrigem || !alturaOrigem) {
    throw new Error("A camera ainda esta preparando a imagem.");
  }

  // O visor orienta o entregador a centralizar o barcode. Recortamos essa regiao
  // antes da decodificacao para o codigo ocupar mais pixels e para reduzir a
  // interferencia de outros barcodes/QR impressos na mesma etiqueta.
  const larguraRecorte = Math.round(larguraOrigem * 0.92);
  const alturaRecorte = Math.round(alturaOrigem * 0.46);
  const origemX = Math.round((larguraOrigem - larguraRecorte) / 2);
  const origemY = Math.round((alturaOrigem - alturaRecorte) / 2);

  const maxLargura = 1600;
  const escala = Math.min(1, maxLargura / larguraRecorte);
  const largura = Math.max(1, Math.round(larguraRecorte * escala));
  const altura = Math.max(1, Math.round(alturaRecorte * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: false,
  });

  if (!contexto) {
    throw new Error("Nao foi possivel preparar o quadro da camera.");
  }

  contexto.drawImage(
    video,
    origemX,
    origemY,
    larguraRecorte,
    alturaRecorte,
    0,
    0,
    largura,
    altura,
  );

  const blob = await new Promise<Blob | null>((resolver) =>
    canvas.toBlob(resolver, "image/jpeg", 0.92),
  );

  if (!blob) {
    throw new Error("Nao foi possivel analisar o quadro da camera.");
  }

  return new File([blob], "scanner-frame.jpg", { type: "image/jpeg" });
}

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
  let processando = false;
  let temporizador: number | null = null;
  let lanternaLigada = false;
  let ultimoErroEm = 0;
  const intervaloMs = Math.max(250, opcoes.intervaloMs ?? 420);
  const trilhaVideo = stream.getVideoTracks()[0] ?? null;

  const capacidades = trilhaVideo?.getCapabilities?.() as
    | CapacidadesVideoComLanterna
    | undefined;
  const temLanterna = Boolean(capacidades?.torch);

  const agendar = (): void => {
    if (!ativo) return;
    temporizador = window.setTimeout(() => void analisarFrame(), intervaloMs);
  };

  const analisarFrame = async (): Promise<void> => {
    if (!ativo || processando) return agendar();

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return agendar();
    }

    processando = true;

    try {
      const arquivo = await frameParaArquivo(video);
      const leitura = await lerCodigosDaFoto(arquivo);
      await opcoes.onLeitura(leitura);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro ?? "");
      const ausenciaDeCodigo = mensagem.startsWith(
        "Nenhum codigo de barras ou QR foi identificado",
      );

      if (!ausenciaDeCodigo && Date.now() - ultimoErroEm > 2_000) {
        ultimoErroEm = Date.now();
        opcoes.onErro?.(
          erro instanceof Error ? erro : new Error("Falha ao analisar a camera."),
        );
      }
    } finally {
      processando = false;
      agendar();
    }
  };

  agendar();

  return {
    parar(): void {
      ativo = false;
      if (temporizador !== null) window.clearTimeout(temporizador);
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

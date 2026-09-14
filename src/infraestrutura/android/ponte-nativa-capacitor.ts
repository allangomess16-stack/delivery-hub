import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
  AppNativoInstalado,
  CodigoAberturaNativa,
  CodigoCopiaNativa,
  PonteNativa,
  ResultadoAberturaNativa,
  ResultadoCopiaNativa,
} from "../../aplicacao/portas/ponte-nativa";
import { CODIGOS_ERRO } from "../../dominio/diagnostico/codigos-erro";

interface RespostaAppNativo {
  packageName: string;
  installed: boolean;
  versionName?: string;
  versionCode?: string;
}

interface RespostaDeepLinkNativo {
  code: CodigoAberturaNativa;
  dispatched: boolean;
  packageName: string;
  message: string;
}

interface RespostaCopiaNativa {
  code: CodigoCopiaNativa;
  copied: boolean;
  message: string;
}

interface NativeBridgePlugin {
  getAppInfo(opcoes: { packageName: string }): Promise<RespostaAppNativo>;
  openDeepLink(opcoes: {
    uri: string;
    packageName: string;
  }): Promise<RespostaDeepLinkNativo>;
  openApp(opcoes: { packageName: string }): Promise<RespostaDeepLinkNativo>;
  copyText(opcoes: { text: string }): Promise<RespostaCopiaNativa>;
  exitApp(): Promise<void>;
  openUpdateUrl(opcoes: { url: string }): Promise<{ opened: boolean }>;
}

const nativeBridge = registerPlugin<NativeBridgePlugin>("NativeBridge");

export async function sairDoAplicativoNativo(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  await nativeBridge.exitApp().catch(() => undefined);
}

export async function abrirAtualizacaoNativa(url: string): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    return (await nativeBridge.openUpdateUrl({ url })).opened === true;
  } catch {
    return false;
  }
}

const plataformaNaoSuportada = (
  packageName: string,
): ResultadoAberturaNativa => ({
  codigo: "PLATAFORMA_NAO_SUPORTADA",
  despachado: false,
  packageName,
  mensagem: "A integracao nativa esta disponivel somente no Android.",
});

/** Adaptador Capacitor. Nenhum tipo do Capacitor vaza para a aplicacao. */
export class PonteNativaCapacitor implements PonteNativa {
  async consultarApp(packageName: string): Promise<AppNativoInstalado> {
    if (Capacitor.getPlatform() !== "android") {
      return {
        packageName,
        instalado: false,
        consultaConcluida: false,
        erroCodigo: CODIGOS_ERRO.PLATAFORMA_NAO_SUPORTADA,
      };
    }

    try {
      const resposta = await nativeBridge.getAppInfo({ packageName });
      return {
        packageName: resposta.packageName,
        instalado: resposta.installed,
        consultaConcluida: true,
        versionName: resposta.versionName,
        versionCode: resposta.versionCode,
      };
    } catch {
      return {
        packageName,
        instalado: false,
        consultaConcluida: false,
        erroCodigo: CODIGOS_ERRO.PONTE_ANDROID,
      };
    }
  }

  async abrirDeepLink(
    uri: string,
    packageName: string,
  ): Promise<ResultadoAberturaNativa> {
    if (Capacitor.getPlatform() !== "android") {
      return plataformaNaoSuportada(packageName);
    }

    try {
      const resposta = await nativeBridge.openDeepLink({ uri, packageName });
      return {
        codigo: resposta.code,
        despachado: resposta.dispatched,
        packageName: resposta.packageName,
        mensagem: resposta.message,
      };
    } catch {
      return {
        codigo: "FALHA_NATIVA",
        despachado: false,
        packageName,
        mensagem: "A ponte Android nao conseguiu despachar a solicitacao.",
      };
    }
  }

  async abrirAplicativo(packageName: string): Promise<ResultadoAberturaNativa> {
    if (Capacitor.getPlatform() !== "android") {
      return plataformaNaoSuportada(packageName);
    }

    try {
      const resposta = await nativeBridge.openApp({ packageName });
      return {
        codigo: resposta.code,
        despachado: resposta.dispatched,
        packageName: resposta.packageName,
        mensagem: resposta.message,
      };
    } catch {
      return {
        codigo: "FALHA_NATIVA",
        despachado: false,
        packageName,
        mensagem: "A ponte Android nao conseguiu abrir o aplicativo.",
      };
    }
  }

  async copiarTexto(texto: string): Promise<ResultadoCopiaNativa> {
    if (Capacitor.getPlatform() !== "android") {
      return {
        codigo: "PLATAFORMA_NAO_SUPORTADA",
        copiado: false,
        mensagem: "A copia nativa esta disponivel somente no Android.",
      };
    }

    try {
      const resposta = await nativeBridge.copyText({ text: texto });
      return {
        codigo: resposta.code,
        copiado: resposta.copied,
        mensagem: resposta.message,
      };
    } catch {
      return {
        codigo: "FALHA_NATIVA",
        copiado: false,
        mensagem: "A ponte Android nao conseguiu copiar o codigo.",
      };
    }
  }
}

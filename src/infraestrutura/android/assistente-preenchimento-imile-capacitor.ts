import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
  AssistentePreenchimentoImile,
  ResultadoAssistenciaImile,
} from "../../aplicacao/portas/assistente-preenchimento-imile";
import type { DadosComprovacaoImile } from "../../dominio/entrega/tipos";

interface PluginAssistenteImile {
  prepareIMileAssist(opcoes: DadosComprovacaoImile): Promise<{
    status: "READY" | "DISABLED" | "MANUAL_REVIEW";
    message: string;
  }>;
  openIMileAssistSettings(): Promise<{ opened: boolean }>;
}

const plugin = registerPlugin<PluginAssistenteImile>("NativeBridge");

/** Adaptador Android isolado; no navegador o fluxo continua integralmente manual. */
export class AssistentePreenchimentoImileCapacitor implements AssistentePreenchimentoImile {
  async preparar(dados: DadosComprovacaoImile): Promise<ResultadoAssistenciaImile> {
    if (Capacitor.getPlatform() !== "android") {
      return { estado: "INDISPONIVEL", mensagem: "O preenchimento assistido funciona somente no APK Android." };
    }
    try {
      const resposta = await plugin.prepareIMileAssist(dados);
      if (resposta.status === "READY") return { estado: "PRONTA", mensagem: resposta.message };
      if (resposta.status === "DISABLED") return { estado: "DESATIVADA", mensagem: resposta.message };
      return { estado: "REVISAO_MANUAL", mensagem: resposta.message };
    } catch {
      return { estado: "INDISPONIVEL", mensagem: "Nao foi possivel preparar a assistencia da iMile." };
    }
  }

  async abrirConfiguracoes(): Promise<boolean> {
    if (Capacitor.getPlatform() !== "android") return false;
    try {
      return (await plugin.openIMileAssistSettings()).opened === true;
    } catch {
      return false;
    }
  }
}

import type {
  CodigoResultadoIntegracao,
  IntegracaoTransportadora,
  ResultadoIntegracaoTransportadora,
  SolicitacaoPesquisaTracking,
} from "../../aplicacao/portas/integracao-transportadora";
import type { PonteNativa } from "../../aplicacao/portas/ponte-nativa";
import type { RepositorioContratosIntegracao } from "../../aplicacao/portas/repositorio-contratos-integracao";
import type { RepositorioTelemetriaIntegracao } from "../../aplicacao/portas/repositorio-telemetria-integracao";
import type { ContratoIntegracaoEfetivo } from "../../dominio/integracao/contrato-integracao";
import type { EtapaTelemetriaIntegracao } from "../../dominio/integracao/telemetria-integracao";
import type { CapacidadePodTransportadora } from "../../dominio/integracao/capacidade-pod-transportadora";
import {
  CAPACIDADE_POD_IMILE_2_3_21,
  CONTRATO_IMILE_2_3_18,
  PROTOCOLO_IMILE_REQUEST_CODE_V1,
} from "../../configuracao/contratos-integracao/imile-2-3-18";
import { VERSAO_DELIVERY_HUB } from "../../configuracao/versao";

export { CONTRATO_IMILE_2_3_18 } from "../../configuracao/contratos-integracao/imile-2-3-18";

export const TRACKING_SINTETICO_IMILE = "DH_TESTE_INVALIDO";

const TRACKING_IMILE_PRODUCAO = /^(?:332|608|609)\d{10}$/;
const EVIDENCIA_DEEP_LINK = new Set(["DEVICE_VALIDATED", "PRODUCTION_VALIDATED"]);

function normalizarTracking(tracking: string): string {
  return tracking.trim().toUpperCase();
}

function trackingPermitido(
  tracking: string,
  modo: SolicitacaoPesquisaTracking["modo"],
): boolean {
  if (modo === "HOMOLOGACAO") return tracking === TRACKING_SINTETICO_IMILE;
  return TRACKING_IMILE_PRODUCAO.test(tracking);
}

function resultado(
  codigo: CodigoResultadoIntegracao,
  estrategia: ResultadoIntegracaoTransportadora["estrategia"],
  despachado: boolean,
  requerAcaoEntregador: boolean,
  mensagem: string,
): ResultadoIntegracaoTransportadora {
  return { codigo, estrategia, despachado, requerAcaoEntregador, mensagem };
}

/**
 * Integra exclusivamente a pesquisa contextual da iMile. POD e baixa
 * confirmada continuam fora do contrato, inclusive quando a Intent funciona.
 */
export class IMileAdapter implements IntegracaoTransportadora {
  readonly transportadora = "IMILE" as const;

  constructor(
    private readonly ponteNativa: PonteNativa,
    private readonly contratos: RepositorioContratosIntegracao,
    private readonly telemetria: RepositorioTelemetriaIntegracao,
  ) {}

  obterCapacidadePod(): CapacidadePodTransportadora {
    return CAPACIDADE_POD_IMILE_2_3_21;
  }

  private async registrar(
    etapa: EtapaTelemetriaIntegracao,
    codigo: CodigoResultadoIntegracao,
    estrategia: ResultadoIntegracaoTransportadora["estrategia"],
    versionCode?: string,
    contrato?: ContratoIntegracaoEfetivo,
  ): Promise<void> {
    await this.telemetria.registrar({
      eventoId: crypto.randomUUID(),
      ocorridoEm: new Date().toISOString(),
      versaoDeliveryHub: VERSAO_DELIVERY_HUB,
      transportadora: "IMILE",
      packageName: CONTRATO_IMILE_2_3_18.packageName,
      versionCode,
      versaoContrato: contrato?.versaoContrato,
      etapa,
      codigo,
      estrategia,
    }).catch(() => undefined);
  }

  private async fallback(
    tracking: string,
    versionCode: string,
    contrato: ContratoIntegracaoEfetivo | undefined,
    etapaFalha: EtapaTelemetriaIntegracao,
  ): Promise<ResultadoIntegracaoTransportadora> {
    let copia;
    try {
      copia = await this.ponteNativa.copiarTexto(tracking);
    } catch {
      const saida = resultado(
        contrato?.origem === "PADRAO_SEGURO" ? "VERSAO_DESCONHECIDA" : "ACAO_MANUAL",
        "MANUAL",
        false,
        true,
        "Abra a iMile e pesquise o codigo da etiqueta.",
      );
      await this.registrar("COPIAR_TRACKING", saida.codigo, saida.estrategia, versionCode, contrato);
      return saida;
    }
    if (!copia.copiado) {
      const saida = resultado(
        contrato?.origem === "PADRAO_SEGURO" ? "VERSAO_DESCONHECIDA" : "ACAO_MANUAL",
        "MANUAL",
        false,
        true,
        "Abra a iMile e pesquise o codigo da etiqueta.",
      );
      await this.registrar(etapaFalha, saida.codigo, saida.estrategia, versionCode, contrato);
      return saida;
    }

    let abertura;
    try {
      abertura = await this.ponteNativa.abrirAplicativo(
        CONTRATO_IMILE_2_3_18.packageName,
      );
    } catch {
      const saida = resultado(
        "ACAO_MANUAL",
        "MANUAL",
        false,
        true,
        "Codigo copiado. Abra a iMile e cole na pesquisa.",
      );
      await this.registrar("ABRIR_APLICATIVO", saida.codigo, saida.estrategia, versionCode, contrato);
      return saida;
    }
    if (!abertura.despachado) {
      const saida = resultado(
        "ACAO_MANUAL",
        "MANUAL",
        false,
        true,
        "Codigo copiado. Abra a iMile e cole na pesquisa.",
      );
      await this.registrar("ABRIR_APLICATIVO", saida.codigo, saida.estrategia, versionCode, contrato);
      return saida;
    }

    const saida = resultado(
      "FALLBACK_CLIPBOARD",
      "CLIPBOARD_APP",
      true,
      true,
      "Codigo copiado. Cole na pesquisa da iMile.",
    );
    await this.registrar(etapaFalha, saida.codigo, saida.estrategia, versionCode, contrato);
    return saida;
  }

  async abrirPesquisaPorTracking(
    solicitacao: SolicitacaoPesquisaTracking,
  ): Promise<ResultadoIntegracaoTransportadora> {
    const tracking = normalizarTracking(solicitacao.tracking);

    if (!trackingPermitido(tracking, solicitacao.modo)) {
      return resultado(
        "TRACKING_INVALIDO",
        "MANUAL",
        false,
        true,
        solicitacao.modo === "HOMOLOGACAO"
          ? "A homologacao aceita somente o codigo sintetico autorizado."
          : "O tracking nao corresponde ao formato iMile reconhecido.",
      );
    }

    let app;
    try {
      app = await this.ponteNativa.consultarApp(CONTRATO_IMILE_2_3_18.packageName);
    } catch {
      const saida = resultado(
        "INTEGRACAO_INDISPONIVEL",
        "MANUAL",
        false,
        true,
        "Nao foi possivel verificar a iMile. Abra o aplicativo e pesquise o codigo.",
      );
      await this.registrar("CONSULTAR_APP", saida.codigo, saida.estrategia);
      return saida;
    }
    if (!app.consultaConcluida) {
      const saida = resultado(
        "INTEGRACAO_INDISPONIVEL",
        "MANUAL",
        false,
        true,
        "Abra a iMile e pesquise o codigo da etiqueta.",
      );
      await this.registrar("CONSULTAR_APP", saida.codigo, saida.estrategia);
      return saida;
    }

    if (!app.instalado || !app.versionCode) {
      const saida = resultado(
        "APP_NAO_INSTALADO",
        "MANUAL",
        false,
        true,
        "O aplicativo operacional da iMile nao foi encontrado.",
      );
      await this.registrar("CONSULTAR_APP", saida.codigo, saida.estrategia);
      return saida;
    }

    let contrato: ContratoIntegracaoEfetivo;
    try {
      contrato = await this.contratos.resolver({
        transportadora: "IMILE",
        packageName: CONTRATO_IMILE_2_3_18.packageName,
        versionCode: app.versionCode,
      });
    } catch {
      return this.fallback(tracking, app.versionCode, undefined, "RESOLVER_CONTRATO");
    }

    const deepLinkPermitido =
      contrato.habilitado &&
      contrato.modo === "DEEPLINK" &&
      contrato.protocoloId === PROTOCOLO_IMILE_REQUEST_CODE_V1 &&
      EVIDENCIA_DEEP_LINK.has(contrato.evidencia);

    if (!deepLinkPermitido) {
      return this.fallback(tracking, app.versionCode, contrato, "RESOLVER_CONTRATO");
    }

    // O parser AOT usa split("=") e partes[1]. A validacao impede que outros
    // separadores criem parametros ou alterem requestCode.
    const uri = `${CONTRATO_IMILE_2_3_18.scheme}:?requestCode=${encodeURIComponent(tracking)}`;
    let abertura;
    try {
      abertura = await this.ponteNativa.abrirDeepLink(
        uri,
        CONTRATO_IMILE_2_3_18.packageName,
      );
    } catch {
      return this.fallback(tracking, app.versionCode, contrato, "ABRIR_DEEP_LINK");
    }

    if (!abertura.despachado) {
      return this.fallback(tracking, app.versionCode, contrato, "ABRIR_DEEP_LINK");
    }

    const saida = resultado(
      "DESPACHADO_VALIDADO",
      "DEEPLINK",
      true,
      false,
      "Pesquisa aberta na iMile. A baixa ainda deve ser concluida nela.",
    );
    await this.registrar("RESULTADO", saida.codigo, saida.estrategia, app.versionCode, contrato);
    return saida;
  }
}

import type {
  IntegracaoTransportadora,
  ResultadoIntegracaoTransportadora,
  SolicitacaoPesquisaTracking,
} from "../../aplicacao/portas/integracao-transportadora";
import type {
  AppNativoInstalado,
  PonteNativa,
  ResultadoAberturaNativa,
  ResultadoCopiaNativa,
} from "../../aplicacao/portas/ponte-nativa";

const PACKAGE_ANJUN = "com.anjun.supplierManagement";
const VERSAO_ANJUN_VALIDADA = "2.4.0";
const VERSION_CODE_ANJUN_VALIDADO = "100";
const TRACKING_ANJUN = /^AJ\d{14,15}$/i;

/**
 * Nível 1 validado em aparelho: copia o tracking e abre somente o launcher.
 * Não conhece telas internas, não envia foto e nunca confirma baixa.
 */
export class AnjunAdapter implements IntegracaoTransportadora {
  readonly transportadora = "ANJUN" as const;

  constructor(private readonly ponteNativa: PonteNativa) {}

  async abrirPesquisaPorTracking(
    solicitacao: SolicitacaoPesquisaTracking,
  ): Promise<ResultadoIntegracaoTransportadora> {
    const tracking = solicitacao.tracking.trim().toUpperCase();
    if (!TRACKING_ANJUN.test(tracking)) {
      return { codigo: "TRACKING_INVALIDO", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "O tracking não corresponde ao formato Anjun reconhecido." };
    }

    let app: AppNativoInstalado;
    try {
      app = await this.ponteNativa.consultarApp(PACKAGE_ANJUN);
    } catch {
      return { codigo: "INTEGRACAO_INDISPONIVEL", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "Não foi possível consultar a Anjun agora. Pesquise o código manualmente." };
    }
    if (!app.consultaConcluida) {
      return { codigo: "INTEGRACAO_INDISPONIVEL", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "Não foi possível consultar a Anjun agora. Pesquise o código manualmente." };
    }
    if (!app.instalado) {
      return { codigo: "APP_NAO_INSTALADO", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "O aplicativo operacional Anjun não foi encontrado." };
    }
    if (app.versionName !== VERSAO_ANJUN_VALIDADA || app.versionCode !== VERSION_CODE_ANJUN_VALIDADO) {
      return { codigo: "VERSAO_DESCONHECIDA", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "Versão Anjun ainda não homologada. Abra o app e pesquise o código manualmente." };
    }

    let copia: ResultadoCopiaNativa;
    try {
      copia = await this.ponteNativa.copiarTexto(tracking);
    } catch {
      return { codigo: "ACAO_MANUAL", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "Abra a Anjun e digite o tracking da etiqueta." };
    }
    if (!copia.copiado) {
      return { codigo: "ACAO_MANUAL", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "Abra a Anjun e digite o tracking da etiqueta." };
    }
    let abertura: ResultadoAberturaNativa;
    try {
      abertura = await this.ponteNativa.abrirAplicativo(PACKAGE_ANJUN);
    } catch {
      return { codigo: "ACAO_MANUAL", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "Tracking copiado. Abra a Anjun e cole na busca." };
    }
    if (!abertura.despachado) {
      return { codigo: "ACAO_MANUAL", estrategia: "MANUAL", despachado: false, requerAcaoEntregador: true, mensagem: "Tracking copiado. Abra a Anjun e cole na busca." };
    }
    return { codigo: "FALLBACK_CLIPBOARD", estrategia: "CLIPBOARD_APP", despachado: true, requerAcaoEntregador: true, mensagem: "Tracking copiado. Cole-o na busca da Anjun." };
  }
}

import type {
  EvidenciaCapacidade,
  RegistroIntegracaoTransportadora,
} from "../dominio/integracao/tipos";
import type { IdTransportadora } from "../dominio/transportadora/tipos";
import { CONTRATO_IMILE_2_3_21 } from "./contratos-integracao/imile-2-3-18";

const desconhecida = (
  capacidade: EvidenciaCapacidade["capacidade"],
  detalhes: string,
): EvidenciaCapacidade => ({
  capacidade,
  nivel: "UNKNOWN",
  origem: "Ainda nao validado",
  detalhes,
});

export const INTEGRACOES_TRANSPORTADORAS: Record<
  Exclude<IdTransportadora, "OUTRA">,
  RegistroIntegracaoTransportadora
> = {
  ANJUN: {
    transportadora: "ANJUN",
    nomeTransportadora: "Anjun",
    nomeAplicativo: "Anjun Express Nova",
    packageName: "com.anjun.supplierManagement",
    nivelPackage: "DEVICE_VALIDATED",
    apk: {
      arquivo: "anjun-supplier-management-app_2.1.4.apk",
      sha256: "f6b7c6284c1b6a329fa815273f1fc3b31b881585b421e5d5490869601ec04e31",
      versaoNome: "2.4.0",
      versaoCodigo: "100",
      origemVersao:
        "Aparelho autorizado por ADB em 2026-09-11; launcher aberto com sucesso",
    },
    atividadesDescobertas: [],
    capacidades: [
      {
        capacidade: "ABRIR_APP",
        nivel: "DEVICE_VALIDATED",
        origem: "ADB: launcher explícito e Activity em primeiro plano",
        detalhes:
          "com.anjun.supplierManagement 2.4.0 abriu pelo launcher validado; telas internas continuam isoladas.",
      },
      {
        capacidade: "LOGIN",
        nivel: "CODE_DISCOVERED",
        origem: "Recursos de login e bridge nativa encontrados no APK",
        detalhes:
          "Ha icones de usuario/senha e teste nativo de estado de login. Fluxo real depende de credencial autorizada.",
      },
      {
        capacidade: "SCANNER_INTERNO",
        nivel: "CODE_DISCOVERED",
        origem: "ML Kit + recursos de scan + bridge scanCode",
        detalhes:
          "O APK contem modelos de barcode, sons scan_success/scan_fail e acao nativa scanCode.",
      },
      {
        capacidade: "PROVA_FOTO",
        nivel: "CODE_DISCOVERED",
        origem: "Bridge nativa takePhoto e recursos operacionais",
        detalhes:
          "Existe captura de foto interna. Ainda nao sabemos se aceita imagem externa via Intent.",
      },
      {
        capacidade: "ASSINATURA",
        nivel: "CODE_DISCOVERED",
        origem: "Recursos de signing/signature e progresso de upload",
        detalhes:
          "Ha indicios fortes de assinatura/upload no app, mas o fluxo precisa ser observado em aparelho autenticado.",
      },
      {
        capacidade: "FLUXO_ENTREGA",
        nivel: "CODE_DISCOVERED",
        origem: "Recursos home_delivery/delivery e endpoints Anjun",
        detalhes:
          "O aplicativo possui recursos operacionais de entrega. Nenhuma tela interna sera aberta diretamente antes de ADB.",
      },
      desconhecida(
        "MODO_OFFLINE",
        "Nao foi confirmado no APK analisado se a baixa de entrega opera offline.",
      ),
      desconhecida(
        "DEEP_LINK",
        "Nenhum deep link externo foi validado.",
      ),
      desconhecida(
        "INTENT_EXPLICITO",
        "Nenhuma Activity exportada foi validada por ADB.",
      ),
      desconhecida(
        "COMPARTILHAR_TEXTO",
        "ACTION_SEND com texto ainda nao foi validado.",
      ),
      desconhecida(
        "COMPARTILHAR_IMAGEM",
        "ACTION_SEND/content URI ainda nao foi validado.",
      ),
    ],
    observacoes: [
      "Aplicativo construído com tecnologia DCloud/uni-app-x.",
      "Endpoints encontrados incluem client.supplier.anjunexpress.com e newmanage.anjunexpress.com.",
      "Nao usar componentes internos antes de confirmar exported/launcher no aparelho.",
    ],
  },

  IMILE: {
    transportadora: "IMILE",
    nomeTransportadora: "iMile",
    nomeAplicativo: "iMile ReDelivery",
    packageName: "com.imile.redelivery",
    nivelPackage: "DEVICE_VALIDATED",
    apk: {
      arquivo: "IMILE_2.3.21_461/base.apk",
      sha256: CONTRATO_IMILE_2_3_21.sha256,
      versaoNome: CONTRATO_IMILE_2_3_21.versionName,
      versaoCodigo: CONTRATO_IMILE_2_3_21.versionCode,
      origemVersao:
        "APK operacional extraido do aparelho autorizado e validado por SHA-256",
    },
    applicationClass: "Flutter Application",
    fileProviderAuthority: "com.imile.redelivery.fileprovider",
    atividadesDescobertas: [
      "com.imile.redelivery.MainActivity (exportada, singleTask, ACTION_VIEW)",
      "/delivery/deliveryCommonSearchPage (rota Flutter fixa)",
    ],
    capacidades: [
      {
        capacidade: "ABRIR_APP",
        nivel: "DEVICE_VALIDATED",
        origem: "NativeBridge no aparelho autorizado",
        detalhes:
          "O package com.imile.redelivery abriu diretamente e permitiu retorno ao Delivery Hub.",
      },
      {
        capacidade: "LOGIN",
        nivel: "CODE_DISCOVERED",
        origem: "com.imile.login.ui.LoginActivity",
        detalhes:
          "Fluxo de login existe no codigo. Teste real depende de credencial autorizada.",
      },
      {
        capacidade: "FLUXO_ENTREGA",
        nivel: "CODE_DISCOVERED",
        origem: "Modulo com.imile.delivery",
        detalhes:
          "Foram encontrados Pending Delivery, Delivered, Problem Delivery e TaskPendingDeliveryActivity.",
      },
      {
        capacidade: "SCANNER_INTERNO",
        nivel: "CODE_DISCOVERED",
        origem:
          "DeliverySignScanCodeActivity, OutForDeliveryScanCodeActivity e CommonScanActivity",
        detalhes:
          "Scanner interno e verificacoes de waybill estao presentes no codigo.",
      },
      {
        capacidade: "PROVA_FOTO",
        nivel: "CODE_DISCOVERED",
        origem: "PhotoFragment + textos Proof for Delivery",
        detalhes:
          "O fluxo interno exige foto em etapas de entrega. Aceite de foto externa ainda nao foi validado.",
      },
      {
        capacidade: "ASSINATURA",
        nivel: "CODE_DISCOVERED",
        origem: "SignatureFragment + Customer's signature",
        detalhes:
          "O aplicativo possui assinatura e envio de arquivos no fluxo de entrega.",
      },
      {
        capacidade: "MODO_OFFLINE",
        nivel: "CODE_DISCOVERED",
        origem: "OfflineRepository, OfflineDataDao e rotinas uploadFilesAndSubmitOffline",
        detalhes:
          "Ha implementacao offline no codigo. O comportamento operacional ainda precisa ser testado no aparelho.",
      },
      {
        capacidade: "COMPARTILHAR_TEXTO",
        nivel: "CODE_DISCOVERED",
        origem: "NativeBridge V0.4.8",
        detalhes:
          "Fallback copia apenas tracking validado e abre o launcher. Aguarda homologacao no aparelho.",
      },
      {
        capacidade: "DEEP_LINK",
        nivel: "DEVICE_VALIDATED",
        origem: "AOT Dart + teste visual no aparelho autorizado",
        detalhes:
          "crredelivery:?requestCode=DH_TESTE_INVALIDO abriu a pesquisa comum e preencheu o campo na Rider Delivery 2.3.21 code 461.",
      },
      {
        capacidade: "INTENT_EXPLICITO",
        nivel: "DEVICE_VALIDATED",
        origem: "NativeBridge ACTION_VIEW com setPackage",
        detalhes:
          "Intent restrita a com.imile.redelivery foi despachada sem seletor de aplicativos.",
      },
      desconhecida(
        "COMPARTILHAR_IMAGEM",
        "O APK possui FileProvider proprio, mas isso nao prova que aceite content URI de outro aplicativo.",
      ),
    ],
    observacoes: [
      "Contrato congelado exclusivamente para iMile 2.3.18 / versionCode 458.",
      "Escopo aprovado: navegacao ate a pesquisa contextual com requestCode.",
      "POD, foto, assinatura e confirmacao de baixa continuam fora do contrato.",
      "Versoes diferentes nao herdam DEVICE_VALIDATED e devem voltar ao modo assistido.",
      "A V0.4.8 permite kill switch remoto e fallback por clipboard sem liberar URI arbitraria.",
    ],
  },

  JNT: {
    transportadora: "JNT",
    nomeTransportadora: "J&T Express",
    nomeAplicativo: "Aplicativo operacional J&T - aguardando APK correto",
    packageName: null,
    nivelPackage: "UNKNOWN",
    apk: null,
    atividadesDescobertas: [],
    capacidades: [
      desconhecida("ABRIR_APP", "Package operacional ainda nao confirmado."),
      desconhecida("LOGIN", "Aguardando APK/aparelho correto."),
      desconhecida("FLUXO_ENTREGA", "Aguardando APK/aparelho correto."),
      desconhecida("SCANNER_INTERNO", "Aguardando APK/aparelho correto."),
      desconhecida("PROVA_FOTO", "Aguardando APK/aparelho correto."),
      desconhecida("ASSINATURA", "Aguardando APK/aparelho correto."),
      desconhecida("MODO_OFFLINE", "Aguardando APK/aparelho correto."),
      desconhecida("DEEP_LINK", "Aguardando APK/aparelho correto."),
      desconhecida("INTENT_EXPLICITO", "Aguardando APK/aparelho correto."),
      desconhecida("COMPARTILHAR_TEXTO", "Aguardando APK/aparelho correto."),
      desconhecida("COMPARTILHAR_IMAGEM", "Aguardando APK/aparelho correto."),
    ],
    observacoes: [
      "A pagina de distribuicao J&T foi identificada, mas o download apresentou erro.",
      "O arquivo j-t-philippines.apk analisado anteriormente nao correspondeu ao app operacional desejado e nao integra este registro.",
    ],
  },
};

export function obterIntegracaoTransportadora(
  transportadora: IdTransportadora,
): RegistroIntegracaoTransportadora | null {
  if (transportadora === "OUTRA") return null;
  return INTEGRACOES_TRANSPORTADORAS[transportadora];
}

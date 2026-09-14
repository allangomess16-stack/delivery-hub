/**
 * Contrato imutavel da capacidade comprovada para uma versao especifica.
 * Nenhum outro adaptador ou versao deve herdar esta evidencia implicitamente.
 */
import type { ConfiguracaoContratoIntegracao } from "../../dominio/integracao/contrato-integracao";
import type { CapacidadePodTransportadora } from "../../dominio/integracao/capacidade-pod-transportadora";

export const PROTOCOLO_IMILE_REQUEST_CODE_V1 = "IMILE_REQUEST_CODE_V1";

export const CONTRATO_IMILE_2_3_18 = {
  packageName: "com.imile.redelivery",
  versionName: "2.3.18",
  versionCode: "458",
  sha256: "acf5969920f9f94debf5a257fca8b0af118494f94577eb2c417bd94fc8213126",
  scheme: "crredelivery",
  evidencia: "DEVICE_VALIDATED",
  escopo: "PESQUISA_CONTEXTUAL",
} as const;

/**
 * A atualizacao para Rider Delivery manteve package, esquema e parser de
 * requestCode. Esta evidencia e independente da 2.3.18: uma versao futura
 * nunca herdara permissao de Deep Link por proximidade de numero.
 */
export const CONTRATO_IMILE_2_3_21 = {
  packageName: "com.imile.redelivery",
  versionName: "2.3.21",
  versionCode: "461",
  sha256: "dd54baeefe620b05f8f523f32760692ad59c08383906958d5959569f66991758",
  scheme: "crredelivery",
  evidencia: "DEVICE_VALIDATED",
  escopo: "PESQUISA_CONTEXTUAL",
} as const;

export const POLITICA_IMILE_2_3_18: ConfiguracaoContratoIntegracao = {
  versaoSchema: 1,
  transportadora: "IMILE",
  versionCode: CONTRATO_IMILE_2_3_18.versionCode,
  protocoloId: PROTOCOLO_IMILE_REQUEST_CODE_V1,
  versaoContrato: 1,
  habilitado: true,
  modo: "DEEPLINK",
  evidencia: "DEVICE_VALIDATED",
  atualizadoEm: "2026-09-08T00:00:00.000Z",
  motivo: "Pesquisa contextual homologada no aparelho para a iMile 2.3.18.",
};

export const POLITICA_IMILE_2_3_21: ConfiguracaoContratoIntegracao = {
  versaoSchema: 1,
  transportadora: "IMILE",
  versionCode: CONTRATO_IMILE_2_3_21.versionCode,
  protocoloId: PROTOCOLO_IMILE_REQUEST_CODE_V1,
  versaoContrato: 1,
  habilitado: true,
  modo: "DEEPLINK",
  evidencia: "DEVICE_VALIDATED",
  atualizadoEm: "2026-09-10T00:00:00.000Z",
  motivo: "Rider Delivery 2.3.21 homologada no aparelho com requestCode sintetico.",
};

export const POLITICAS_IMILE_HOMOLOGADAS = [
  POLITICA_IMILE_2_3_18,
  POLITICA_IMILE_2_3_21,
] as const;

/**
 * Matriz conservadora: a iMile 2.3.21 aceitou somente o requestCode.
 * Os demais campos permanecem no Hub e são preenchidos manualmente na iMile.
 */
export const CAPACIDADE_POD_IMILE_2_3_21: CapacidadePodTransportadora = {
  transportadora: "IMILE",
  versionCode: CONTRATO_IMILE_2_3_21.versionCode,
  tracking: "PREENCHIDO_AUTOMATICAMENTE",
  recebedor: "PREENCHER_NO_APP",
  fotos: "PREENCHER_NO_APP",
  assinatura: "PREENCHER_NO_APP",
  confirmacaoBaixa: "PREENCHER_NO_APP",
  evidencia: "DEVICE_VALIDATED",
};

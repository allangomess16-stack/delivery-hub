import type { IdTransportadora } from "../dominio/transportadora/tipos";

/**
 * REGRAS DE IDENTIFICACAO
 *
 * Este arquivo concentra os padroes encontrados nas etiquetas e planilhas reais.
 * Se uma regra mudar no futuro, ajuste aqui — nao espalhe regex pelo sistema.
 */
export interface RegraTransportadora {
  id: string;
  transportadora: IdTransportadora;
  nome: string;
  expressao: RegExp;
}

export const REGRAS_TRANSPORTADORAS: RegraTransportadora[] = [
  {
    id: "ANJUN_AJ_17",
    transportadora: "ANJUN",
    nome: "Anjun",
    expressao: /^AJ\d{15}$/i,
  },
  {
    id: "JNT_99988_15",
    transportadora: "JNT",
    nome: "J&T Express",
    expressao: /^99988\d{10}$/,
  },
  {
    id: "JNT_888X_15",
    transportadora: "JNT",
    nome: "J&T Express",
    expressao: /^888[01]\d{11}$/,
  },
  {
    id: "IMILE_332_13",
    transportadora: "IMILE",
    nome: "iMile",
    expressao: /^332\d{10}$/,
  },
  {
    id: "IMILE_608_13",
    transportadora: "IMILE",
    nome: "iMile",
    expressao: /^608\d{10}$/,
  },
];

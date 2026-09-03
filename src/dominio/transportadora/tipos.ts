export type IdTransportadora = "JNT" | "ANJUN" | "IMILE" | "OUTRA";

export type NivelConfianca = "ALTA" | "MEDIA" | "DESCONHECIDA";

export interface TransportadoraIdentificada {
  id: IdTransportadora;
  nome: string;
  confianca: NivelConfianca;
  regraUsada?: string;
}

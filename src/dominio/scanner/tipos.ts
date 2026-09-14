import type { PacoteDaCarga } from "../carga/tipos";
import type { TransportadoraIdentificada } from "../transportadora/tipos";

export type OrigemOperacaoScanner = "CARGA_IMPORTADA" | "EXTRA_ROTA" | "SCANNER_LIVRE";

/**
 * Contrato produzido pelo scanner. A carga e apenas um contexto opcional:
 * sua ausencia nunca invalida um tracking reconhecido.
 */
export interface ResultadoScannerUniversal {
  tracking: string;
  transportadora: TransportadoraIdentificada;
  origem: OrigemOperacaoScanner;
  pacote?: PacoteDaCarga;
  cargaId?: string;
  /** Verdadeiro quando o entregador classificou uma etiqueta sem regra conhecida. */
  transportadoraSelecionadaManual?: boolean;
}

export interface FalhaScannerUniversal {
  codigo: "CODIGO_VAZIO" | "TRANSPORTADORA_NAO_RECONHECIDA" | "CODIGO_AMBIGUO";
  mensagem: string;
}

export type ResolucaoScannerUniversal =
  | { sucesso: true; resultado: ResultadoScannerUniversal }
  | { sucesso: false; falha: FalhaScannerUniversal };

export type EstadoEncaminhamentoScanner =
  | "PENDENTE"
  | "DESPACHADO"
  | "FALLBACK"
  | "SEM_INTEGRACAO"
  | "FALHA";

export interface RegistroOperacaoScanner {
  registroId: string;
  entregadorId: string;
  diaOperacao: string;
  tracking: string;
  transportadoraId: string;
  origem: OrigemOperacaoScanner;
  cargaId?: string;
  pacoteId?: string;
  primeiraLeituraEm: string;
  ultimaLeituraEm: string;
  tentativas: number;
  estado: EstadoEncaminhamentoScanner;
  codigoResultado?: string;
}

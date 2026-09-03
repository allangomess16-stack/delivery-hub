import type { EstadoEntrega } from "../entrega/tipos";
import type { TransportadoraIdentificada } from "../transportadora/tipos";

export type OrigemPacote = "EXCEL" | "MANUAL" | "TRANSFERENCIA";

export type StatusCarga = "RASCUNHO" | "PUBLICADA" | "EM_OPERACAO" | "ENCERRADA";

export type OrigemRegiao = "ENDERECO" | "MANUAL" | "IMPORTACAO";
export type ConfiancaRegiao = "ALTA" | "MEDIA" | "MANUAL";

export interface EnderecoEntrega {
  texto: string;
  cep?: string;
}

export interface RegiaoEntrega {
  regiaoId: string;
  nome: string;
  origem: OrigemRegiao;
  confianca: ConfiancaRegiao;
}

export interface PacoteDaCarga {
  id: string;
  /** Nome da coluna original da planilha. Mantido para auditoria. */
  entregador: string;
  codigoOriginal: string;
  codigoNormalizado: string;
  transportadora: TransportadoraIdentificada;
  precisaRevisao: boolean;
  motivoRevisao?: string;
  entrega?: EstadoEntrega;
  /** Origem operacional. Campos antigos sem valor sao tratados como EXCEL. */
  origem?: OrigemPacote;
  criadoEm?: string;
  atualizadoEm?: string;
  transferidoDeEntregadorId?: string;
  enderecoEntrega?: EnderecoEntrega;
  regiaoEntrega?: RegiaoEntrega;
}

export interface CargaImportada {
  id: string;
  nomeArquivo: string;
  importadaEm: string;
  pacotes: PacoteDaCarga[];
  entregadores: string[];
}

export interface CargaEntregador {
  cargaId: string;
  cargaOrigemId: string;
  entregadorId: string;
  nomeEntregador: string;
  dataOperacao: string;
  nomeArquivoOrigem: string;
  criadaEm: string;
  pacotes: PacoteDaCarga[];
  /** Ajuda a comparar a persistencia local com a futura arvore remota. */
  chaveRemotaSimulada: string;
  /** Cargas antigas sem status sao tratadas como PUBLICADA. */
  status?: StatusCarga;
  publicadaEm?: string;
  encerradaEm?: string;
}

export interface ResumoTransportadora {
  id: string;
  nome: string;
  quantidade: number;
}

export interface ResumoEntregador {
  nome: string;
  total: number;
  transportadoras: ResumoTransportadora[];
}

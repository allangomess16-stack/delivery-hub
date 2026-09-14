import type { EstadoEntrega } from "../entrega/tipos";
import type { TransportadoraIdentificada } from "../transportadora/tipos";

export type OrigemPacote = "EXCEL" | "MANUAL" | "TRANSFERENCIA";

export type StatusCarga = "RASCUNHO" | "PUBLICADA" | "EM_OPERACAO" | "ENCERRADA";
export type MotivoEncerramentoCarga = "CONCLUIDA" | "ARQUIVADA_ADMIN" | "EXCLUIDA_TESTE" | "CONSOLIDADA";

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

export interface OrigemPlanilhaPacote {
  aba: string;
  linha: number;
  coluna: number;
  celula: string;
  cabecalho: string;
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
  /** Coordenada exata no Excel para auditoria e diagnostico de duplicidades. */
  origemPlanilha?: OrigemPlanilhaPacote;
  entrega?: EstadoEntrega;
  /** Origem operacional. Campos antigos sem valor sao tratados como EXCEL. */
  origem?: OrigemPacote;
  criadoEm?: string;
  atualizadoEm?: string;
  transferidoDeEntregadorId?: string;
  /** Registro operacional; nunca equivale a baixa confirmada na transportadora. */
  situacaoOperacional?: "REGULAR" | "EXTRA_ROTA" | "AVULSA";
  /** Permite ao Admin conciliar uma leitura feita fora da carga atribuida. */
  alertaAdmin?: boolean;
  conciliacaoExtraRota?: {
    status: "ABERTA" | "RESOLVIDA";
    resolvidaEm?: string;
  };
  /** Chave remota somente para o Admin resolver o alerta, nunca exibida na UI. */
  operacaoExtraRotaId?: string;
  enderecoEntrega?: EnderecoEntrega;
  regiaoEntrega?: RegiaoEntrega;
}

export interface CargaImportada {
  id: string;
  nomeArquivo: string;
  importadaEm: string;
  pacotes: PacoteDaCarga[];
  entregadores: string[];
  colunasIgnoradas?: Array<{
    cabecalho: string;
    quantidadeDescartada: number;
    ignoradaEm: string;
  }>;
}

export interface CargaEntregador {
  cargaId: string;
  cargaOrigemId: string;
  /** Referencias legiveis e imutaveis para operacao e suporte. */
  referenciaCarga?: string;
  referenciaLote?: string;
  sequenciaNoLote?: number;
  entregadorId: string;
  nomeEntregador: string;
  dataOperacao: string;
  nomeArquivoOrigem: string;
  /** Mantem operacoes livres separadas das cargas oficiais importadas. */
  origemOperacional?: "IMPORTACAO" | "SCANNER_UNIVERSAL";
  criadaEm: string;
  pacotes: PacoteDaCarga[];
  /** Ajuda a comparar a persistencia local com a futura arvore remota. */
  chaveRemotaSimulada: string;
  /** Cargas antigas sem status sao tratadas como PUBLICADA. */
  status?: StatusCarga;
  publicadaEm?: string;
  encerradaEm?: string;
  motivoEncerramento?: MotivoEncerramentoCarga;
  /** Importacoes que alimentaram esta carga diaria apos consolidacoes. */
  lotesOrigem?: OrigemLoteCarga[];
}

export interface OrigemLoteCarga {
  loteId: string;
  referencia: string;
  nomeArquivo: string;
  importadaEm: string;
  quantidadePacotes: number;
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

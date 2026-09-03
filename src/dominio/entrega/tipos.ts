export type EstadoFisicoEntrega =
  | "PENDENTE"
  | "PREPARANDO"
  | "AGUARDANDO_RECEBEDOR"
  | "ENTREGUE"
  | "NAO_ENTREGUE";

export type EstadoBaixaExterna =
  | "NAO_INICIADA"
  | "PREPARADA"
  | "APP_EXTERNO_ABERTO"
  | "ENVIANDO"
  | "CONFIRMADA"
  | "ERRO"
  | "ACAO_MANUAL";

export type MotivoNaoEntrega =
  | "DESTINATARIO_AUSENTE"
  | "ENDERECO_NAO_ENCONTRADO"
  | "ENDERECO_INCORRETO"
  | "SEM_ACESSO"
  | "LOCAL_FECHADO"
  | "RECUSADO"
  | "OUTRO";

export type TipoRecebedor =
  | "PROPRIO"
  | "PORTARIA"
  | "FAMILIAR"
  | "VIZINHO"
  | "OUTRO";

export type TipoEvidenciaFoto =
  | "ETIQUETA"
  | "FACHADA"
  | "PACOTE"
  | "LOCAL_ENTREGA"
  | "RECEBEDOR"
  | "OUTRA";

export interface EvidenciaFoto {
  id: string;
  tipo: TipoEvidenciaFoto;
  chaveArquivo: string;
  capturadaEm: string;
  largura?: number;
  altura?: number;
  tamanhoBytes?: number;
}

export interface EventoEntrega {
  id: string;
  tipo:
    | "INICIADA"
    | "PAUSADA"
    | "CANCELADA"
    | "FOTO_ADICIONADA"
    | "FOTO_REMOVIDA"
    | "RECEBEDOR_INFORMADO"
    | "ENTREGUE"
    | "NAO_ENTREGUE"
    | "DESFEITA";
  criadoEm: string;
  descricao: string;
}

export interface RecebedorEntrega {
  tipo: TipoRecebedor;
  nome?: string;
}

export interface AcaoDesfazivel {
  estadoFisicoAnterior: EstadoFisicoEntrega;
  motivoNaoEntregaAnterior?: MotivoNaoEntrega;
  concluidaEm?: string;
}

export interface EstadoEntrega {
  estadoFisico: EstadoFisicoEntrega;
  estadoBaixaExterna: EstadoBaixaExterna;
  fotos: EvidenciaFoto[];
  recebedor?: RecebedorEntrega;
  motivoNaoEntrega?: MotivoNaoEntrega;
  iniciadaEm?: string;
  concluidaEm?: string;
  eventos: EventoEntrega[];
  ultimaAcaoDesfazivel?: AcaoDesfazivel;
}

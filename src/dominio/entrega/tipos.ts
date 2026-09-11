export type EstadoFisicoEntrega =
  | "PENDENTE"
  | "PREPARANDO"
  | "AGUARDANDO_RECEBEDOR"
  | "ENTREGUE"
  | "NAO_ENTREGUE";

/**
 * Estado independente da realidade fisica da entrega.
 *
 * A V0.4.0 passa a distinguir tres momentos que antes ficavam misturados:
 * - persistencia apenas no aparelho;
 * - operacao recebida pelo Delivery Hub/servidor;
 * - confirmacao final na transportadora (futura integracao nativa/API).
 */
export type EstadoIntegracaoEntrega =
  | "NAO_INICIADA"
  | "AGUARDANDO_SINCRONIZACAO"
  | "SINCRONIZANDO"
  | "AGUARDANDO_INTEGRACAO"
  | "CONFIRMADA"
  | "ERRO"
  | "ACAO_MANUAL";

/** @deprecated Nome anterior mantido somente para migracao de dados antigos. */
export type EstadoBaixaExternaLegado =
  | "NAO_INICIADA"
  | "PREPARADA"
  | "APP_EXTERNO_ABERTO"
  | "ABERTA_NO_APP_EXTERNO"
  | "ENVIANDO"
  | "CONFIRMADA"
  | "ERRO"
  | "FALHOU"
  | "ACAO_MANUAL"
  | "EXIGE_ACAO_MANUAL";

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

/** Como a evidencia entrou no Hub. Mantido no registro para auditoria de POD. */
export type OrigemEvidenciaFoto = "CAMERA" | "GALERIA";

export interface EvidenciaFoto {
  id: string;
  tipo: TipoEvidenciaFoto;
  chaveArquivo: string;
  capturadaEm: string;
  largura?: number;
  altura?: number;
  tamanhoBytes?: number;
  origem?: OrigemEvidenciaFoto;
}

export interface AssinaturaEntrega {
  chaveArquivo: string;
  capturadaEm: string;
  largura: number;
  altura: number;
  tamanhoBytes: number;
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
    | "ASSINATURA_ADICIONADA"
    | "ASSINATURA_REMOVIDA"
    | "ENTREGUE"
    | "NAO_ENTREGUE"
    | "DESFEITA"
    | "SINCRONIZACAO_ENFILEIRADA"
    | "SINCRONIZACAO_INICIADA"
    | "SINCRONIZACAO_CONFIRMADA"
    | "SINCRONIZACAO_FALHOU"
    | "INTEGRACAO_CONFIRMADA"
    | "ACAO_MANUAL_EXIGIDA";
  criadoEm: string;
  descricao: string;
}

export interface RecebedorEntrega {
  tipo: TipoRecebedor;
  nome?: string;
  documento?: string;
}

export interface AcaoDesfazivel {
  estadoFisicoAnterior: EstadoFisicoEntrega;
  motivoNaoEntregaAnterior?: MotivoNaoEntrega;
  concluidaEm?: string;
}

export interface EstadoEntrega {
  estadoFisico: EstadoFisicoEntrega;
  estadoIntegracao: EstadoIntegracaoEntrega;
  fotos: EvidenciaFoto[];
  recebedor?: RecebedorEntrega;
  assinatura?: AssinaturaEntrega;
  motivoNaoEntrega?: MotivoNaoEntrega;
  iniciadaEm?: string;
  concluidaEm?: string;
  eventos: EventoEntrega[];
  ultimaAcaoDesfazivel?: AcaoDesfazivel;

  /** UUID da operacao idempotente atualmente associada a conclusao. */
  operacaoIntegracaoId?: string;
  sincronizadaEm?: string;
  confirmadaTransportadoraEm?: string;
  ultimoErroIntegracao?: string;

  /**
   * Campo apenas de leitura/migracao para cargas salvas antes da V0.4.0.
   * Novas gravacoes nao devem depender dele.
   */
  estadoBaixaExterna?: EstadoBaixaExternaLegado;
}

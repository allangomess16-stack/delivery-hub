import type { EstadoEntrega } from "../entrega/tipos";

export type TipoOperacaoOutboxEntrega = "ENTREGA_CONFIRMADA" | "NAO_ENTREGUE";
export type EstadoItemOutbox = "PENDENTE" | "PROCESSANDO" | "ERRO" | "BLOQUEADO";

export interface PayloadOperacaoEntrega {
  entrega: EstadoEntrega;
  contextoOperacional?: "REGULAR" | "EXTRA_ROTA" | "AVULSA";
  alertaAdmin?: boolean;
}

export interface ItemOutboxEntrega {
  operacaoId: string;
  tipo: TipoOperacaoOutboxEntrega;
  estado: EstadoItemOutbox;
  entregadorId: string;
  cargaId: string;
  pacoteId: string;
  tracking: string;
  transportadoraId: string;
  criadoEm: string;
  atualizadoEm: string;
  tentativas: number;
  proximaTentativaEm?: string;
  ultimoErro?: string;
  payload: PayloadOperacaoEntrega;
}

export type ResultadoEnvioOperacao =
  | { tipo: "RECEBIDA_PELO_HUB"; processadaAntes: boolean }
  | { tipo: "CONFIRMADA_TRANSPORTADORA"; processadaAntes: boolean }
  | { tipo: "ACAO_MANUAL"; mensagem: string }
  | { tipo: "ERRO_PERMANENTE"; mensagem: string };

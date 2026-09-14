import type { CargaEntregador } from "../../dominio/carga/tipos";

export interface RepositorioCargaEntregador {
  salvarCarga(entregadorId: string, carga: CargaEntregador): Promise<void>;
  /** Persiste várias cargas como uma única unidade lógica quando o destino suporta atomicidade. */
  salvarCargas(cargas: readonly CargaEntregador[]): Promise<void>;
  obterCargaAtual(entregadorId: string): Promise<CargaEntregador | null>;
  listarCargas(entregadorId: string): Promise<CargaEntregador[]>;
  /** Disponível em repositórios que materializam alertas da Outbox no Admin. */
  resolverAlertaExtraRota?(
    entregadorId: string,
    cargaId: string,
    pacoteId: string,
    operacaoId: string,
  ): Promise<void>;
}

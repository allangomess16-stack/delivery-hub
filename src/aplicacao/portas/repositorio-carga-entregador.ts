import type { CargaEntregador } from "../../dominio/carga/tipos";

export interface RepositorioCargaEntregador {
  salvarCarga(entregadorId: string, carga: CargaEntregador): Promise<void>;
  obterCargaAtual(entregadorId: string): Promise<CargaEntregador | null>;
  listarCargas(entregadorId: string): Promise<CargaEntregador[]>;
}

import type { VinculoColunaExcel } from "../../dominio/identidade/tipos";

export interface RepositorioVinculosExcel {
  salvar(vinculo: VinculoColunaExcel): Promise<void>;
  listarPorEntregador(entregadorId: string): Promise<VinculoColunaExcel[]>;
  removerPorEntregador(entregadorId: string): Promise<void>;
}

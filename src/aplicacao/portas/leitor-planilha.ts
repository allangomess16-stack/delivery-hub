import type { CargaImportada } from "../../dominio/carga/tipos";

export interface LeitorPlanilha {
  ler(arquivo: File): Promise<CargaImportada>;
}

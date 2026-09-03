import type { RepositorioVinculosExcel } from "../../aplicacao/portas/repositorio-vinculos-excel";
import type { VinculoColunaExcel } from "../../dominio/identidade/tipos";
import type { ArmazenamentoChaveValor } from "./armazenamento-chave-valor";

const PREFIXO = "profile-links/";

export class RepositorioVinculosExcelLocalAdapter implements RepositorioVinculosExcel {
  constructor(private readonly armazenamento: ArmazenamentoChaveValor) {}

  async salvar(vinculo: VinculoColunaExcel): Promise<void> {
    await this.armazenamento.salvar(`${PREFIXO}${vinculo.id}`, vinculo);
  }

  async listarPorEntregador(entregadorId: string): Promise<VinculoColunaExcel[]> {
    const itens = await this.armazenamento.listar<VinculoColunaExcel>(PREFIXO);
    return itens.map((item) => item.valor).filter((item) => item.entregadorId === entregadorId).sort((a, b) => b.confirmadoEm.localeCompare(a.confirmadoEm));
  }

  async removerPorEntregador(entregadorId: string): Promise<void> {
    const itens = await this.armazenamento.listar<VinculoColunaExcel>(PREFIXO);
    for (const item of itens) {
      if (item.valor.entregadorId === entregadorId) await this.armazenamento.remover(item.chave);
    }
  }
}

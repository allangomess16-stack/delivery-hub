import type { RepositorioCargaEntregador } from "../../aplicacao/portas/repositorio-carga-entregador";
import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { ArmazenamentoChaveValor } from "./armazenamento-chave-valor";
import { encontrarCargaAtual } from "../../aplicacao/carga/encontrar-carga-atual";

export function criarChaveCargaLocal(carga: CargaEntregador): string {
  return `couriers/${carga.entregadorId}/loads/${carga.dataOperacao}/${carga.cargaId}`;
}

export class RepositorioCargaLocalAdapter implements RepositorioCargaEntregador {
  constructor(private readonly armazenamento: ArmazenamentoChaveValor) {}

  async salvarCarga(entregadorId: string, carga: CargaEntregador): Promise<void> {
    if (carga.entregadorId !== entregadorId) {
      throw new Error("A carga nao pertence ao entregador informado.");
    }
    await this.armazenamento.salvar(criarChaveCargaLocal(carga), carga);
  }

  async salvarCargas(cargas: readonly CargaEntregador[]): Promise<void> {
    for (const carga of cargas) {
      await this.salvarCarga(carga.entregadorId, carga);
    }
  }

  async obterCargaAtual(entregadorId: string): Promise<CargaEntregador | null> {
    const cargas = await this.listarCargas(entregadorId);
    return encontrarCargaAtual(cargas);
  }

  async listarCargas(entregadorId: string): Promise<CargaEntregador[]> {
    // O prefixo ja contem o entregadorId: o repositorio nao le a arvore de outro perfil.
    const todos = await this.armazenamento.listar<CargaEntregador>(`couriers/${entregadorId}/loads/`);
    return todos
      .map((item) => item.valor)
      .filter((carga) => carga.entregadorId === entregadorId)
      .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  }
}

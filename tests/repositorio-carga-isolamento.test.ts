import { describe, expect, it } from "vitest";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";
import { RepositorioCargaLocalAdapter } from "../src/infraestrutura/armazenamento/repositorio-carga-local-adapter";
import type { CargaEntregador } from "../src/dominio/carga/tipos";

function carga(entregadorId: string, cargaId: string): CargaEntregador {
  return { cargaId, cargaOrigemId: "origem", entregadorId, nomeEntregador: entregadorId, dataOperacao: "2026-08-29", nomeArquivoOrigem: "teste.xlsx", criadaEm: `2026-08-29T00:00:0${cargaId}.000Z`, pacotes: [], chaveRemotaSimulada: `loads/2026-08-29/couriers/${entregadorId}/${cargaId}` };
}

describe("RepositorioCargaLocalAdapter", () => {
  it("entrega somente cargas do entregador solicitado", async () => {
    const repo = new RepositorioCargaLocalAdapter(new ArmazenamentoMemoria());
    await repo.salvarCarga("ENT-PEDRO", carga("ENT-PEDRO", "1"));
    await repo.salvarCarga("ENT-CARLOS", carga("ENT-CARLOS", "2"));

    const pedro = await repo.listarCargas("ENT-PEDRO");
    expect(pedro).toHaveLength(1);
    expect(pedro[0]?.entregadorId).toBe("ENT-PEDRO");
  });

  it("recusa salvar uma carga em outro entregadorId", async () => {
    const repo = new RepositorioCargaLocalAdapter(new ArmazenamentoMemoria());
    await expect(repo.salvarCarga("ENT-PEDRO", carga("ENT-CARLOS", "2"))).rejects.toThrow();
  });
});

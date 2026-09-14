import { describe, expect, it } from "vitest";
import type { CargaEntregador } from "../src/dominio/carga/tipos";
import { RepositorioCargaLocalAdapter } from "../src/infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";

function carga(id: string, origemOperacional?: CargaEntregador["origemOperacional"]): CargaEntregador {
  return {
    cargaId: id,
    cargaOrigemId: id,
    entregadorId: "e1",
    nomeEntregador: "Allan",
    dataOperacao: "2026-09-10",
    nomeArquivoOrigem: origemOperacional === "SCANNER_UNIVERSAL" ? "Scanner universal" : "carga.xlsx",
    origemOperacional,
    criadaEm: origemOperacional === "SCANNER_UNIVERSAL"
      ? "2026-09-10T13:00:00.000Z"
      : "2026-09-10T12:00:00.000Z",
    chaveRemotaSimulada: id,
    status: "EM_OPERACAO",
    pacotes: [],
  };
}

describe("isolamento da carga livre", () => {
  it("nao substitui a carga oficial atual do entregador", async () => {
    const repositorio = new RepositorioCargaLocalAdapter(new ArmazenamentoMemoria());
    const oficial = carga("oficial", "IMPORTACAO");
    const livre = carga("livre", "SCANNER_UNIVERSAL");
    await repositorio.salvarCargas([oficial, livre]);

    expect((await repositorio.obterCargaAtual("e1"))?.cargaId).toBe("oficial");
    expect(await repositorio.listarCargas("e1")).toHaveLength(2);
  });

  it("mantem o scanner livre disponivel sem transforma-lo em carga oficial", async () => {
    const repositorio = new RepositorioCargaLocalAdapter(new ArmazenamentoMemoria());
    await repositorio.salvarCarga("e1", carga("livre", "SCANNER_UNIVERSAL"));

    expect(await repositorio.obterCargaAtual("e1")).toBeNull();
  });
});

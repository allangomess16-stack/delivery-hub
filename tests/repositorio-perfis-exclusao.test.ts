import { describe, expect, it } from "vitest";
import { RepositorioPerfisLocalAdapter } from "../src/infraestrutura/armazenamento/repositorio-perfis-local-adapter";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";

function perfil(id: string, alias: string) {
  const agora = new Date().toISOString();
  return { entregadorId: id, nomeOficial: alias, ativo: true, excelAliases: [alias], criadoEm: agora, atualizadoEm: agora };
}

describe("RepositorioPerfisLocalAdapter", () => {
  it("permite excluir um perfil sem afetar outro", async () => {
    const repo = new RepositorioPerfisLocalAdapter(new ArmazenamentoMemoria());
    await repo.salvar(perfil("ENT-A", "A"));
    await repo.salvar(perfil("ENT-B", "B"));
    await repo.excluir("ENT-A");
    expect(await repo.obter("ENT-A")).toBeNull();
    expect((await repo.obter("ENT-B"))?.nomeOficial).toBe("B");
  });
});

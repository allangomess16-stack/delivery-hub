import { describe, expect, it } from "vitest";
import { listarPerfisSemContaAtiva } from "../src/aplicacao/identidade/validar-acesso-perfis";
import type { RepositorioContasAcesso } from "../src/aplicacao/portas/repositorio-contas-acesso";
import type { ContaAcessoEntregador } from "../src/dominio/identidade/tipos";

const contas = new Map<string, ContaAcessoEntregador>([
  ["ENT-A", { usuarioId: "U-A", entregadorId: "ENT-A", email: "a@x.com", ativo: true, criadoEm: "x", atualizadoEm: "x" }],
  ["ENT-B", { usuarioId: "U-B", entregadorId: "ENT-B", email: "b@x.com", ativo: false, criadoEm: "x", atualizadoEm: "x" }],
]);

const repo: RepositorioContasAcesso = {
  listar: async () => [...contas.values()],
  obterPorEntregadorId: async (id) => contas.get(id) ?? null,
  salvar: async () => { throw new Error("nao usado"); },
  excluirPorEntregadorId: async () => undefined,
};

const perfil = (id: string) => ({
  colunaExcel: id,
  colunaNormalizada: id,
  entregadorId: id,
  perfil: { entregadorId: id, nomeOficial: id, ativo: true, excelAliases: [id], criadoEm: "x", atualizadoEm: "x" },
});

describe("listarPerfisSemContaAtiva", () => {
  it("detecta conta ausente e conta desativada", async () => {
    const resultado = await listarPerfisSemContaAtiva([perfil("ENT-A"), perfil("ENT-B"), perfil("ENT-C")], repo);
    expect(resultado).toEqual(["ENT-B", "ENT-C"]);
  });
});

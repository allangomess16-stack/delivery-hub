import { describe, expect, it } from "vitest";
import { salvarPerfilComAcesso } from "../src/aplicacao/identidade/salvar-perfil-com-acesso";
import type { DadosSalvarContaAcesso, RepositorioContasAcesso } from "../src/aplicacao/portas/repositorio-contas-acesso";
import type { RepositorioPerfisEntregador } from "../src/aplicacao/portas/repositorio-perfis-entregador";
import type { ContaAcessoEntregador, PerfilEntregador } from "../src/dominio/identidade/tipos";

class PerfisMemoria implements RepositorioPerfisEntregador {
  itens = new Map<string, PerfilEntregador>();
  async listar() { return [...this.itens.values()]; }
  async obter(id: string) { return this.itens.get(id) ?? null; }
  async salvar(perfil: PerfilEntregador) { this.itens.set(perfil.entregadorId, structuredClone(perfil)); }
  async excluir(id: string) { this.itens.delete(id); }
  async adicionarAlias(id: string, alias: string) {
    const atual = this.itens.get(id);
    if (!atual) throw new Error("perfil ausente");
    atual.excelAliases.push(alias);
    this.itens.set(id, atual);
    return atual;
  }
  async removerAlias(id: string, alias: string) {
    const atual = this.itens.get(id);
    if (!atual) throw new Error("perfil ausente");
    atual.excelAliases = atual.excelAliases.filter((item) => item !== alias);
    this.itens.set(id, atual);
    return atual;
  }
  async definirAtivo(id: string, ativo: boolean) {
    const atual = this.itens.get(id);
    if (!atual) throw new Error("perfil ausente");
    atual.ativo = ativo;
    this.itens.set(id, atual);
    return atual;
  }
}

class ContasMemoria implements RepositorioContasAcesso {
  itens = new Map<string, ContaAcessoEntregador>();
  falhar = false;
  async listar() { return [...this.itens.values()]; }
  async obterPorEntregadorId(id: string) { return this.itens.get(id) ?? null; }
  async salvar(dados: DadosSalvarContaAcesso) {
    if (this.falhar) throw new Error("email duplicado");
    const anterior = this.itens.get(dados.entregadorId);
    const conta: ContaAcessoEntregador = {
      usuarioId: anterior?.usuarioId ?? "U1",
      entregadorId: dados.entregadorId,
      email: dados.email,
      ativo: dados.ativo,
      criadoEm: anterior?.criadoEm ?? "2026-08-31T00:00:00.000Z",
      atualizadoEm: "2026-08-31T00:00:00.000Z",
    };
    this.itens.set(dados.entregadorId, conta);
    return conta;
  }
  async excluirPorEntregadorId(id: string) { this.itens.delete(id); }
}

function perfil(nome = "Pedro"): PerfilEntregador {
  return {
    entregadorId: "ENT-PEDRO",
    nomeOficial: nome,
    ativo: true,
    excelAliases: ["PEDRO"],
    criadoEm: "2026-08-31T00:00:00.000Z",
    atualizadoEm: "2026-08-31T00:00:00.000Z",
  };
}

describe("salvarPerfilComAcesso", () => {
  it("cria perfil e conta ligados pelo mesmo entregadorId", async () => {
    const perfis = new PerfisMemoria();
    const contas = new ContasMemoria();
    await salvarPerfilComAcesso(
      { perfil: perfil(), email: "pedro@email.com", senhaNova: "123456" },
      perfis,
      contas,
    );
    expect((await perfis.obter("ENT-PEDRO"))?.nomeOficial).toBe("Pedro");
    expect((await contas.obterPorEntregadorId("ENT-PEDRO"))?.email).toBe("pedro@email.com");
  });

  it("desfaz a criacao do perfil quando a conta falha", async () => {
    const perfis = new PerfisMemoria();
    const contas = new ContasMemoria();
    contas.falhar = true;
    await expect(salvarPerfilComAcesso(
      { perfil: perfil(), email: "duplicado@email.com", senhaNova: "123456" },
      perfis,
      contas,
    )).rejects.toThrow("email duplicado");
    expect(await perfis.obter("ENT-PEDRO")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { ConciliadorPerfisPlanilha } from "../src/aplicacao/identidade/conciliar-perfis-planilha";
import type { PerfilEntregador } from "../src/dominio/identidade/tipos";

function perfil(id: string, nome: string, aliases: string[], ativo = true): PerfilEntregador {
  return { entregadorId: id, nomeOficial: nome, ativo, excelAliases: aliases, criadoEm: "2026-08-29T00:00:00.000Z", atualizadoEm: "2026-08-29T00:00:00.000Z" };
}

const matcher = new ConciliadorPerfisPlanilha();

describe("ConciliadorPerfisPlanilha", () => {
  it("encontra nome exato", () => {
    const r = matcher.conciliar(["PEDRO"], [perfil("ENT-PEDRO", "Pedro", ["PEDRO"])]);
    expect(r.encontrados[0]?.entregadorId).toBe("ENT-PEDRO");
    expect(r.podeDistribuir).toBe(true);
  });

  it("aceita alias com acentos, caixa e espacos diferentes", () => {
    const r = matcher.conciliar(["  Pédro   Silva  "], [perfil("ENT-PEDRO", "Pedro Silva", ["PEDRO SILVA"])]);
    expect(r.encontrados).toHaveLength(1);
  });

  it("separa desconhecido", () => {
    const r = matcher.conciliar(["ROBERTO"], []);
    expect(r.desconhecidos).toHaveLength(1);
    expect(r.podeDistribuir).toBe(false);
  });

  it("bloqueia colisao de alias", () => {
    const r = matcher.conciliar(["PEDRO"], [perfil("1", "Pedro A", ["PEDRO"]), perfil("2", "Pedro B", ["PEDRO"])]);
    expect(r.conflitos).toHaveLength(1);
    expect(r.encontrados).toHaveLength(0);
    expect(r.podeDistribuir).toBe(false);
  });

  it("separa perfil inativo", () => {
    const r = matcher.conciliar(["PEDRO"], [perfil("1", "Pedro", ["PEDRO"], false)]);
    expect(r.inativos).toHaveLength(1);
    expect(r.podeDistribuir).toBe(false);
  });
});

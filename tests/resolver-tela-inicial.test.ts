import { describe, expect, it } from "vitest";
import { resolverTelaInicial } from "../src/aplicacao/navegacao/resolver-tela-inicial";

describe("resolverTelaInicial", () => {
  it("envia visitante para login", () => expect(resolverTelaInicial(null)).toBe("LOGIN"));
  it("envia admin para importacao", () => expect(resolverTelaInicial({ usuarioId: "1", email: "a@a", nome: "Admin", tipo: "ADMIN" })).toBe("ADMIN_IMPORTAR"));
  it("bloqueia entregador sem entregadorId", () => expect(resolverTelaInicial({ usuarioId: "2", email: "e@e", nome: "Entrega", tipo: "ENTREGADOR" })).toBe("PERFIL_SEM_VINCULO"));
  it("envia entregador vinculado para sua carga", () => expect(resolverTelaInicial({ usuarioId: "3", email: "e@e", nome: "Entrega", tipo: "ENTREGADOR", entregadorId: "ENT-1" })).toBe("ENTREGADOR_RESUMO"));
});

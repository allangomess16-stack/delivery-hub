import { describe, expect, it } from "vitest";
import { telaHome } from "../src/interface/telas/tela-home";

const usuario = {
  usuarioId: "U1",
  email: "allan@example.com",
  nome: "Allan",
  tipo: "ENTREGADOR" as const,
  entregadorId: "ENT-1",
};

describe("tela home", () => {
  it("oferece acesso à carga e mostra dados locais", () => {
    const html = telaHome(usuario, {
      entregasSemana: 8,
      pendentesHoje: 4,
      possuiCargaHoje: true,
      retomada: null,
      avisos: ["Sua carga de hoje está pronta para operação."],
    });
    expect(html).toContain("Olá, Allan");
    expect(html).toContain("Modo Piloto Ativo");
    expect(html).toContain("ACESSAR CARGA DE HOJE");
    expect(html).toContain("ENTREGAS NA SEMANA");
  });

  it("prioriza retomada e mantém scanner universal quando não há carga", () => {
    const base = {
      entregasSemana: 0,
      pendentesHoje: 0,
      possuiCargaHoje: false,
      avisos: ["Nenhuma carga ativa."],
    };
    const livre = telaHome(usuario, { ...base, retomada: null });
    expect(livre).toContain("INICIAR SCANNER UNIVERSAL");

    const retomada = telaHome(usuario, {
      ...base,
      retomada: {
        carga: {} as never,
        pacote: { codigoNormalizado: "6082326468665" } as never,
      },
    });
    expect(retomada).toContain("RETOMAR ENTREGA");
    expect(retomada).toContain("ENTREGA PRESERVADA");
  });
});

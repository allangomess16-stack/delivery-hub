import { describe, expect, it } from "vitest";
import { particionarCargaPorPerfil } from "../src/aplicacao/carga/particionar-carga-por-perfil";
import type { CargaImportada } from "../src/dominio/carga/tipos";
import type { PerfilEncontrado } from "../src/aplicacao/identidade/conciliar-perfis-planilha";

const carga: CargaImportada = {
  id: "origem", nomeArquivo: "teste.xlsx", importadaEm: "2026-08-29T00:00:00.000Z", entregadores: ["PEDRO", "PEDRO S."],
  pacotes: [
    { id: "1", entregador: "PEDRO", codigoOriginal: "1", codigoNormalizado: "1", transportadora: { id: "OUTRA", nome: "Outra", confianca: "DESCONHECIDA" }, precisaRevisao: false },
    { id: "2", entregador: "PEDRO S.", codigoOriginal: "2", codigoNormalizado: "2", transportadora: { id: "OUTRA", nome: "Outra", confianca: "DESCONHECIDA" }, precisaRevisao: false },
  ],
};

const perfil = { entregadorId: "ENT-PEDRO", nomeOficial: "Pedro", ativo: true, excelAliases: ["PEDRO", "PEDRO S."], criadoEm: "x", atualizadoEm: "x" };
const encontrados: PerfilEncontrado[] = [
  { colunaExcel: "PEDRO", colunaNormalizada: "PEDRO", entregadorId: "ENT-PEDRO", perfil },
  { colunaExcel: "PEDRO S.", colunaNormalizada: "PEDRO S.", entregadorId: "ENT-PEDRO", perfil },
];

describe("particionarCargaPorPerfil", () => {
  it("combina duas colunas conciliadas no mesmo perfil sem duplicar a carga", () => {
    const cargas = particionarCargaPorPerfil(carga, encontrados, "2026-08-29");
    expect(cargas).toHaveLength(1);
    expect(cargas[0]?.pacotes).toHaveLength(2);
  });
});

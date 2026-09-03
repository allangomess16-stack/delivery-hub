import { describe, expect, it } from "vitest";
import {
  adicionarPacoteNaCarga,
  criarCargaManual,
  criarPacoteManual,
  transferirPacotesSelecionados,
} from "../src/aplicacao/carga/gestao-manual-carga";
import { iniciarEntrega } from "../src/aplicacao/estado-entrega";
import type { PerfilEntregador } from "../src/dominio/identidade/tipos";

function perfil(id: string, nome: string): PerfilEntregador {
  const agora = new Date().toISOString();
  return { entregadorId: id, nomeOficial: nome, ativo: true, excelAliases: [nome], criadoEm: agora, atualizadoEm: agora };
}

describe("transferencia parcial por selecao", () => {
  it("move apenas ids selecionados", () => {
    const origem = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    const destino = criarCargaManual(perfil("ENT-B", "B"), "2026-08-31");
    const p1 = criarPacoteManual("999881790335907", "A", "Ceilandia DF");
    const p2 = criarPacoteManual("888002431695151", "A", "Ceilandia DF");
    adicionarPacoteNaCarga(origem, p1);
    adicionarPacoteNaCarga(origem, p2);

    const resultado = transferirPacotesSelecionados(origem, destino, [p1.id]);
    expect(resultado.movidos).toBe(1);
    expect(origem.pacotes.map((p) => p.id)).toEqual([p2.id]);
    expect(destino.pacotes.map((p) => p.id)).toEqual([p1.id]);
  });

  it("nao move pacote que ja entrou em operacao", () => {
    const origem = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    const destino = criarCargaManual(perfil("ENT-B", "B"), "2026-08-31");
    const pacote = criarPacoteManual("999881790335907", "A", "Taguatinga DF");
    adicionarPacoteNaCarga(origem, pacote);
    iniciarEntrega(pacote);

    const resultado = transferirPacotesSelecionados(origem, destino, [pacote.id]);
    expect(resultado.movidos).toBe(0);
    expect(resultado.bloqueados).toBe(1);
  });
});

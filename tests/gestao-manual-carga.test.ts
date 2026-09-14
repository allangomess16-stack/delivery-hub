import { describe, expect, it } from "vitest";
import {
  adicionarPacoteNaCarga,
  criarCargaManual,
  criarPacoteManual,
  publicarCarga,
  transferirPacote,
  transferirPendentes,
  encerrarCarga,
  excluirCargaDeTeste,
  podeExcluirCargaDeTeste,
} from "../src/aplicacao/carga/gestao-manual-carga";
import { iniciarEntrega } from "../src/aplicacao/estado-entrega";
import type { PerfilEntregador } from "../src/dominio/identidade/tipos";

function perfil(id: string, nome: string): PerfilEntregador {
  const agora = new Date().toISOString();
  return {
    entregadorId: id,
    nomeOficial: nome,
    ativo: true,
    excelAliases: [nome],
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

describe("gestao manual de cargas", () => {
  it("cria carga manual como rascunho e publica depois", () => {
    const carga = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    expect(carga.status).toBe("RASCUNHO");

    adicionarPacoteNaCarga(carga, criarPacoteManual("999881790335907", "A"));
    publicarCarga(carga);

    expect(carga.status).toBe("PUBLICADA");
    expect(carga.pacotes).toHaveLength(1);
  });

  it("transfere pacote pendente sem duplica-lo", () => {
    const a = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    const b = criarCargaManual(perfil("ENT-B", "B"), "2026-08-31");
    const pacote = criarPacoteManual("999881790335907", "A");
    adicionarPacoteNaCarga(a, pacote);

    transferirPacote(a, b, pacote.id);

    expect(a.pacotes).toHaveLength(0);
    expect(b.pacotes).toHaveLength(1);
    expect(b.pacotes[0].origem).toBe("TRANSFERENCIA");
    expect(b.pacotes[0].transferidoDeEntregadorId).toBe("ENT-A");
  });

  it("bloqueia transferencia depois que a operacao iniciou", () => {
    const a = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    const b = criarCargaManual(perfil("ENT-B", "B"), "2026-08-31");
    const pacote = criarPacoteManual("999881790335907", "A");
    adicionarPacoteNaCarga(a, pacote);
    iniciarEntrega(pacote);

    expect(() => transferirPacote(a, b, pacote.id)).toThrow();
  });

  it("transfere somente pendentes em uma substituicao de entregador", () => {
    const a = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    const b = criarCargaManual(perfil("ENT-B", "B"), "2026-08-31");
    const p1 = criarPacoteManual("999881790335907", "A");
    const p2 = criarPacoteManual("888002431695151", "A");
    adicionarPacoteNaCarga(a, p1);
    adicionarPacoteNaCarga(a, p2);
    iniciarEntrega(p2);

    const movidos = transferirPendentes(a, b);

    expect(movidos).toBe(1);
    expect(a.pacotes).toHaveLength(1);
    expect(b.pacotes).toHaveLength(1);
  });

  it("impede transferencia entre datas diferentes", () => {
    const a = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    const b = criarCargaManual(perfil("ENT-B", "B"), "2026-09-01");
    const pacote = criarPacoteManual("999881790335907", "A");
    adicionarPacoteNaCarga(a, pacote);
    expect(() => transferirPacote(a, b, pacote.id)).toThrow("mesma data");
  });

  it("nao reabre uma carga encerrada", () => {
    const carga = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    encerrarCarga(carga);
    expect(() => publicarCarga(carga)).toThrow("encerrada");
  });

  it("remove uma carga de teste sem apaga-la do historico remoto", () => {
    const carga = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    adicionarPacoteNaCarga(carga, criarPacoteManual("999881790335907", "A"));

    expect(podeExcluirCargaDeTeste(carga)).toBe(true);
    excluirCargaDeTeste(carga);

    expect(carga.status).toBe("ENCERRADA");
    expect(carga.motivoEncerramento).toBe("EXCLUIDA_TESTE");
    expect(carga.pacotes).toEqual([]);
    expect(carga.encerradaEm).toBeTruthy();
  });

  it("protege uma carga cuja operacao ja foi iniciada", () => {
    const carga = criarCargaManual(perfil("ENT-A", "A"), "2026-08-31");
    const pacote = criarPacoteManual("999881790335907", "A");
    adicionarPacoteNaCarga(carga, pacote);
    iniciarEntrega(pacote);

    expect(podeExcluirCargaDeTeste(carga)).toBe(false);
    expect(() => excluirCargaDeTeste(carga)).toThrow("operacao iniciada");
  });
});

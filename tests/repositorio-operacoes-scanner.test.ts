import { describe, expect, it } from "vitest";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";
import { RepositorioOperacoesScannerIndexedDb } from "../src/infraestrutura/scanner/repositorio-operacoes-scanner-indexeddb";
import type { ResultadoScannerUniversal } from "../src/dominio/scanner/tipos";

const leitura: ResultadoScannerUniversal = {
  tracking: "6082326468665",
  transportadora: { id: "IMILE", nome: "iMile", confianca: "ALTA" },
  origem: "SCANNER_LIVRE",
};

describe("historico idempotente do scanner", () => {
  it("reusa o registro diario e incrementa tentativas para o mesmo tracking", async () => {
    const repositorio = new RepositorioOperacoesScannerIndexedDb(new ArmazenamentoMemoria());
    const primeira = await repositorio.registrarLeitura("ENT-A", leitura);
    const segunda = await repositorio.registrarLeitura("ENT-A", leitura);

    expect(segunda.registroId).toBe(primeira.registroId);
    expect(segunda.tentativas).toBe(2);
  });

  it("atualiza o resultado sem criar outra operacao", async () => {
    const repositorio = new RepositorioOperacoesScannerIndexedDb(new ArmazenamentoMemoria());
    const registro = await repositorio.registrarLeitura("ENT-A", leitura);
    await repositorio.registrarResultado(registro.registroId, "DESPACHADO", "DESPACHADO_VALIDADO");

    const encontrados = await repositorio.listarDia("ENT-A", registro.diaOperacao);
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]).toMatchObject({
      estado: "DESPACHADO",
      codigoResultado: "DESPACHADO_VALIDADO",
    });
  });
});

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { LeitorXlsx } from "../src/infraestrutura/planilha/leitor-xlsx";

function arquivoPlanilha(linhas: unknown[][]): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(linhas), "CARGAS");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return {
    name: "cargas.xlsx",
    arrayBuffer: async () => bytes,
  } as File;
}

describe("LeitorXlsx - rastreabilidade da origem", () => {
  it("ignora a coluna de numeracao e guarda a celula real do tracking", async () => {
    const carga = await new LeitorXlsx().ler(arquivoPlanilha([
      ["Nº", "ANA", "PEDRO"],
      [1, "6082326468665", null],
      [2, null, "3320070889129"],
    ]));

    expect(carga.entregadores).toEqual(["ANA", "PEDRO"]);
    expect(carga.pacotes).toHaveLength(2);
    expect(carga.pacotes[0]?.origemPlanilha).toMatchObject({ linha: 2, coluna: 2, celula: "B2", cabecalho: "ANA" });
    expect(carga.pacotes[1]?.origemPlanilha).toMatchObject({ linha: 3, coluna: 3, celula: "C3", cabecalho: "PEDRO" });
  });

  it("mantem a linha original mesmo quando existe uma linha vazia", async () => {
    const carga = await new LeitorXlsx().ler(arquivoPlanilha([
      ["Nº", "ANA"],
      [1, "6082326468665"],
      [null, null],
      [3, "3320070889129"],
    ]));

    expect(carga.pacotes[1]?.origemPlanilha?.celula).toBe("B4");
  });

  it("ignora a primeira coluna sequencial mesmo com cabecalho desconhecido", async () => {
    const carga = await new LeitorXlsx().ler(arquivoPlanilha([
      ["CONTROLE INTERNO", "ANA"],
      [1, "6082326468665"],
      [2, "3320070889129"],
    ]));

    expect(carga.entregadores).toEqual(["ANA"]);
    expect(carga.pacotes).toHaveLength(2);
  });
});

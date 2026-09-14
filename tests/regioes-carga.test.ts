import { describe, expect, it } from "vitest";
import { resolverRegiaoPorEndereco } from "../src/aplicacao/regiao/resolver-regiao-endereco";
import { resumirCargaPorRegiao } from "../src/aplicacao/regiao/resumir-carga-por-regiao";
import { definirLocalizacaoPacote } from "../src/aplicacao/regiao/atribuir-localizacao-pacote";
import { criarPacoteManual } from "../src/aplicacao/carga/gestao-manual-carga";

 describe("regioes da carga", () => {
  it("prefere Riacho Fundo II ao encontrar o nome completo", () => {
    const resultado = resolverRegiaoPorEndereco("QS 10 conjunto 3, Riacho Fundo II - DF");
    expect(resultado.regiao?.regiaoId).toBe("RA-21");
  });

  it("identifica Ceilandia ignorando acento e caixa", () => {
    const resultado = resolverRegiaoPorEndereco("QNM 12, Ceilândia - DF");
    expect(resultado.regiao?.nome).toBe("Ceilândia");
  });

  it("permite regiao personalizada para Entorno", () => {
    const pacote = criarPacoteManual("999881790335907", "A");
    definirLocalizacaoPacote(pacote, {
      endereco: "Centro, Valparaiso de Goias",
      regiaoPersonalizada: "Valparaiso de Goias",
      origemRegiao: "MANUAL",
    });
    expect(pacote.regiaoEntrega?.nome).toBe("Valparaiso de Goias");
    expect(pacote.regiaoEntrega?.regiaoId).toContain("CUSTOM-");
  });

  it("agrupa pacotes sem regiao em bucket separado", () => {
    const a = criarPacoteManual("999881790335907", "A", "QNM 12, Ceilandia - DF");
    const b = criarPacoteManual("888002431695151", "A");
    const resumo = resumirCargaPorRegiao([a, b]);
    expect(resumo.find((item) => item.regiaoId === "RA-09")?.total).toBe(1);
    expect(resumo.find((item) => item.regiaoId === "SEM-REGIAO")?.total).toBe(1);
  });
});

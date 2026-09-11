import { describe, expect, it } from "vitest";
import {
  analisarCodigosEtiqueta,
  resumoIntegracaoDaEtiqueta,
} from "../src/aplicacao/homologacao/analisar-etiqueta";

describe("homologacao - leitura livre de etiqueta", () => {
  it("reconhece J&T mesmo sem a encomenda existir em uma carga", () => {
    const resultado = analisarCodigosEtiqueta(["999881790335907"]);

    expect(resultado.principal?.normalizado).toBe("999881790335907");
    expect(resultado.principal?.transportadora).toBe("JNT");
    expect(resumoIntegracaoDaEtiqueta("JNT").packageName).toBeNull();
  });

  it("normaliza texto bruto TN e reconhece J&T", () => {
    const resultado = analisarCodigosEtiqueta([
      "`^ID^47780714391^,^TN^888002431695151^{",
    ]);

    expect(resultado.principal?.normalizado).toBe("888002431695151");
    expect(resultado.principal?.transportadora).toBe("JNT");
  });

  it("reconhece Anjun e informa package conhecido", () => {
    const resultado = analisarCodigosEtiqueta(["AJ260818113988201"]);
    expect(resultado.principal?.transportadora).toBe("ANJUN");
    expect(resumoIntegracaoDaEtiqueta("ANJUN").packageName).toBe(
      "com.anjun.supplierManagement",
    );
  });

  it("reconhece iMile", () => {
    expect(
      analisarCodigosEtiqueta(["3320094881787"]).principal?.transportadora,
    ).toBe("IMILE");
  });


  it("reconhece Anjun com AJ mais 14 digitos observado em teste mobile", () => {
    const resultado = analisarCodigosEtiqueta(["AJ26082013279801"]);
    expect(resultado.principal?.transportadora).toBe("ANJUN");
    expect(resultado.principal?.regraUsada).toBe("ANJUN_AJ_16");
  });

  it("reconhece tracking iMile da etiqueta real usada na homologacao", () => {
    const resultado = analisarCodigosEtiqueta(["6082326246225"]);
    expect(resultado.principal?.transportadora).toBe("IMILE");
    expect(resultado.principal?.regraUsada).toBe("IMILE_608_13");
  });

  it("nao inventa transportadora para codigo desconhecido", () => {
    const resultado = analisarCodigosEtiqueta(["CNBR00165141956"]);
    expect(resultado.principal?.transportadora).toBe("OUTRA");
  });

  it("pede escolha se a imagem trouxer mais de um tracking reconhecido", () => {
    const resultado = analisarCodigosEtiqueta([
      "999881790335907",
      "3320094881787",
    ]);

    expect(resultado.principal).toBeNull();
    expect(resultado.exigeEscolha).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { normalizarCodigo } from "../src/aplicacao/normalizar-codigo";

describe("normalizarCodigo", () => {
  it("mantem codigo numerico seguro como texto", () => {
    expect(normalizarCodigo(888002420473763).codigo).toBe("888002420473763");
  });

  it("extrai TN de texto bruto de scanner", () => {
    const resultado = normalizarCodigo("`^ID^47780714391^,^T^LM^,^TN^888002431695151^{");
    expect(resultado.codigo).toBe("888002431695151");
  });

  it("normaliza codigo AJ para maiusculo", () => {
    expect(normalizarCodigo("aj260811142092101").codigo).toBe("AJ260811142092101");
  });

  it("recupera Anjun quando a planilha adiciona sujeira antes do codigo", () => {
    expect(normalizarCodigo("A2AJ608101081639012").codigo).toBe("AJ608101081639012");
  });
});

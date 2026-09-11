import { describe, expect, it } from "vitest";
import { CODIGOS_ERRO } from "../src/dominio/diagnostico/codigos-erro";

describe("Catalogo de codigos de erro", () => {
  it("mantem codigos unicos e sem dados operacionais", () => {
    const codigos = Object.values(CODIGOS_ERRO);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(codigos.every((codigo) => /^DH-[A-Z]+-S\d{2}-[A-Z]+$/.test(codigo))).toBe(true);
  });
});

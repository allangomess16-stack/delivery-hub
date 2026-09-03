import { describe, expect, it } from "vitest";
import { identificarTransportadora } from "../src/aplicacao/identificar-transportadora";

describe("identificarTransportadora", () => {
  it("identifica J&T 99988", () => {
    expect(identificarTransportadora("999881790335907").id).toBe("JNT");
  });

  it("identifica J&T 8880", () => {
    expect(identificarTransportadora("888002420473763").id).toBe("JNT");
  });

  it("identifica iMile", () => {
    expect(identificarTransportadora("3320094881787").id).toBe("IMILE");
    expect(identificarTransportadora("6082326468665").id).toBe("IMILE");
  });

  it("identifica Anjun", () => {
    expect(identificarTransportadora("AJ260818113988201").id).toBe("ANJUN");
  });

  it("mantem desconhecido sem inventar empresa", () => {
    expect(identificarTransportadora("CNBR00165141956").id).toBe("OUTRA");
  });
});

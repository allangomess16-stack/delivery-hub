import { describe, expect, it } from "vitest";
import { ConfirmadorLeituraFrames } from "../src/aplicacao/homologacao/confirmador-leitura-frames";

describe("confirmador de leitura por quadros", () => {
  it("nao confirma um tracking conhecido em apenas um quadro", () => {
    const confirmador = new ConfirmadorLeituraFrames(2);
    const resultado = confirmador.registrar(["6082326246225"], 1_000);

    expect(resultado.confirmado).toBe(false);
    expect(resultado.leituras).toBe(1);
    expect(resultado.candidato?.transportadora).toBe("IMILE");
  });

  it("confirma o mesmo tracking conhecido em dois quadros", () => {
    const confirmador = new ConfirmadorLeituraFrames(2);
    confirmador.registrar(["6082326246225"], 1_000);
    const resultado = confirmador.registrar(["6082326246225"], 1_500);

    expect(resultado.confirmado).toBe(true);
    expect(resultado.analise?.principal?.normalizado).toBe("6082326246225");
    expect(resultado.analise?.principal?.transportadora).toBe("IMILE");
  });

  it("prefere um tracking conhecido quando o mesmo quadro tambem contem QR desconhecido", () => {
    const confirmador = new ConfirmadorLeituraFrames(2);
    confirmador.registrar(["6082326246225", "DROPSHIP-ORDER-998"], 1_000);
    const resultado = confirmador.registrar(
      ["6082326246225", "DROPSHIP-ORDER-998"],
      1_400,
    );

    expect(resultado.confirmado).toBe(true);
    expect(resultado.candidato?.normalizado).toBe("6082326246225");
  });

  it("expira uma leitura antiga e exige nova confirmacao", () => {
    const confirmador = new ConfirmadorLeituraFrames(2, 2_500);
    confirmador.registrar(["AJ26082013279801"], 1_000);
    const resultado = confirmador.registrar(["AJ26082013279801"], 4_000);

    expect(resultado.confirmado).toBe(false);
    expect(resultado.leituras).toBe(1);
  });
});

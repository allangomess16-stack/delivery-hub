import { describe, expect, it } from "vitest";
import {
  INTEGRACOES_TRANSPORTADORAS,
  obterIntegracaoTransportadora,
} from "../src/configuracao/integracoes-transportadoras";
import {
  capacidadeAutomaticaPermitida,
  resolverIntegracao,
} from "../src/aplicacao/integracao/resolver-integracao";

describe("registro de integracoes", () => {
  it("registra o package real descoberto da Anjun", () => {
    expect(INTEGRACOES_TRANSPORTADORAS.ANJUN.packageName).toBe(
      "com.anjun.supplierManagement",
    );
    expect(INTEGRACOES_TRANSPORTADORAS.ANJUN.apk?.versaoNome).toBe("2.1.4");
  });

  it("registra o package real descoberto da iMile", () => {
    expect(INTEGRACOES_TRANSPORTADORAS.IMILE.packageName).toBe(
      "com.imile.redelivery",
    );
    expect(INTEGRACOES_TRANSPORTADORAS.IMILE.fileProviderAuthority).toBe(
      "com.imile.redelivery.fileprovider",
    );
  });

  it("mantem J&T como desconhecido ate chegar o APK correto", () => {
    expect(INTEGRACOES_TRANSPORTADORAS.JNT.packageName).toBeNull();
    expect(obterIntegracaoTransportadora("JNT")?.nivelPackage).toBe("UNKNOWN");
  });

  it("nao libera automacao so porque a capacidade foi descoberta no codigo", () => {
    const imile = INTEGRACOES_TRANSPORTADORAS.IMILE;
    expect(capacidadeAutomaticaPermitida(imile, "ABRIR_APP")).toBe(false);
    expect(resolverIntegracao("IMILE").automatica).toBe(false);
    expect(resolverIntegracao("IMILE").estrategia).toBe("ASSISTIDO_MANUAL");
  });

  it("nao inventa integracao para transportadora generica", () => {
    const plano = resolverIntegracao("OUTRA");
    expect(plano.packageName).toBeNull();
    expect(plano.automatica).toBe(false);
  });
});

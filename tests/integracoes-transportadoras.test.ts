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
    expect(INTEGRACOES_TRANSPORTADORAS.ANJUN.apk?.versaoNome).toBe("2.4.0");
  });

  it("registra o package real descoberto da iMile", () => {
    expect(INTEGRACOES_TRANSPORTADORAS.IMILE.packageName).toBe(
      "com.imile.redelivery",
    );
    expect(INTEGRACOES_TRANSPORTADORAS.IMILE.apk?.versaoNome).toBe("2.3.21");
    expect(INTEGRACOES_TRANSPORTADORAS.IMILE.apk?.versaoCodigo).toBe("461");
    expect(INTEGRACOES_TRANSPORTADORAS.IMILE.nivelPackage).toBe("DEVICE_VALIDATED");
    expect(INTEGRACOES_TRANSPORTADORAS.IMILE.fileProviderAuthority).toBe(
      "com.imile.redelivery.fileprovider",
    );
  });

  it("isola a evidencia iMile sem promover Anjun ou J&T", () => {
    const deepLinkIMile = INTEGRACOES_TRANSPORTADORAS.IMILE.capacidades.find(
      (item) => item.capacidade === "DEEP_LINK",
    );
    const deepLinkAnjun = INTEGRACOES_TRANSPORTADORAS.ANJUN.capacidades.find(
      (item) => item.capacidade === "DEEP_LINK",
    );

    expect(deepLinkIMile?.nivel).toBe("DEVICE_VALIDATED");
    expect(deepLinkAnjun?.nivel).toBe("UNKNOWN");
    expect(INTEGRACOES_TRANSPORTADORAS.JNT.nivelPackage).toBe("UNKNOWN");
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

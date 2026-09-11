import { describe, expect, it, vi } from "vitest";
import type {
  CodigoAberturaNativa,
  PonteNativa,
} from "../src/aplicacao/portas/ponte-nativa";
import type { RepositorioContratosIntegracao } from "../src/aplicacao/portas/repositorio-contratos-integracao";
import type { RepositorioTelemetriaIntegracao } from "../src/aplicacao/portas/repositorio-telemetria-integracao";
import { POLITICA_IMILE_2_3_18, POLITICA_IMILE_2_3_21 } from "../src/configuracao/contratos-integracao/imile-2-3-18";
import { CAPACIDADE_POD_IMILE_2_3_21 } from "../src/configuracao/contratos-integracao/imile-2-3-18";
import {
  CONTRATO_IMILE_2_3_18,
  IMileAdapter,
  TRACKING_SINTETICO_IMILE,
} from "../src/infraestrutura/integracoes/imile-adapter";

function criarPonte(
  opcoes: {
    instalada?: boolean;
    consultaConcluida?: boolean;
    versionCode?: string;
    deepLinkDespachado?: boolean;
    appDespachado?: boolean;
    copiado?: boolean;
    lancarAoConsultar?: boolean;
    lancarAoAbrirDeepLink?: boolean;
    lancarAoCopiar?: boolean;
    lancarAoAbrirApp?: boolean;
  } = {},
): PonteNativa {
  const instalada = opcoes.instalada ?? true;
  const consultaConcluida = opcoes.consultaConcluida ?? true;
  const versionCode = opcoes.versionCode ?? "458";

  return {
    consultarApp: vi.fn(async (packageName) => {
      if (opcoes.lancarAoConsultar) throw new Error("ponte indisponivel");
      return {
        packageName,
        instalado: instalada,
        consultaConcluida,
        erroCodigo: consultaConcluida ? undefined : "DH-NAT-S02-PONTE",
        versionName: instalada ? "2.3.18" : undefined,
        versionCode: instalada ? versionCode : undefined,
      };
    }),
    abrirDeepLink: vi.fn(async (_uri, packageName) => {
      if (opcoes.lancarAoAbrirDeepLink) throw new Error("intent falhou");
      const despachado = opcoes.deepLinkDespachado ?? true;
      return {
        codigo: (despachado ? "DESPACHADO" : "ACAO_NAO_SUPORTADA") as CodigoAberturaNativa,
        despachado,
        packageName,
        mensagem: despachado ? "Intent enviada." : "Acao indisponivel.",
      };
    }),
    abrirAplicativo: vi.fn(async (packageName) => {
      if (opcoes.lancarAoAbrirApp) throw new Error("launcher falhou");
      const despachado = opcoes.appDespachado ?? true;
      return {
        codigo: (despachado ? "DESPACHADO" : "ACAO_NAO_SUPORTADA") as CodigoAberturaNativa,
        despachado,
        packageName,
        mensagem: despachado ? "App aberto." : "App indisponivel.",
      };
    }),
    copiarTexto: vi.fn(async () => {
      if (opcoes.lancarAoCopiar) throw new Error("clipboard falhou");
      const copiado = opcoes.copiado ?? true;
      return {
        codigo: copiado ? "COPIADO" as const : "FALHA_NATIVA" as const,
        copiado,
        mensagem: copiado ? "Copiado." : "Falha.",
      };
    }),
  };
}

function criarContratos(versionCode = "458"): RepositorioContratosIntegracao {
  return {
    resolver: vi.fn(async () => ({
      ...POLITICA_IMILE_2_3_18,
      versionCode,
      origem: versionCode === "458" ? "EMBARCADO" as const : "PADRAO_SEGURO" as const,
      expirado: false,
      ...(versionCode === "458" ? {} : {
        protocoloId: null,
        versaoContrato: 0,
        modo: "CLIPBOARD_APP" as const,
        evidencia: "UNKNOWN" as const,
      }),
    })),
    definir: vi.fn(async () => undefined),
  };
}

function criarTelemetria(): RepositorioTelemetriaIntegracao {
  return {
    registrar: vi.fn(async () => undefined),
    listarDia: vi.fn(async () => []),
  };
}

function criarAdapter(
  ponte: PonteNativa,
  contratos: RepositorioContratosIntegracao = criarContratos(),
): IMileAdapter {
  return new IMileAdapter(ponte, contratos, criarTelemetria());
}

describe("IMileAdapter V0.4.8", () => {
  it("mantem o contrato 2.3.18 congelado na evidencia obtida no aparelho", () => {
    expect(CONTRATO_IMILE_2_3_18.versionCode).toBe("458");
    expect(CONTRATO_IMILE_2_3_18.evidencia).toBe("DEVICE_VALIDATED");
  });

  it("aceita a versao 461 somente por ter evidencia propria no aparelho", async () => {
    const contratos: RepositorioContratosIntegracao = {
      resolver: vi.fn(async () => ({ ...POLITICA_IMILE_2_3_21, origem: "EMBARCADO" as const, expirado: false })),
      definir: vi.fn(async () => undefined),
    };
    const ponte = criarPonte({ versionCode: "461" });
    const resultado = await criarAdapter(ponte, contratos).abrirPesquisaPorTracking({
      tracking: TRACKING_SINTETICO_IMILE,
      modo: "HOMOLOGACAO",
    });
    expect(resultado.codigo).toBe("DESPACHADO_VALIDADO");
    expect(ponte.abrirDeepLink).toHaveBeenCalledWith(
      "crredelivery:?requestCode=DH_TESTE_INVALIDO",
      CONTRATO_IMILE_2_3_18.packageName,
    );
  });

  it("expõe a matriz conservadora: somente tracking é automático na 2.3.21", () => {
    const capacidade = criarAdapter(criarPonte()).obterCapacidadePod();
    expect(capacidade).toEqual(CAPACIDADE_POD_IMILE_2_3_21);
    expect(capacidade.tracking).toBe("PREENCHIDO_AUTOMATICAMENTE");
    expect(capacidade.fotos).toBe("PREENCHER_NO_APP");
    expect(capacidade.assinatura).toBe("PREENCHER_NO_APP");
  });

  it("monta a URI exata e nao confunde despacho com baixa confirmada", async () => {
    const ponte = criarPonte();
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: TRACKING_SINTETICO_IMILE,
      modo: "HOMOLOGACAO",
    });

    expect(resultado.codigo).toBe("DESPACHADO_VALIDADO");
    expect(resultado.mensagem).toContain("baixa ainda deve ser concluida");
    expect(ponte.abrirDeepLink).toHaveBeenCalledWith(
      "crredelivery:?requestCode=DH_TESTE_INVALIDO",
      CONTRATO_IMILE_2_3_18.packageName,
    );
  });

  it("rejeita separadores que explorariam o split fragil da iMile", async () => {
    const ponte = criarPonte();
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: "6082326468665&outro=valor",
      modo: "OPERACAO",
    });

    expect(resultado.codigo).toBe("TRACKING_INVALIDO");
    expect(ponte.consultarApp).not.toHaveBeenCalled();
  });

  it("usa clipboard e abre o app quando a versao e desconhecida", async () => {
    const ponte = criarPonte({ versionCode: "459" });
    const resultado = await criarAdapter(ponte, criarContratos("459"))
      .abrirPesquisaPorTracking({
        tracking: TRACKING_SINTETICO_IMILE,
        modo: "HOMOLOGACAO",
      });

    expect(resultado.codigo).toBe("FALLBACK_CLIPBOARD");
    expect(ponte.abrirDeepLink).not.toHaveBeenCalled();
    expect(ponte.copiarTexto).toHaveBeenCalledWith(TRACKING_SINTETICO_IMILE);
    expect(ponte.abrirAplicativo).toHaveBeenCalledWith(CONTRATO_IMILE_2_3_18.packageName);
  });

  it("degrada para clipboard quando o deep link homologado falha", async () => {
    const ponte = criarPonte({ deepLinkDespachado: false });
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: "6082326468665",
      modo: "OPERACAO",
    });

    expect(resultado.codigo).toBe("FALLBACK_CLIPBOARD");
    expect(ponte.copiarTexto).toHaveBeenCalled();
    expect(ponte.abrirAplicativo).toHaveBeenCalled();
  });

  it("mantem orientacao manual se nem o app puder ser aberto", async () => {
    const ponte = criarPonte({ deepLinkDespachado: false, appDespachado: false });
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: "6082326468665",
      modo: "OPERACAO",
    });

    expect(resultado.codigo).toBe("ACAO_MANUAL");
    expect(resultado.mensagem).toContain("Codigo copiado");
  });

  it("nao tenta fallback quando o aplicativo nao esta instalado", async () => {
    const ponte = criarPonte({ instalada: false });
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: TRACKING_SINTETICO_IMILE,
      modo: "HOMOLOGACAO",
    });

    expect(resultado.codigo).toBe("APP_NAO_INSTALADO");
    expect(ponte.copiarTexto).not.toHaveBeenCalled();
  });

  it("nao confunde falha da ponte com aplicativo ausente", async () => {
    const ponte = criarPonte({ instalada: false, consultaConcluida: false });
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: TRACKING_SINTETICO_IMILE,
      modo: "HOMOLOGACAO",
    });

    expect(resultado.codigo).toBe("INTEGRACAO_INDISPONIVEL");
    expect(resultado.mensagem).not.toContain("nao foi encontrado");
  });

  it("trata exceção da ponte como falha operacional e não quebra o fluxo", async () => {
    const ponte = criarPonte({ lancarAoAbrirDeepLink: true });
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: "6082326468665",
      modo: "OPERACAO",
    });

    expect(resultado.codigo).toBe("FALLBACK_CLIPBOARD");
    expect(ponte.copiarTexto).toHaveBeenCalledOnce();
  });

  it("registra orientação manual quando a consulta nativa lança exceção", async () => {
    const ponte = criarPonte({ lancarAoConsultar: true });
    const resultado = await criarAdapter(ponte).abrirPesquisaPorTracking({
      tracking: TRACKING_SINTETICO_IMILE,
      modo: "HOMOLOGACAO",
    });

    expect(resultado.codigo).toBe("INTEGRACAO_INDISPONIVEL");
    expect(resultado.estrategia).toBe("MANUAL");
  });
});

import { describe, expect, it, vi } from "vitest";
import type { PonteNativa } from "../src/aplicacao/portas/ponte-nativa";
import { AnjunAdapter } from "../src/infraestrutura/integracoes/anjun-adapter";

function criarPonte(opcoes: {
  instalada?: boolean;
  consultaConcluida?: boolean;
  versionName?: string;
  versionCode?: string;
  copiado?: boolean;
  abriu?: boolean;
  lancarConsulta?: boolean;
} = {}): PonteNativa {
  return {
    consultarApp: vi.fn(async (packageName) => {
      if (opcoes.lancarConsulta) throw new Error("ponte indisponivel");
      return {
        packageName,
        instalado: opcoes.instalada ?? true,
        consultaConcluida: opcoes.consultaConcluida ?? true,
        versionName: opcoes.versionName ?? "2.4.0",
        versionCode: opcoes.versionCode ?? "100",
      };
    }),
    copiarTexto: vi.fn(async () => ({ codigo: "COPIADO" as const, copiado: opcoes.copiado ?? true, mensagem: "Copiado." })),
    abrirAplicativo: vi.fn(async (packageName) => ({ codigo: "DESPACHADO" as const, despachado: opcoes.abriu ?? true, packageName, mensagem: "Aberto." })),
    abrirDeepLink: vi.fn(),
  };
}

describe("AnjunAdapter V0.5.6", () => {
  it("copia e abre somente o launcher validado da Anjun", async () => {
    const ponte = criarPonte();
    const resultado = await new AnjunAdapter(ponte).abrirPesquisaPorTracking({
      tracking: "AJ12345678901234",
      modo: "OPERACAO",
    });

    expect(resultado.codigo).toBe("FALLBACK_CLIPBOARD");
    expect(resultado.estrategia).toBe("CLIPBOARD_APP");
    expect(ponte.copiarTexto).toHaveBeenCalledWith("AJ12345678901234");
    expect(ponte.abrirAplicativo).toHaveBeenCalledWith("com.anjun.supplierManagement");
    expect(ponte.abrirDeepLink).not.toHaveBeenCalled();
  });

  it("nao abre aplicativo para codigo que nao parece Anjun", async () => {
    const ponte = criarPonte();
    const resultado = await new AnjunAdapter(ponte).abrirPesquisaPorTracking({ tracking: "6090526449890", modo: "OPERACAO" });

    expect(resultado.codigo).toBe("TRACKING_INVALIDO");
    expect(ponte.consultarApp).not.toHaveBeenCalled();
  });

  it("bloqueia a abertura automatica quando a versao mudou", async () => {
    const ponte = criarPonte({ versionName: "2.5.0" });
    const resultado = await new AnjunAdapter(ponte).abrirPesquisaPorTracking({ tracking: "AJ12345678901234", modo: "OPERACAO" });

    expect(resultado.codigo).toBe("VERSAO_DESCONHECIDA");
    expect(ponte.copiarTexto).not.toHaveBeenCalled();
    expect(ponte.abrirAplicativo).not.toHaveBeenCalled();
  });

  it("nao confunde falha da ponte com app ausente", async () => {
    const resultado = await new AnjunAdapter(criarPonte({ lancarConsulta: true })).abrirPesquisaPorTracking({ tracking: "AJ12345678901234", modo: "OPERACAO" });

    expect(resultado.codigo).toBe("INTEGRACAO_INDISPONIVEL");
  });
});

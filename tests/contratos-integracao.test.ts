import { describe, expect, it, vi } from "vitest";
import type { FonteContratosIntegracao } from "../src/aplicacao/portas/repositorio-contratos-integracao";
import { POLITICA_IMILE_2_3_18, PROTOCOLO_IMILE_REQUEST_CODE_V1 } from "../src/configuracao/contratos-integracao/imile-2-3-18";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";
import { RepositorioContratosIntegracaoSeguro } from "../src/infraestrutura/integracoes/repositorio-contratos-integracao-seguro";

const consulta = {
  transportadora: "IMILE" as const,
  packageName: "com.imile.redelivery",
  versionCode: "458",
};

function repositorio(
  fonte: FonteContratosIntegracao,
  armazenamento = new ArmazenamentoMemoria(),
  agora = () => Date.parse("2026-09-08T12:00:00.000Z"),
) {
  return new RepositorioContratosIntegracaoSeguro(
    armazenamento,
    fonte,
    [POLITICA_IMILE_2_3_18],
    new Set([PROTOCOLO_IMILE_REQUEST_CODE_V1]),
    agora,
  );
}

describe("contratos de integracao server-driven", () => {
  it("aceita downgrade remoto para clipboard sem receber URI arbitraria", async () => {
    const fonte: FonteContratosIntegracao = {
      obter: vi.fn(async () => ({
        ...POLITICA_IMILE_2_3_18,
        habilitado: false,
        modo: "CLIPBOARD_APP" as const,
        protocoloId: null,
        versaoContrato: 2,
      })),
    };

    const contrato = await repositorio(fonte).resolver(consulta);
    expect(contrato.origem).toBe("REMOTO");
    expect(contrato.habilitado).toBe(false);
    expect(contrato.modo).toBe("CLIPBOARD_APP");
  });

  it("rejeita protocolo remoto desconhecido e preserva contrato embarcado", async () => {
    const fonte: FonteContratosIntegracao = {
      obter: vi.fn(async () => ({
        ...POLITICA_IMILE_2_3_18,
        protocoloId: "URI_ARBITRARIA",
        versaoContrato: 99,
      })),
    };

    const contrato = await repositorio(fonte).resolver(consulta);
    expect(contrato.origem).toBe("EMBARCADO");
    expect(contrato.protocoloId).toBe(PROTOCOLO_IMILE_REQUEST_CODE_V1);
  });

  it("usa modo seguro em versao desconhecida durante indisponibilidade", async () => {
    const fonte: FonteContratosIntegracao = {
      obter: vi.fn(async () => { throw new Error("offline"); }),
    };

    const contrato = await repositorio(fonte).resolver({ ...consulta, versionCode: "999" });
    expect(contrato.origem).toBe("PADRAO_SEGURO");
    expect(contrato.modo).toBe("CLIPBOARD_APP");
    expect(contrato.protocoloId).toBeNull();
  });

  it("mantem kill switch em cache mesmo depois da validade", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const online: FonteContratosIntegracao = {
      obter: vi.fn(async () => ({
        ...POLITICA_IMILE_2_3_18,
        habilitado: false,
        modo: "CLIPBOARD_APP" as const,
        protocoloId: null,
        versaoContrato: 3,
        expiraEm: "2026-09-08T12:30:00.000Z",
      })),
    };
    await repositorio(online, armazenamento).resolver(consulta);

    const offline: FonteContratosIntegracao = {
      obter: vi.fn(async () => { throw new Error("offline"); }),
    };
    const contrato = await repositorio(
      offline,
      armazenamento,
      () => Date.parse("2026-09-09T12:00:00.000Z"),
    ).resolver(consulta);

    expect(contrato.origem).toBe("CACHE");
    expect(contrato.habilitado).toBe(false);
    expect(contrato.expirado).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";
import type { RepositorioTelemetriaIntegracao } from "../src/aplicacao/portas/repositorio-telemetria-integracao";
import type { EventoTelemetriaIntegracao } from "../src/dominio/integracao/telemetria-integracao";
import { ErroHttpFirebaseRest } from "../src/infraestrutura/firebase/cliente-realtime-rest";
import { RepositorioTelemetriaIntegracaoComFila } from "../src/infraestrutura/integracoes/repositorio-telemetria-integracao-com-fila";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";

const evento: EventoTelemetriaIntegracao = {
  eventoId: "11111111-1111-4111-8111-111111111111",
  ocorridoEm: "2026-09-08T18:00:00.000Z",
  versaoDeliveryHub: "0.4.8",
  transportadora: "IMILE",
  packageName: "com.imile.redelivery",
  versionCode: "458",
  versaoContrato: 1,
  etapa: "ABRIR_DEEP_LINK",
  codigo: "INTEGRACAO_INDISPONIVEL",
  estrategia: "CLIPBOARD_APP",
};

describe("fila isolada de telemetria", () => {
  it("preserva evento offline e o envia depois sem tocar na Outbox operacional", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    let agora = 1_000;
    const registrar = vi.fn().mockRejectedValueOnce(new Error("offline"));
    const remoto: RepositorioTelemetriaIntegracao = {
      registrar,
      listarDia: vi.fn(async () => []),
    };
    const repositorio = new RepositorioTelemetriaIntegracaoComFila(
      armazenamento,
      remoto,
      () => agora,
    );

    await repositorio.registrar(evento);
    await repositorio.sincronizarPendentes();
    expect(await armazenamento.listar("telemetria-integracao-outbox/")).toHaveLength(1);

    agora += 10_000;
    registrar.mockResolvedValueOnce(undefined);
    await repositorio.sincronizarPendentes();
    expect(await armazenamento.listar("telemetria-integracao-outbox/")).toHaveLength(0);
  });

  it("bloqueia poison pill 4xx e nao repete em loop", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const registrar = vi.fn().mockRejectedValue(new ErroHttpFirebaseRest(400));
    const remoto: RepositorioTelemetriaIntegracao = {
      registrar,
      listarDia: vi.fn(async () => []),
    };
    const repositorio = new RepositorioTelemetriaIntegracaoComFila(
      armazenamento,
      remoto,
      () => 1_000,
    );

    await repositorio.registrar(evento);
    await repositorio.sincronizarPendentes();
    await repositorio.sincronizarPendentes();

    expect(registrar).toHaveBeenCalledTimes(1);
    const [pendente] = await armazenamento.listar<{ estado: string }>(
      "telemetria-integracao-outbox/",
    );
    expect(pendente.valor.estado).toBe("BLOQUEADO");
  });
});

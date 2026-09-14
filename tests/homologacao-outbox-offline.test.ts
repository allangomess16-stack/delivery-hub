import { describe, expect, it } from "vitest";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";
import { HomologacaoOutbox } from "../src/interface/homologacao/homologacao-outbox";

describe("Outbox offline deterministica da homologacao", () => {
  it("preserva fila e UUID ao reiniciar e sincroniza uma unica vez ao voltar online", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const criarOutbox = () => new HomologacaoOutbox({
      armazenamento,
      iniciarSincronizacaoAutomatica: false,
      agendar: () => undefined,
    });

    const primeiraExecucao = criarOutbox();
    await primeiraExecucao.iniciar();
    await primeiraExecucao.definirOfflineSimulado(true);

    const referencia = await primeiraExecucao.concluir({
      tracking: "6082326468665",
      transportadora: "Anjun",
      recebedor: "Portaria",
    });
    const offline = await primeiraExecucao.obterEstado(referencia);

    expect(offline?.fila).toBe(1);
    expect(offline?.estadoFisico).toBe("ENTREGUE");
    expect(offline?.estadoIntegracao).toBe("AGUARDANDO_SINCRONIZACAO");
    expect(offline?.operacaoId).toBeTruthy();

    await primeiraExecucao.sincronizarAgora();
    expect((await primeiraExecucao.obterEstado(referencia))?.fila).toBe(1);

    const reiniciada = criarOutbox();
    const recuperado = await reiniciada.iniciar();
    const aindaOffline = await reiniciada.obterEstado(referencia);

    expect(recuperado.referenciaPendente).toEqual(referencia);
    expect(recuperado.offlineSimulado).toBe(true);
    expect(aindaOffline?.fila).toBe(1);
    expect(aindaOffline?.operacaoId).toBe(offline?.operacaoId);

    await reiniciada.restaurarModoOnline();
    await reiniciada.sincronizarAgora();
    const sincronizada = await reiniciada.obterEstado(referencia);

    expect(sincronizada?.fila).toBe(0);
    expect(sincronizada?.estadoIntegracao).toBe("AGUARDANDO_INTEGRACAO");
    expect(sincronizada?.operacaoId).toBe(offline?.operacaoId);

    await reiniciada.sincronizarAgora();
    const repetida = await reiniciada.obterEstado(referencia);
    expect(repetida?.fila).toBe(0);
    expect(repetida?.operacaoId).toBe(offline?.operacaoId);
  });
});

import { describe, expect, it } from "vitest";
import { ConectividadeHomologacaoControlavel } from "../src/infraestrutura/homologacao/conectividade-homologacao-controlavel";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";

describe("Conectividade controlavel da homologacao", () => {
  it("persiste o offline entre reinicializacoes e permite reativar", async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const primeira = new ConectividadeHomologacaoControlavel(armazenamento);
    await primeira.iniciar();
    expect(primeira.estaOnline()).toBe(true);

    await primeira.definirOfflineSimulado(true);
    expect(primeira.estaOnline()).toBe(false);

    const restaurada = new ConectividadeHomologacaoControlavel(armazenamento);
    await restaurada.iniciar();
    expect(restaurada.estaOfflineSimulado()).toBe(true);

    await restaurada.definirOfflineSimulado(false);
    expect(restaurada.estaOnline()).toBe(true);
  });
});

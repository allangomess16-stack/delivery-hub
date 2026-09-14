import { describe, expect, it } from "vitest";
import { normalizarEstadoEntrega } from "../src/aplicacao/estado-entrega";
import type { EstadoEntrega } from "../src/dominio/entrega/tipos";

describe("migracao do estado externo legado", () => {
  it("converte PREPARADA para fila local pendente", () => {
    const legado = {
      estadoFisico: "ENTREGUE",
      estadoBaixaExterna: "PREPARADA",
      fotos: [],
      eventos: [],
    } as unknown as EstadoEntrega;

    expect(normalizarEstadoEntrega(legado).estadoIntegracao).toBe("AGUARDANDO_SINCRONIZACAO");
  });

  it("preserva confirmacao antiga como confirmada", () => {
    const legado = {
      estadoFisico: "ENTREGUE",
      estadoBaixaExterna: "CONFIRMADA",
      fotos: [],
      eventos: [],
    } as unknown as EstadoEntrega;

    expect(normalizarEstadoEntrega(legado).estadoIntegracao).toBe("CONFIRMADA");
  });
});

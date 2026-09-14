import { afterEach, describe, expect, it, vi } from "vitest";
import type { Auth, User } from "firebase/auth";
import type { CargaEntregador } from "../src/dominio/carga/tipos";
import { RepositorioCargaFirebaseAdapter } from "../src/infraestrutura/firebase/repositorio-carga-firebase-adapter";
import type { ClienteRealtimeRest } from "../src/infraestrutura/firebase/cliente-realtime-rest";
import { RepositorioCargaLocalAdapter } from "../src/infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { ArmazenamentoMemoria } from "../src/infraestrutura/mock/armazenamento-memoria";

function carga(id: string, entregadorId: string): CargaEntregador {
  return {
    cargaId: id,
    cargaOrigemId: `origem-${id}`,
    entregadorId,
    nomeEntregador: entregadorId,
    dataOperacao: "2026-09-08",
    nomeArquivoOrigem: "carga.xlsx",
    criadaEm: "2026-09-08T10:00:00.000Z",
    chaveRemotaSimulada: id,
    status: "PUBLICADA",
    pacotes: [],
  };
}

describe("publicacao atomica de cargas Firebase", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia todas as cargas em um unico PATCH multipath", async () => {
    const memoria = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (chave: string) => memoria.get(chave) ?? null,
      setItem: (chave: string, valor: string) => memoria.set(chave, valor),
      removeItem: (chave: string) => memoria.delete(chave),
    });
    const atualizar = vi.fn().mockResolvedValue(undefined);
    const rest = {
      async obter(caminho: string) {
        if (caminho === "usuarios/ADMIN-UID") {
          return { email: "admin@hub.com", nome: "Admin", tipo: "ADMIN", ativo: true, criadoEm: "x", atualizadoEm: "x" };
        }
        return null;
      },
      atualizar,
    } as unknown as ClienteRealtimeRest;
    const auth = { currentUser: { uid: "ADMIN-UID" } as unknown as User } as Auth;
    const local = new RepositorioCargaLocalAdapter(new ArmazenamentoMemoria());
    const repositorio = new RepositorioCargaFirebaseAdapter(auth, rest, local);

    await repositorio.salvarCargas([carga("C-1", "ENT-A"), carga("C-2", "ENT-B")]);

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizar.mock.calls[0][0]).toBe("");
    expect(Object.keys(atualizar.mock.calls[0][1])).toEqual([
      "cargas/ENT-A/2026-09-08/C-1",
      "cargas/ENT-B/2026-09-08/C-2",
    ]);
    expect(await local.listarCargas("ENT-A")).toHaveLength(1);
    expect(await local.listarCargas("ENT-B")).toHaveLength(1);
  });
});

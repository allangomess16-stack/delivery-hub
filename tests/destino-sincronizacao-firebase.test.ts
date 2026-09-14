import { afterEach, describe, expect, it, vi } from "vitest";
import type { Auth, User } from "firebase/auth";
import { DestinoSincronizacaoFirebase } from "../src/infraestrutura/firebase/destino-sincronizacao-firebase";
import { ErroHttpFirebaseRest, type ClienteRealtimeRest } from "../src/infraestrutura/firebase/cliente-realtime-rest";
import type { ItemOutboxEntrega } from "../src/dominio/sincronizacao/tipos";
import { criarEstadoEntregaPadrao } from "../src/aplicacao/estado-entrega";
import { ErroTemporarioSincronizacao } from "../src/aplicacao/portas/destino-sincronizacao-entrega";

function prepararLocalStorage(): void {
  const memoria = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (chave: string) => memoria.get(chave) ?? null,
    setItem: (chave: string, valor: string) => memoria.set(chave, valor),
    removeItem: (chave: string) => memoria.delete(chave),
  });
}

function item(): ItemOutboxEntrega {
  return {
    operacaoId: "12345678-1234-4123-8123-123456789012",
    tipo: "ENTREGA_CONFIRMADA",
    estado: "PENDENTE",
    entregadorId: "ENT-A",
    cargaId: "CARGA-A",
    pacoteId: "PACOTE-A",
    tracking: "6082326468665",
    transportadoraId: "IMILE",
    criadoEm: "2026-09-08T10:00:00.000Z",
    atualizadoEm: "2026-09-08T10:00:00.000Z",
    tentativas: 0,
    payload: { entrega: criarEstadoEntregaPadrao() },
  };
}

describe("destino Firebase", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("traduz HTTP 400 em erro permanente sem vazar token", async () => {
    prepararLocalStorage();
    const auth = { currentUser: { uid: "UID-A" } as unknown as User } as Auth;
    const rest = {
      async obter(caminho: string) {
        if (caminho === "usuarios/UID-A") {
          return { email: "a@a.com", nome: "A", tipo: "ENTREGADOR", ativo: true, entregadorId: "ENT-A", criadoEm: "x", atualizadoEm: "x" };
        }
        return null;
      },
      async criarSeAusente() { throw new ErroHttpFirebaseRest(400); },
    } as unknown as ClienteRealtimeRest;
    const destino = new DestinoSincronizacaoFirebase(auth, rest);

    await expect(destino.enviar(item())).resolves.toEqual({
      tipo: "ERRO_PERMANENTE",
      mensagem: "DH-SYNC-S02-HTTP: operacao recusada pelo Hub (HTTP 400).",
    });
  });

  it("mantem HTTP 429 como temporario e preserva Retry-After", async () => {
    prepararLocalStorage();
    const auth = { currentUser: { uid: "UID-A" } as unknown as User } as Auth;
    const rest = {
      async obter(caminho: string) {
        if (caminho === "usuarios/UID-A") {
          return { email: "a@a.com", nome: "A", tipo: "ENTREGADOR", ativo: true, entregadorId: "ENT-A", criadoEm: "x", atualizadoEm: "x" };
        }
        return null;
      },
      async criarSeAusente() { throw new ErroHttpFirebaseRest(429, 60_000); },
    } as unknown as ClienteRealtimeRest;
    const destino = new DestinoSincronizacaoFirebase(auth, rest);

    await expect(destino.enviar(item())).rejects.toMatchObject({
      name: ErroTemporarioSincronizacao.name,
      tentarNovamenteAposMs: 60_000,
    });
  });
});

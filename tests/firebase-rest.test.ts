import { afterEach, describe, expect, it, vi } from "vitest";
import type { Auth, User } from "firebase/auth";
import { ClienteRealtimeRest } from "../src/infraestrutura/firebase/cliente-realtime-rest";

function authFalso(): Auth {
  return {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("TOKEN_TEMPORARIO"),
    } as unknown as User,
  } as Auth;
}

describe("Cliente REST do Realtime Database", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("faz escrita HTTP curta autenticada sem usar o SDK Database", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const cliente = new ClienteRealtimeRest(
      authFalso(),
      "https://delivery-hub-default-rtdb.firebaseio.com",
    );
    await cliente.salvar("operacoes/entregador-1/op-1", { ok: true });

    const [url, opcoes] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/operacoes/entregador-1/op-1.json?auth=TOKEN_TEMPORARIO");
    expect(opcoes.method).toBe("PUT");
    expect(opcoes.body).toBe(JSON.stringify({ ok: true }));
  });

  it("renova o token e repete uma unica vez quando o servidor responde 401", async () => {
    const getIdToken = vi.fn()
      .mockResolvedValueOnce("TOKEN_ANTIGO")
      .mockResolvedValueOnce("TOKEN_NOVO");
    const auth = { currentUser: { getIdToken } as unknown as User } as Auth;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("null", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const cliente = new ClienteRealtimeRest(auth, "https://db.example.com");
    await expect(cliente.obter("dados/teste")).resolves.toEqual({ ok: true });

    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(String(fetchMock.mock.calls[1][0])).toContain("auth=TOKEN_NOVO");
  });

  it("usa PATCH para atualizacoes parciais e multipath", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("null", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const cliente = new ClienteRealtimeRest(authFalso(), "https://db.example.com");

    await cliente.atualizar("", { "cargas/e-1/2026-09-08/c-1": { status: "PUBLICADA" } });

    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("PATCH");
  });

  it("limita a consulta de telemetria no servidor antes do download", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("null", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const cliente = new ClienteRealtimeRest(authFalso(), "https://db.example.com");

    await cliente.obterUltimosPorChave("suporte/integracoes/2026-09-08", 200);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("orderBy")).toBe('"$key"');
    expect(url.searchParams.get("limitToLast")).toBe("200");
  });

  it("usa criacao condicional por ETag para preservar idempotencia", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ operacaoId: "op-1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const cliente = new ClienteRealtimeRest(authFalso(), "https://db.example.com");
    const resultado = await cliente.criarSeAusente("operacoes/e-1/op-1", {
      operacaoId: "op-1",
    });

    const opcoes = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(opcoes.headers).get("if-match")).toBe("null_etag");
    expect(resultado).toEqual({
      criado: true,
      valorAtual: { operacaoId: "op-1" },
    });
  });

  it("em conflito consulta o UUID existente sem sobrescreve-lo", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("null", { status: 412 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ operacaoId: "op-1" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const cliente = new ClienteRealtimeRest(authFalso(), "https://db.example.com");
    const resultado = await cliente.criarSeAusente("operacoes/e-1/op-1", {
      operacaoId: "op-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({
      criado: false,
      valorAtual: { operacaoId: "op-1" },
    });
  });

  it("nao inclui token nem URL completa na mensagem de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("null", { status: 403 })),
    );
    const cliente = new ClienteRealtimeRest(authFalso(), "https://db.example.com");

    await expect(cliente.obter("dados/perfis")).rejects.toThrow("HTTP 403");
    await expect(cliente.obter("dados/perfis")).rejects.not.toThrow("TOKEN_TEMPORARIO");
  });

  it("aplica timeout mesmo quando a obtencao do token fica pendente", async () => {
    const auth = {
      currentUser: {
        getIdToken: vi.fn(() => new Promise<string>(() => undefined)),
      } as unknown as User,
    } as Auth;
    const cliente = new ClienteRealtimeRest(auth, "https://db.example.com", 5);

    await expect(cliente.obter("operacoes/e-1")).rejects.toThrow(
      "Firebase REST excedeu o tempo limite.",
    );
  });
});

import type { Auth } from "firebase/auth";

export interface ResultadoCriacaoCondicional<T> {
  criado: boolean;
  valorAtual: T | null;
}

interface RespostaRest<T> {
  status: number;
  valor: T | null;
}

export class ErroHttpFirebaseRest extends Error {
  constructor(readonly status: number, readonly tentarNovamenteAposMs?: number) {
    super(`Firebase REST recusou a operacao (HTTP ${status}).`);
    this.name = "ErroHttpFirebaseRest";
  }
}

function lerRetryAfterMs(valor: string | null): number | undefined {
  if (!valor) return undefined;
  const segundos = Number(valor);
  if (Number.isFinite(segundos) && segundos >= 0) return segundos * 1_000;
  const data = Date.parse(valor);
  if (!Number.isFinite(data)) return undefined;
  return Math.max(0, data - Date.now());
}

/**
 * Cliente HTTP curto para o Realtime Database.
 *
 * Somente o ID token temporario do usuario autenticado e utilizado. A URL
 * completa nunca entra em mensagens de erro, evitando vazar o token em logs.
 */
export class ClienteRealtimeRest {
  constructor(
    private readonly auth: Auth,
    private readonly databaseUrl: string,
    private readonly timeoutMs = 15_000,
  ) {}

  private normalizarCaminho(caminho: string): string {
    return caminho
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean)
      .map((segmento) => {
        if (segmento !== ".info" && /[.$#[\]\u0000-\u001f\u007f]/u.test(segmento)) {
          throw new Error("Caminho remoto invalido.");
        }
        return encodeURIComponent(segmento);
      })
      .join("/");
  }

  private async endpoint(
    caminho: string,
    forcarRenovacao = false,
    consulta?: Readonly<Record<string, string>>,
  ): Promise<string> {
    const usuario = this.auth.currentUser;
    if (!usuario) throw new Error("Sessao Firebase indisponivel.");

    // O SDK devolve um token ainda valido e o renova automaticamente quando
    // esta proximo do vencimento. Em uma resposta 401, a requisicao abaixo
    // repete uma unica vez com renovacao forcada.
    const token = await usuario.getIdToken(forcarRenovacao);
    const base = this.databaseUrl.replace(/\/+$/g, "");
    const caminhoSeguro = this.normalizarCaminho(caminho);
    const url = new URL(`${base}/${caminhoSeguro}.json`);
    url.searchParams.set("auth", token);
    for (const [chave, valor] of Object.entries(consulta ?? {})) {
      url.searchParams.set(chave, valor);
    }
    return url.toString();
  }

  private async requisitar<T>(
    metodo: "GET" | "PUT" | "PATCH" | "DELETE",
    caminho: string,
    corpo?: unknown,
    cabecalhos?: Record<string, string>,
    statusPermitidos: readonly number[] = [],
    consulta?: Readonly<Record<string, string>>,
  ): Promise<RespostaRest<T>> {
    const controlador = new AbortController();
    let expirou = false;
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const limite = new Promise<never>((_, rejeitar) => {
      timer = globalThis.setTimeout(() => {
        expirou = true;
        controlador.abort();
        rejeitar(new Error("Firebase REST excedeu o tempo limite."));
      }, this.timeoutMs);
    });

    try {
      const requisicao = (async (): Promise<RespostaRest<T>> => {
        const executar = async (forcarRenovacao = false): Promise<Response> => fetch(
          await this.endpoint(caminho, forcarRenovacao, consulta), {
          method: metodo,
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...(corpo === undefined ? {} : { "Content-Type": "application/json" }),
            ...cabecalhos,
          },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
          signal: controlador.signal,
          },
        );

        let resposta = await executar();
        if (resposta.status === 401) resposta = await executar(true);

        const texto = await resposta.text();
        if (!resposta.ok && !statusPermitidos.includes(resposta.status)) {
          throw new ErroHttpFirebaseRest(
            resposta.status,
            lerRetryAfterMs(resposta.headers.get("Retry-After")),
          );
        }
        let valor: T | null = null;
        if (texto) {
          try {
            valor = JSON.parse(texto) as T;
          } catch {
            throw new Error("Firebase REST retornou uma resposta invalida.");
          }
        }
        return { status: resposta.status, valor };
      })();

      return await Promise.race([requisicao, limite]);
    } catch (erro) {
      if (
        expirou ||
        (erro instanceof DOMException && erro.name === "AbortError") ||
        (erro instanceof Error && erro.name === "AbortError")
      ) {
        throw new Error("Firebase REST excedeu o tempo limite.");
      }
      throw erro;
    } finally {
      if (timer !== undefined) globalThis.clearTimeout(timer);
    }
  }

  async obter<T>(caminho: string): Promise<T | null> {
    return (await this.requisitar<T>("GET", caminho)).valor;
  }

  async obterUltimosPorChave<T>(caminho: string, limite: number): Promise<T | null> {
    if (!Number.isInteger(limite) || limite < 1 || limite > 200) {
      throw new Error("Limite de consulta Firebase invalido.");
    }
    return (
      await this.requisitar<T>(
        "GET",
        caminho,
        undefined,
        undefined,
        [],
        {
          orderBy: JSON.stringify("$key"),
          limitToLast: String(limite),
        },
      )
    ).valor;
  }

  async salvar<T>(caminho: string, valor: T): Promise<void> {
    await this.requisitar<T>("PUT", caminho, valor);
  }

  async atualizar<T extends object>(caminho: string, valor: T): Promise<void> {
    await this.requisitar<T>("PATCH", caminho, valor);
  }

  async remover(caminho: string): Promise<void> {
    await this.requisitar<null>("DELETE", caminho);
  }

  async criarSeAusente<T>(
    caminho: string,
    valor: T,
  ): Promise<ResultadoCriacaoCondicional<T>> {
    const resposta = await this.requisitar<T>(
      "PUT",
      caminho,
      valor,
      { "if-match": "null_etag" },
      [412],
    );

    if (resposta.status !== 412) {
      return { criado: true, valorAtual: resposta.valor ?? valor };
    }

    return { criado: false, valorAtual: await this.obter<T>(caminho) };
  }
}

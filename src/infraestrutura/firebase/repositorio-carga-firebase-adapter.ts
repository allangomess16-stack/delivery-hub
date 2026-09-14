import type { Auth } from "firebase/auth";
import type { RepositorioCargaEntregador } from "../../aplicacao/portas/repositorio-carga-entregador";
import { normalizarEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import type { RepositorioCargaLocalAdapter } from "../armazenamento/repositorio-carga-local-adapter";
import {
  operacaoMaisRecente,
} from "./operacoes-firebase";
import { obterUsuarioFirebase } from "./usuario-firebase";
import type { ClienteRealtimeRest } from "./cliente-realtime-rest";
import { CODIGOS_ERRO } from "../../dominio/diagnostico/codigos-erro";
import { encontrarCargaAtual } from "../../aplicacao/carga/encontrar-carga-atual";

function semEstadoEntrega(carga: CargaEntregador): CargaEntregador {
  return {
    ...structuredClone(carga),
    pacotes: carga.pacotes.map((pacote) => {
      const copia = structuredClone(pacote);
      delete copia.entrega;
      return copia;
    }),
  };
}

function listarCargasDaArvore(valor: unknown): CargaEntregador[] {
  if (!valor || typeof valor !== "object") return [];
  const cargas: CargaEntregador[] = [];

  for (const porData of Object.values(valor as Record<string, unknown>)) {
    if (!porData || typeof porData !== "object") continue;

    for (const carga of Object.values(porData as Record<string, unknown>)) {
      if (!carga || typeof carga !== "object") continue;
      const candidata = carga as Partial<CargaEntregador>;
      if (candidata.cargaId && candidata.entregadorId && Array.isArray(candidata.pacotes)) {
        cargas.push(carga as CargaEntregador);
      }
    }
  }

  return cargas;
}

function nomeTransportadora(id: string | undefined): PacoteDaCarga["transportadora"] {
  if (id === "IMILE") return { id: "IMILE", nome: "iMile", confianca: "ALTA" };
  if (id === "ANJUN") return { id: "ANJUN", nome: "Anjun", confianca: "ALTA" };
  if (id === "JNT") return { id: "JNT", nome: "J&T Express", confianca: "ALTA" };
  return { id: "OUTRA", nome: "Outra", confianca: "DESCONHECIDA" };
}

/** Materializa somente alertas já recebidos pelo Hub; não publica cargas do entregador. */
function cargasExtraRotaDaOutbox(valor: unknown, entregadorId: string): CargaEntregador[] {
  if (!valor || typeof valor !== "object") return [];
  const cargas = new Map<string, CargaEntregador>();
  for (const [cargaId, porPacote] of Object.entries(valor as Record<string, unknown>)) {
    if (!porPacote || typeof porPacote !== "object") continue;
    for (const [pacoteId, porOperacao] of Object.entries(porPacote as Record<string, unknown>)) {
      const operacao = operacaoMaisRecente(porOperacao);
      if (!operacao || operacao.contextoOperacional !== "EXTRA_ROTA" || !operacao.alertaAdmin || !operacao.tracking) continue;
      const existente = cargas.get(cargaId) ?? {
        cargaId,
        cargaOrigemId: cargaId,
        referenciaCarga: "Alerta Extra Rota",
        referenciaLote: "SCANNER-UNIVERSAL",
        entregadorId,
        nomeEntregador: entregadorId,
        dataOperacao: operacao.atualizadoEm.slice(0, 10),
        nomeArquivoOrigem: "Scanner universal",
        origemOperacional: "SCANNER_UNIVERSAL" as const,
        criadaEm: operacao.atualizadoEm,
        pacotes: [],
        chaveRemotaSimulada: `operacoes/${entregadorId}/${cargaId}`,
        status: "EM_OPERACAO" as const,
      };
      existente.pacotes.push({
        id: pacoteId,
        entregador: existente.nomeEntregador,
        codigoOriginal: operacao.tracking,
        codigoNormalizado: operacao.tracking,
        transportadora: nomeTransportadora(operacao.transportadoraId),
        precisaRevisao: false,
        origem: "MANUAL",
        situacaoOperacional: "EXTRA_ROTA",
        alertaAdmin: true,
        conciliacaoExtraRota: { status: "ABERTA" },
        operacaoExtraRotaId: operacao.operacaoId,
        entrega: normalizarEstadoEntrega(structuredClone(operacao.entrega)),
        criadoEm: operacao.atualizadoEm,
        atualizadoEm: operacao.atualizadoEm,
      });
      cargas.set(cargaId, existente);
    }
  }
  return [...cargas.values()];
}

function estadoLocalPrecisaSerPreservado(pacote: PacoteDaCarga | undefined): boolean {
  if (!pacote?.entrega) return false;
  const entrega = normalizarEstadoEntrega(pacote.entrega);
  return (
    Boolean(entrega.operacaoIntegracaoId) &&
    (entrega.estadoIntegracao === "AGUARDANDO_SINCRONIZACAO" ||
      entrega.estadoIntegracao === "SINCRONIZANDO" ||
      entrega.estadoIntegracao === "ERRO" ||
      entrega.estadoIntegracao === "ACAO_MANUAL")
  );
}

function mesclarEstadoLocalPendente(
  oficial: CargaEntregador,
  local: CargaEntregador | undefined,
): CargaEntregador {
  if (!local) return structuredClone(oficial);
  const mesclada = structuredClone(oficial);

  for (const pacote of mesclada.pacotes) {
    const localPacote = local.pacotes.find((item) => item.id === pacote.id);
    if (estadoLocalPrecisaSerPreservado(localPacote) && localPacote?.entrega) {
      pacote.entrega = structuredClone(localPacote.entrega);
    }
  }

  return mesclada;
}

export class RepositorioCargaFirebaseAdapter implements RepositorioCargaEntregador {
  private usuarioCache: UsuarioAtual | null = null;
  private usuarioCacheUid = "";

  constructor(
    private readonly auth: Auth,
    private readonly rest: ClienteRealtimeRest,
    private readonly local: RepositorioCargaLocalAdapter,
  ) {}

  private async usuarioAtual(): Promise<UsuarioAtual | null> {
    const uid = this.auth.currentUser?.uid ?? "";
    if (uid && uid === this.usuarioCacheUid && this.usuarioCache) {
      return this.usuarioCache;
    }
    const usuario = await obterUsuarioFirebase(this.auth, this.rest);
    this.usuarioCache = usuario;
    this.usuarioCacheUid = uid;
    return usuario;
  }

  private async aplicarOperacoes(carga: CargaEntregador): Promise<CargaEntregador> {
    try {
      const operacoesPorPacote = await this.rest.obter<Record<string, unknown>>(
        `operacoes/${carga.entregadorId}/${carga.cargaId}`,
      );
      if (!operacoesPorPacote) return carga;
      const mesclada = structuredClone(carga);

      for (const pacote of mesclada.pacotes) {
        const operacao = operacaoMaisRecente(operacoesPorPacote[pacote.id]);

        /**
         * Um estado local que ainda pertence a Outbox tem prioridade.
         * Sem essa proteção, uma leitura remota antiga poderia apagar uma
         * conclusão feita offline antes que o novo UUID chegasse ao Hub.
         *
         * Se o Hub possui exatamente o mesmo UUID, ele já confirmou o aceite
         * dessa operação. Nesse caso, a projeção remota deve reparar o estado
         * local mesmo que a remoção da Outbox tenha ocorrido antes da UI.
         */
        if (estadoLocalPrecisaSerPreservado(pacote)) {
          const operacaoLocalId = normalizarEstadoEntrega(
            pacote.entrega!,
          ).operacaoIntegracaoId;
          if (!operacao || operacao.operacaoId !== operacaoLocalId) continue;
        }

        if (operacao?.entrega) {
          pacote.entrega = normalizarEstadoEntrega(structuredClone(operacao.entrega));
        }
      }
      if (
        (mesclada.status ?? "PUBLICADA") === "PUBLICADA" &&
        mesclada.pacotes.some((pacote) =>
          normalizarEstadoEntrega(pacote.entrega ?? {
            estadoFisico: "PENDENTE",
            estadoIntegracao: "NAO_INICIADA",
            fotos: [],
            eventos: [],
          }).estadoFisico !== "PENDENTE",
        )
      ) {
        mesclada.status = "EM_OPERACAO";
      }
      return mesclada;
    } catch {
      return carga;
    }
  }

  async salvarCarga(entregadorId: string, carga: CargaEntregador): Promise<void> {
    if (carga.entregadorId !== entregadorId) {
      throw new Error("A carga nao pertence ao entregador informado.");
    }

    const usuario = await this.usuarioAtual();
    if (!usuario || usuario.tipo !== "ADMIN") {
      // Regra offline-first do entregador: a carga operacional fica no aparelho.
      // Conclusoes saem exclusivamente pela Outbox idempotente.
      await this.local.salvarCarga(entregadorId, carga);
      return;
    }

    // Para o Admin, o Firebase e a fonte oficial. So confirma a alteracao na
    // tela/cache depois que a gravacao remota foi aceita.
    await this.rest.salvar(
      `cargas/${entregadorId}/${carga.dataOperacao}/${carga.cargaId}`,
      semEstadoEntrega(carga),
    );
    await this.local.salvarCarga(entregadorId, carga).catch((erro) => {
      console.warn(`${CODIGOS_ERRO.CACHE_CARGA_ADMIN}: Firebase confirmou, cache local falhou.`, erro);
    });
  }

  async resolverAlertaExtraRota(
    entregadorId: string,
    cargaId: string,
    pacoteId: string,
    operacaoId: string,
  ): Promise<void> {
    const usuario = await this.usuarioAtual();
    if (!usuario || usuario.tipo !== "ADMIN") throw new Error("Somente o Admin pode resolver este alerta.");
    await this.rest.atualizar(
      `operacoes/${entregadorId}/${cargaId}/${pacoteId}/${operacaoId}`,
      {
        alertaAdmin: false,
        conciliacaoExtraRota: { status: "RESOLVIDA", resolvidaEm: new Date().toISOString() },
      },
    );
  }

  async salvarCargas(cargas: readonly CargaEntregador[]): Promise<void> {
    if (!cargas.length) return;
    for (const carga of cargas) {
      if (!carga.entregadorId) throw new Error("Carga sem entregador responsavel.");
    }

    const usuario = await this.usuarioAtual();
    if (!usuario || usuario.tipo !== "ADMIN") {
      await this.local.salvarCargas(cargas);
      return;
    }

    const atualizacoes: Record<string, CargaEntregador> = {};
    for (const carga of cargas) {
      atualizacoes[
        `cargas/${carga.entregadorId}/${carga.dataOperacao}/${carga.cargaId}`
      ] = semEstadoEntrega(carga);
    }

    // PATCH multipath do Realtime Database: todas entram ou nenhuma entra.
    await this.rest.atualizar("", atualizacoes);
    await this.local.salvarCargas(cargas).catch((erro) => {
      console.warn(`${CODIGOS_ERRO.CACHE_CARGA_ADMIN}: Firebase confirmou, cache local falhou.`, erro);
    });
  }

  async obterCargaAtual(entregadorId: string): Promise<CargaEntregador | null> {
    const cargas = await this.listarCargas(entregadorId);
    return encontrarCargaAtual(cargas);
  }

  async listarCargas(entregadorId: string): Promise<CargaEntregador[]> {
    const locais = await this.local.listarCargas(entregadorId);
    const locaisPorId = new Map(locais.map((carga) => [carga.cargaId, carga]));

    try {
      const [arvore, operacoes] = await Promise.all([
        this.rest.obter<unknown>(`cargas/${entregadorId}`),
        this.rest.obter<unknown>(`operacoes/${entregadorId}`),
      ]);

      const cargasOficiais = listarCargasDaArvore(arvore);
      const extrasRecebidos = cargasExtraRotaDaOutbox(operacoes, entregadorId);
      const mescladas: CargaEntregador[] = [];

      for (const oficial of cargasOficiais) {
        const comPendenteLocal = mesclarEstadoLocalPendente(
          oficial,
          locaisPorId.get(oficial.cargaId),
        );
        const comOperacoesRemotas = await this.aplicarOperacoes(comPendenteLocal);
        await this.local.salvarCarga(entregadorId, comOperacoesRemotas);
        mescladas.push(comOperacoesRemotas);
      }

      // Cargas locais ainda nao publicadas/removidas do remoto nao somem de
      // forma destrutiva durante uma oscilacao ou transicao administrativa.
      for (const local of locais) {
        if (!mescladas.some((carga) => carga.cargaId === local.cargaId)) {
          mescladas.push(local);
        }
      }

      for (const extra of extrasRecebidos) {
        if (!mescladas.some((carga) => carga.cargaId === extra.cargaId)) {
          mescladas.push(extra);
        }
      }

      return mescladas.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
    } catch {
      return locais;
    }
  }
}

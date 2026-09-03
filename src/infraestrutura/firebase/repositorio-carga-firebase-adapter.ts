import type { Auth } from "firebase/auth";
import type { Database } from "firebase/database";
import {
  get,
  ref,
  set,
} from "firebase/database";
import type { RepositorioCargaEntregador } from "../../aplicacao/portas/repositorio-carga-entregador";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { EstadoEntrega } from "../../dominio/entrega/tipos";
import type { RepositorioCargaLocalAdapter } from "../armazenamento/repositorio-carga-local-adapter";
import { obterUsuarioFirebase } from "./usuario-firebase";

interface OperacaoPacoteFirebase {
  entrega: EstadoEntrega;
  usuarioId: string;
  atualizadoEm: string;
}

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

function operacaoRelevante(pacote: PacoteDaCarga): boolean {
  const entrega = pacote.entrega;
  if (!entrega) return false;

  return (
    entrega.estadoFisico !== "PENDENTE" ||
    entrega.estadoBaixaExterna !== "NAO_INICIADA" ||
    entrega.fotos.length > 0 ||
    entrega.eventos.length > 0 ||
    Boolean(entrega.recebedor) ||
    Boolean(entrega.motivoNaoEntrega)
  );
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

export class RepositorioCargaFirebaseAdapter implements RepositorioCargaEntregador {
  constructor(
    private readonly auth: Auth,
    private readonly database: Database,
    private readonly local: RepositorioCargaLocalAdapter,
  ) {}

  private async usuarioAtual() {
    return obterUsuarioFirebase(this.auth, this.database);
  }

  private async aplicarOperacoes(carga: CargaEntregador): Promise<CargaEntregador> {
    try {
      const snapshot = await get(
        ref(this.database, `operacoes/${carga.entregadorId}/${carga.cargaId}`),
      );
      if (!snapshot.exists()) return carga;

      const operacoes = snapshot.val() as Record<string, OperacaoPacoteFirebase>;
      const mesclada = structuredClone(carga);

      for (const pacote of mesclada.pacotes) {
        const operacao = operacoes[pacote.id];
        if (operacao?.entrega) {
          pacote.entrega = operacao.entrega;
        }
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

    await this.local.salvarCarga(entregadorId, carga);

    const usuario = await this.usuarioAtual();
    if (!usuario) return;

    try {
      if (usuario.tipo === "ADMIN") {
        await set(
          ref(
            this.database,
            `cargas/${entregadorId}/${carga.dataOperacao}/${carga.cargaId}`,
          ),
          semEstadoEntrega(carga),
        );
        return;
      }

      if (usuario.entregadorId !== entregadorId) {
        throw new Error("O entregador nao pode alterar carga de outro perfil.");
      }

      for (const pacote of carga.pacotes) {
        if (!operacaoRelevante(pacote) || !pacote.entrega) continue;

        const operacao: OperacaoPacoteFirebase = {
          entrega: pacote.entrega,
          usuarioId: usuario.usuarioId,
          atualizadoEm: new Date().toISOString(),
        };

        await set(
          ref(
            this.database,
            `operacoes/${entregadorId}/${carga.cargaId}/${pacote.id}`,
          ),
          operacao,
        );
      }
    } catch (erro) {
      console.warn("Carga/operacao ficou salva localmente e aguarda sincronizacao.", erro);
    }
  }

  async obterCargaAtual(entregadorId: string): Promise<CargaEntregador | null> {
    const cargas = await this.listarCargas(entregadorId);
    return (
      cargas.find((carga) => {
        const status = carga.status ?? "PUBLICADA";
        return status === "PUBLICADA" || status === "EM_OPERACAO";
      }) ?? null
    );
  }

  async listarCargas(entregadorId: string): Promise<CargaEntregador[]> {
    try {
      const snapshot = await get(ref(this.database, `cargas/${entregadorId}`));
      if (!snapshot.exists()) return [];

      const cargasOficiais = listarCargasDaArvore(snapshot.val());
      const mescladas: CargaEntregador[] = [];

      for (const carga of cargasOficiais) {
        const mesclada = await this.aplicarOperacoes(carga);
        await this.local.salvarCarga(entregadorId, mesclada);
        mescladas.push(mesclada);
      }

      return mescladas.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
    } catch {
      return this.local.listarCargas(entregadorId);
    }
  }
}

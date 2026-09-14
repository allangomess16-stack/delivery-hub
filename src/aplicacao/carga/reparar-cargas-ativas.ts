import { obterEstadoEntrega } from "../estado-entrega";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import { listarOrigensLote } from "./referencias-carga";

export interface ResultadoReparoCargasAtivas {
  cargasNormalizadas: CargaEntregador[];
  cargasAlteradas: CargaEntregador[];
  gruposReparados: number;
}

function ativa(carga: CargaEntregador): boolean {
  const status = carga.status ?? "PUBLICADA";
  return status === "PUBLICADA" || status === "EM_OPERACAO";
}

function pacoteProgrediu(pacote: PacoteDaCarga): boolean {
  return obterEstadoEntrega(pacote).estadoFisico !== "PENDENTE";
}

function chave(carga: CargaEntregador): string {
  return `${carga.entregadorId}\u0000${carga.dataOperacao}`;
}

/**
 * Repara duplicidade estrutural de cargas sem mover uma operacao ja iniciada
 * para outro cargaId. No maximo uma carga do grupo pode ter progresso real.
 */
export function repararCargasAtivasDuplicadas(
  cargas: readonly CargaEntregador[],
  agora = new Date().toISOString(),
): ResultadoReparoCargasAtivas {
  const normalizadas = cargas.map((carga) => structuredClone(carga));
  const grupos = new Map<string, CargaEntregador[]>();
  for (const carga of normalizadas.filter(ativa)) {
    const grupo = grupos.get(chave(carga)) ?? [];
    grupo.push(carga);
    grupos.set(chave(carga), grupo);
  }

  const alteradas = new Map<string, CargaEntregador>();
  let gruposReparados = 0;

  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const comProgresso = grupo.filter((carga) => carga.pacotes.some(pacoteProgrediu));
    if (comProgresso.length > 1) {
      throw new Error(
        `Existem ${grupo.length} cargas ativas para ${grupo[0].nomeEntregador} em ${grupo[0].dataOperacao}, ` +
        "e mais de uma ja possui operacoes. Abra Gestao de cargas para revisao segura.",
      );
    }

    const ordenadas = [...grupo].sort((a, b) => a.criadaEm.localeCompare(b.criadaEm));
    const canonica = comProgresso[0] ?? ordenadas[0];
    const doadoras = ordenadas.filter((carga) => carga.cargaId !== canonica.cargaId);
    const nomesArquivosOriginais = [...new Set(grupo.map((carga) => carga.nomeArquivoOrigem))];
    const origensLote = new Map(
      grupo.flatMap(listarOrigensLote).map((origem) => [origem.loteId, origem]),
    );

    for (const doadora of doadoras) {
      for (const pacote of doadora.pacotes) {
        if (pacoteProgrediu(pacote)) {
          throw new Error("Uma carga secundaria possui operacao iniciada e nao pode ser consolidada automaticamente.");
        }
        if (!canonica.pacotes.some((item) => item.codigoNormalizado === pacote.codigoNormalizado)) {
          canonica.pacotes.push(structuredClone(pacote));
        }
      }
      doadora.pacotes = [];
      doadora.status = "ENCERRADA";
      doadora.encerradaEm = agora;
      doadora.motivoEncerramento = "CONSOLIDADA";
      doadora.nomeArquivoOrigem = `${doadora.nomeArquivoOrigem} [CONSOLIDADA EM ${canonica.cargaId}]`;
      alteradas.set(doadora.cargaId, doadora);
    }

    canonica.nomeArquivoOrigem = nomesArquivosOriginais.join("; ");
    canonica.lotesOrigem = [...origensLote.values()]
      .sort((a, b) => a.importadaEm.localeCompare(b.importadaEm));
    alteradas.set(canonica.cargaId, canonica);
    gruposReparados += 1;
  }

  return {
    cargasNormalizadas: normalizadas,
    cargasAlteradas: [...alteradas.values()],
    gruposReparados,
  };
}

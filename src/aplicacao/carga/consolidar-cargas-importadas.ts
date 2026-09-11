import type { CargaEntregador } from "../../dominio/carga/tipos";
import { descreverOrigemPacote, detectarDuplicados } from "../detectar-duplicados";
import { repararCargasAtivasDuplicadas } from "./reparar-cargas-ativas";
import { listarOrigensLote } from "./referencias-carga";

function ativa(carga: CargaEntregador): boolean {
  const status = carga.status ?? "PUBLICADA";
  return status === "PUBLICADA" || status === "EM_OPERACAO";
}

function chaveDia(carga: CargaEntregador): string {
  return `${carga.entregadorId}\u0000${carga.dataOperacao}`;
}

function mesclarOrigensLote(
  atual: CargaEntregador,
  nova: CargaEntregador,
): CargaEntregador["lotesOrigem"] {
  const origens = new Map(
    [...listarOrigensLote(atual), ...listarOrigensLote(nova)]
      .map((origem) => [origem.loteId, structuredClone(origem)]),
  );
  return [...origens.values()].sort((a, b) => a.importadaEm.localeCompare(b.importadaEm));
}

/**
 * Mantém uma única carga ativa por entregador/data e impede que o mesmo
 * tracking seja atribuído duas vezes na operação diária.
 */
export function consolidarCargasImportadas(
  novas: readonly CargaEntregador[],
  existentes: readonly CargaEntregador[],
): CargaEntregador[] {
  const duplicadosNovos = detectarDuplicados(novas.flatMap((carga) => carga.pacotes));
  if (duplicadosNovos.length) {
    const primeiro = duplicadosNovos[0];
    throw new Error(
      `Tracking duplicado na planilha: ${primeiro.codigo}. Encontrado em ${primeiro.ocorrencias
        .map(descreverOrigemPacote)
        .join(" e ")}.`,
    );
  }

  const reparo = repararCargasAtivasDuplicadas(existentes);
  const existentesNormalizados = reparo.cargasNormalizadas;
  const resultado = new Map<string, CargaEntregador>(
    reparo.cargasAlteradas.map((carga) => [carga.cargaId, carga]),
  );

  const ativasPorDia = new Map<string, CargaEntregador>();
  for (const carga of existentesNormalizados.filter(ativa)) {
    const chave = chaveDia(carga);
    ativasPorDia.set(chave, carga);
  }

  const datasImportadas = new Set(novas.map((carga) => carga.dataOperacao));
  const donoCodigo = new Map<string, CargaEntregador>();
  for (const carga of existentesNormalizados) {
    if (!datasImportadas.has(carga.dataOperacao)) continue;
    for (const pacote of carga.pacotes) donoCodigo.set(pacote.codigoNormalizado, carga);
  }

  for (const nova of novas) {
    for (const pacote of nova.pacotes) {
      const existente = donoCodigo.get(pacote.codigoNormalizado);
      if (existente) {
        const pacoteExistente = existente.pacotes.find(
          (item) => item.codigoNormalizado === pacote.codigoNormalizado,
        );
        const origemNova = descreverOrigemPacote(pacote);
        const origemExistente = pacoteExistente
          ? descreverOrigemPacote(pacoteExistente)
          : existente.nomeEntregador;
        throw new Error(
          `Tracking ${pacote.codigoNormalizado} nao foi enviado. Na nova planilha: ${origemNova}. ` +
          `O tracking ja pertence a carga de ${existente.nomeEntregador}, em ${existente.dataOperacao}` +
          `${origemExistente !== existente.nomeEntregador ? ` (origem: ${origemExistente})` : ""}.`,
        );
      }
    }

    const atual = ativasPorDia.get(chaveDia(nova));
    if (!atual) {
      const novaClonada = structuredClone(nova);
      resultado.set(nova.cargaId, novaClonada);
      ativasPorDia.set(chaveDia(nova), novaClonada);
      continue;
    }

    const consolidada = structuredClone(atual);
    consolidada.pacotes.push(...structuredClone(nova.pacotes));
    consolidada.nomeArquivoOrigem = `${atual.nomeArquivoOrigem}; ${nova.nomeArquivoOrigem}`;
    consolidada.lotesOrigem = mesclarOrigensLote(atual, nova);
    resultado.set(consolidada.cargaId, consolidada);
    ativasPorDia.set(chaveDia(nova), consolidada);
  }

  return [...resultado.values()];
}

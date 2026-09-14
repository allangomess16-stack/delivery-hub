import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import { normalizarCodigo } from "../normalizar-codigo";

export interface OcorrenciaPacoteGlobal {
  carga: CargaEntregador;
  pacote: PacoteDaCarga;
}

function ativa(carga: CargaEntregador): boolean {
  const status = carga.status ?? "PUBLICADA";
  return status === "PUBLICADA" || status === "EM_OPERACAO" || status === "RASCUNHO";
}

export function localizarPacotesGlobais(
  cargas: readonly CargaEntregador[],
  codigosLidos: readonly string[],
): OcorrenciaPacoteGlobal[] {
  const codigos = new Set(codigosLidos.map((valor) => normalizarCodigo(valor).codigo).filter(Boolean));
  if (!codigos.size) return [];

  const vistos = new Set<string>();
  const ocorrencias: OcorrenciaPacoteGlobal[] = [];
  for (const carga of cargas) {
    for (const pacote of carga.pacotes) {
      if (!codigos.has(pacote.codigoNormalizado)) continue;
      const chave = `${carga.entregadorId}\u0000${carga.cargaId}\u0000${pacote.id}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      ocorrencias.push({ carga, pacote });
    }
  }

  return ocorrencias.sort((a, b) => {
    const diferencaAtiva = Number(ativa(b.carga)) - Number(ativa(a.carga));
    return diferencaAtiva || b.carga.criadaEm.localeCompare(a.carga.criadaEm);
  });
}

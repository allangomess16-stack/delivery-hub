import type { CargaEntregador } from "../../dominio/carga/tipos";

/** Seleção única da carga oficial ativa, reutilizada por UI e repositórios. */
export function encontrarCargaAtual(
  cargas: readonly CargaEntregador[],
): CargaEntregador | null {
  return cargas.find((carga) => {
    if (carga.origemOperacional === "SCANNER_UNIVERSAL") return false;
    const status = carga.status ?? "PUBLICADA";
    return status === "PUBLICADA" || status === "EM_OPERACAO";
  }) ?? null;
}

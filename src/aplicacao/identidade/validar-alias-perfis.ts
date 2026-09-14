import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { normalizarNomeExcel } from "./normalizar-nome-excel";

export interface ColisaoAlias {
  aliasNormalizado: string;
  entregadorIds: string[];
}

export function encontrarColisoesAliases(perfis: PerfilEntregador[]): ColisaoAlias[] {
  const mapa = new Map<string, Set<string>>();

  for (const perfil of perfis) {
    for (const alias of perfil.excelAliases) {
      const chave = normalizarNomeExcel(alias);
      const ids = mapa.get(chave) ?? new Set<string>();
      ids.add(perfil.entregadorId);
      mapa.set(chave, ids);
    }
  }

  return [...mapa.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([aliasNormalizado, ids]) => ({
      aliasNormalizado,
      entregadorIds: [...ids],
    }));
}

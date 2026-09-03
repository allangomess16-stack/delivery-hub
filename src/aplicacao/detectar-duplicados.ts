import type { PacoteDaCarga } from "../dominio/carga/tipos";

export interface DuplicidadeEncontrada {
  codigo: string;
  ocorrencias: PacoteDaCarga[];
}

export function detectarDuplicados(pacotes: PacoteDaCarga[]): DuplicidadeEncontrada[] {
  const grupos = new Map<string, PacoteDaCarga[]>();

  for (const pacote of pacotes) {
    if (!pacote.codigoNormalizado) continue;

    const grupo = grupos.get(pacote.codigoNormalizado) ?? [];
    grupo.push(pacote);
    grupos.set(pacote.codigoNormalizado, grupo);
  }

  return [...grupos.entries()]
    .filter(([, ocorrencias]) => ocorrencias.length > 1)
    .map(([codigo, ocorrencias]) => ({ codigo, ocorrencias }));
}

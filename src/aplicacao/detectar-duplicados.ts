import type { PacoteDaCarga } from "../dominio/carga/tipos";

export interface DuplicidadeEncontrada {
  codigo: string;
  ocorrencias: PacoteDaCarga[];
}

export function descreverOrigemPacote(pacote: PacoteDaCarga): string {
  const origem = pacote.origemPlanilha;
  if (!origem) return pacote.entregador;
  return `${pacote.entregador} — linha ${origem.linha}, coluna ${origem.celula.replace(/[0-9]+$/, "")} (${origem.celula})`;
}

export function descreverDuplicidade(duplicidade: DuplicidadeEncontrada): string {
  return `Tracking ${duplicidade.codigo}: ${duplicidade.ocorrencias
    .map(descreverOrigemPacote)
    .join("; ")}`;
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

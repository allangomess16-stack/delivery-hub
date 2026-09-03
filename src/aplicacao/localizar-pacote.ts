import { normalizarCodigo } from "./normalizar-codigo";
import type { PacoteDaCarga } from "../dominio/carga/tipos";

export interface ResultadoBuscaPacote {
  codigoBuscado: string;
  encontrados: PacoteDaCarga[];
  erro?: string;
}

export function localizarPacote(
  pacotes: PacoteDaCarga[],
  valorLido: unknown,
): ResultadoBuscaPacote {
  const codigo = normalizarCodigo(valorLido).codigo;

  if (!codigo) {
    return { codigoBuscado: "", encontrados: [], erro: "Leia ou informe um codigo valido." };
  }

  const encontrados = pacotes.filter(
    (pacote) => pacote.codigoNormalizado.toUpperCase() === codigo.toUpperCase(),
  );

  if (!encontrados.length) {
    return { codigoBuscado: codigo, encontrados, erro: "Pacote nao encontrado na sua carga." };
  }

  if (encontrados.length > 1) {
    return { codigoBuscado: codigo, encontrados, erro: "Codigo duplicado na sua carga. Revise antes de iniciar." };
  }

  return { codigoBuscado: codigo, encontrados };
}

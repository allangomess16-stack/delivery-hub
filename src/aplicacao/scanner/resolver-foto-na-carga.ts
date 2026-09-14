import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { localizarPacote } from "../localizar-pacote";

export interface ResultadoFotoNaCarga {
  pacote?: PacoteDaCarga;
  codigo?: string;
  codigosLidos: string[];
  erro?: string;
}

export function resolverFotoNaCarga(
  pacotes: PacoteDaCarga[],
  codigosLidos: string[],
): ResultadoFotoNaCarga {
  const encontrados = new Map<string, { pacote: PacoteDaCarga; codigo: string }>();

  for (const codigo of codigosLidos) {
    const resultado = localizarPacote(pacotes, codigo);

    if (resultado.encontrados.length === 1 && !resultado.erro) {
      const pacote = resultado.encontrados[0];
      encontrados.set(pacote.id, {
        pacote,
        codigo: resultado.codigoBuscado,
      });
    }
  }

  if (encontrados.size === 1) {
    const unico = [...encontrados.values()][0];
    return {
      pacote: unico.pacote,
      codigo: unico.codigo,
      codigosLidos,
    };
  }

  if (encontrados.size > 1) {
    return {
      codigosLidos,
      erro:
        "A foto contem codigos de mais de uma encomenda da sua carga. Aproxime a camera apenas da etiqueta desejada.",
    };
  }

  const resumo = codigosLidos.slice(0, 3).join(", ");
  return {
    codigosLidos,
    erro: resumo
      ? `Codigo lido (${resumo}), mas ele nao corresponde a nenhum pacote da sua carga. Fotografe o tracking principal da etiqueta ou digite o codigo.`
      : "Nenhum codigo compativel com a sua carga foi encontrado.",
  };
}

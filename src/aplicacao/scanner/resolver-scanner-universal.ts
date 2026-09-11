import type { CargaEntregador } from "../../dominio/carga/tipos";
import type {
  ResolucaoScannerUniversal,
  ResultadoScannerUniversal,
} from "../../dominio/scanner/tipos";
import { identificarTransportadora } from "../identificar-transportadora";
import { normalizarCodigo } from "../normalizar-codigo";
import type { IdTransportadora, TransportadoraIdentificada } from "../../dominio/transportadora/tipos";

export function resolverScannerUniversal(
  valor: unknown,
  carga: CargaEntregador | null,
): ResolucaoScannerUniversal {
  const normalizado = normalizarCodigo(valor);
  if (!normalizado.codigo) {
    return {
      sucesso: false,
      falha: { codigo: "CODIGO_VAZIO", mensagem: "Nenhum tracking foi identificado." },
    };
  }

  const transportadora = identificarTransportadora(normalizado.codigo);
  if (transportadora.id === "OUTRA") {
    return {
      sucesso: false,
      falha: {
        codigo: "TRANSPORTADORA_NAO_RECONHECIDA",
        mensagem: "O codigo foi lido, mas a transportadora ainda nao foi reconhecida.",
      },
    };
  }

  const encontrados = carga?.pacotes.filter(
    (pacote) => pacote.codigoNormalizado === normalizado.codigo,
  ) ?? [];

  if (encontrados.length > 1) {
    return {
      sucesso: false,
      falha: {
        codigo: "CODIGO_AMBIGUO",
        mensagem: "O tracking aparece mais de uma vez na carga. Solicite revisao ao administrador.",
      },
    };
  }

  const pacote = encontrados[0];
  const resultado: ResultadoScannerUniversal = {
    tracking: normalizado.codigo,
    transportadora,
    // Com carga ativa, uma etiqueta fora dela precisa ser auditada como
    // extra-rota. Sem carga ativa, a mesma leitura e legitimamente avulsa.
    origem: pacote ? "CARGA_IMPORTADA" : carga ? "EXTRA_ROTA" : "SCANNER_LIVRE",
    pacote,
    cargaId: pacote ? carga?.cargaId : undefined,
  };
  return { sucesso: true, resultado };
}

/**
 * Caminho assistido: conserva o tracking lido e registra que a empresa foi
 * escolhida pelo entregador, sem afirmar que o padrão foi homologado.
 */
export function resolverTransportadoraManual(
  valor: unknown,
  transportadora: Exclude<IdTransportadora, "OUTRA">,
  carga: CargaEntregador | null,
): ResolucaoScannerUniversal {
  const normalizado = normalizarCodigo(valor);
  if (!normalizado.codigo) {
    return { sucesso: false, falha: { codigo: "CODIGO_VAZIO", mensagem: "Nenhum tracking foi identificado." } };
  }

  const identificada: TransportadoraIdentificada = {
    id: transportadora,
    nome: transportadora === "IMILE" ? "iMile" : transportadora === "JNT" ? "J&T Express" : "Anjun",
    confianca: "MEDIA",
    regraUsada: "SELECAO_MANUAL",
  };
  const encontrados = carga?.pacotes.filter((pacote) => pacote.codigoNormalizado === normalizado.codigo) ?? [];
  if (encontrados.length > 1) {
    return { sucesso: false, falha: { codigo: "CODIGO_AMBIGUO", mensagem: "O tracking aparece mais de uma vez na carga. Solicite revisao ao administrador." } };
  }
  const pacote = encontrados[0];
  return {
    sucesso: true,
    resultado: {
      tracking: normalizado.codigo,
      transportadora: identificada,
      origem: pacote ? "CARGA_IMPORTADA" : carga ? "EXTRA_ROTA" : "SCANNER_LIVRE",
      pacote,
      cargaId: pacote ? carga?.cargaId : undefined,
      transportadoraSelecionadaManual: true,
    },
  };
}

/** Prioriza um codigo da carga; fora dela, aceita um unico sistema reconhecido. */
export function resolverCodigosScannerUniversal(
  codigos: readonly string[],
  carga: CargaEntregador | null,
): ResolucaoScannerUniversal {
  const resolvidos = codigos
    .map((codigo) => resolverScannerUniversal(codigo, carga))
    .filter((item): item is { sucesso: true; resultado: ResultadoScannerUniversal } => item.sucesso);

  const unicos = new Map(resolvidos.map((item) => [item.resultado.tracking, item.resultado]));
  const resultados = [...unicos.values()];
  const naCarga = resultados.filter((item) => item.origem === "CARGA_IMPORTADA");

  if (naCarga.length === 1) return { sucesso: true, resultado: naCarga[0] };
  if (naCarga.length > 1 || resultados.length > 1) {
    return {
      sucesso: false,
      falha: {
        codigo: "CODIGO_AMBIGUO",
        mensagem: "Mais de um tracking foi reconhecido. Enquadre apenas o codigo principal.",
      },
    };
  }
  if (resultados.length === 1) return { sucesso: true, resultado: resultados[0] };
  return {
    sucesso: false,
    falha: {
      codigo: "TRANSPORTADORA_NAO_RECONHECIDA",
      mensagem: "Nenhum sistema compativel foi reconhecido nesta leitura.",
    },
  };
}

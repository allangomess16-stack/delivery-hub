import { identificarTransportadora } from "../identificar-transportadora";
import { normalizarCodigo } from "../normalizar-codigo";
import { obterIntegracaoTransportadora } from "../../configuracao/integracoes-transportadoras";
import type { IdTransportadora } from "../../dominio/transportadora/tipos";

export interface CodigoEtiquetaAnalisado {
  bruto: string;
  normalizado: string;
  transportadora: IdTransportadora;
  nomeTransportadora: string;
  confianca: string;
  regraUsada?: string;
  conhecido: boolean;
}

export interface AnaliseEtiquetaHomologacao {
  codigos: CodigoEtiquetaAnalisado[];
  principal: CodigoEtiquetaAnalisado | null;
  exigeEscolha: boolean;
  aviso?: string;
}

function unicos<T>(itens: T[], chave: (item: T) => string): T[] {
  const vistos = new Set<string>();
  return itens.filter((item) => {
    const valor = chave(item);
    if (!valor || vistos.has(valor)) return false;
    vistos.add(valor);
    return true;
  });
}

export function analisarCodigosEtiqueta(
  codigosBrutos: string[],
): AnaliseEtiquetaHomologacao {
  const codigos = unicos(
    codigosBrutos
      .map((bruto) => {
        const normalizado = normalizarCodigo(bruto).codigo;
        const identificada = identificarTransportadora(normalizado);

        return {
          bruto,
          normalizado,
          transportadora: identificada.id,
          nomeTransportadora: identificada.nome,
          confianca: identificada.confianca,
          regraUsada: identificada.regraUsada,
          conhecido: identificada.id !== "OUTRA",
        } satisfies CodigoEtiquetaAnalisado;
      })
      .filter((item) => item.normalizado.length > 0),
    (item) => item.normalizado,
  );

  const reconhecidos = codigos.filter((item) => item.conhecido);

  if (reconhecidos.length === 1) {
    return {
      codigos,
      principal: reconhecidos[0],
      exigeEscolha: false,
    };
  }

  if (reconhecidos.length > 1) {
    return {
      codigos,
      principal: null,
      exigeEscolha: true,
      aviso:
        "A foto contem mais de um codigo compativel com transportadoras conhecidas. Escolha o tracking principal da encomenda.",
    };
  }

  if (codigos.length === 1) {
    return {
      codigos,
      principal: codigos[0],
      exigeEscolha: false,
      aviso:
        "O codigo foi lido, mas o padrao ainda nao esta associado a J&T, Anjun ou iMile.",
    };
  }

  return {
    codigos,
    principal: null,
    exigeEscolha: codigos.length > 1,
    aviso:
      codigos.length > 1
        ? "Foram encontrados varios codigos. Selecione o tracking impresso como principal na etiqueta."
        : "Nenhum codigo utilizavel foi encontrado.",
  };
}

export function resumoIntegracaoDaEtiqueta(
  transportadora: IdTransportadora,
): {
  packageName: string | null;
  nivel: string;
  mensagem: string;
} {
  const registro = obterIntegracaoTransportadora(transportadora);

  if (!registro) {
    return {
      packageName: null,
      nivel: "UNKNOWN",
      mensagem: "Transportadora ainda nao cadastrada no motor de integracoes.",
    };
  }

  if (transportadora === "JNT") {
    return {
      packageName: null,
      nivel: registro.nivelPackage,
      mensagem:
        "Tracking J&T reconhecido pelo padrao da etiqueta; APK operacional ainda aguarda confirmacao.",
    };
  }

  return {
    packageName: registro.packageName,
    nivel: registro.nivelPackage,
    mensagem:
      "Aplicativo conhecido por analise de APK. Este modo de homologacao nao envia dados ao aplicativo da transportadora.",
  };
}

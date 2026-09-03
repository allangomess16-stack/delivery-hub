import { REGIOES_DF, type RegiaoOperacionalConfig } from "../../configuracao/regioes-df";
import type { RegiaoEntrega } from "../../dominio/carga/tipos";
import { normalizarTextoRegiao } from "./normalizar-texto-regiao";

export interface ResultadoRegiaoEndereco {
  regiao?: RegiaoEntrega;
  candidatas: RegiaoOperacionalConfig[];
}

function aliasEncontrado(texto: string, alias: string): boolean {
  if (!texto || !alias) return false;
  return ` ${texto} `.includes(` ${alias} `);
}

export function obterRegiaoConfig(regiaoId: string): RegiaoOperacionalConfig | undefined {
  return REGIOES_DF.find((regiao) => regiao.id === regiaoId);
}

export function resolverRegiaoPorNome(nome: string): RegiaoOperacionalConfig | undefined {
  const normalizado = normalizarTextoRegiao(nome);
  if (!normalizado) return undefined;

  return REGIOES_DF.find((regiao) => {
    const nomes = [regiao.nome, ...regiao.aliases].map(normalizarTextoRegiao);
    return nomes.includes(normalizado);
  });
}

export function resolverRegiaoPorEndereco(endereco: string): ResultadoRegiaoEndereco {
  const texto = normalizarTextoRegiao(endereco);
  if (!texto) return { candidatas: [] };

  const pontuadas = REGIOES_DF.map((regiao) => {
    const aliases = [regiao.nome, ...regiao.aliases]
      .map(normalizarTextoRegiao)
      .filter((alias) => aliasEncontrado(texto, alias));
    const maiorAlias = aliases.reduce((maior, alias) => Math.max(maior, alias.length), 0);
    return { regiao, maiorAlias };
  }).filter((item) => item.maiorAlias > 0);

  if (!pontuadas.length) return { candidatas: [] };

  const maiorPontuacao = Math.max(...pontuadas.map((item) => item.maiorAlias));
  const melhores = pontuadas
    .filter((item) => item.maiorAlias === maiorPontuacao)
    .map((item) => item.regiao);

  if (melhores.length !== 1) return { candidatas: melhores };

  const encontrada = melhores[0];
  return {
    candidatas: melhores,
    regiao: {
      regiaoId: encontrada.id,
      nome: encontrada.nome,
      origem: "ENDERECO",
      confianca: "ALTA",
    },
  };
}

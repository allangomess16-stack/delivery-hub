import type { PacoteDaCarga, RegiaoEntrega } from "../../dominio/carga/tipos";
import { obterRegiaoConfig, resolverRegiaoPorEndereco, resolverRegiaoPorNome } from "./resolver-regiao-endereco";
import { normalizarTextoRegiao } from "./normalizar-texto-regiao";

function idRegiaoPersonalizada(nome: string): string {
  const base = normalizarTextoRegiao(nome).replace(/\s+/g, "-");
  return `CUSTOM-${base || "SEM-NOME"}`;
}

export interface DadosLocalizacaoPacote {
  endereco: string;
  regiaoId?: string;
  regiaoPersonalizada?: string;
  origemRegiao?: "MANUAL" | "IMPORTACAO";
}

export function definirLocalizacaoPacote(
  pacote: PacoteDaCarga,
  dados: DadosLocalizacaoPacote,
): void {
  const endereco = dados.endereco.trim();
  pacote.enderecoEntrega = endereco ? { texto: endereco } : undefined;

  if (dados.regiaoId) {
    const config = obterRegiaoConfig(dados.regiaoId);
    if (!config) throw new Error("Regiao selecionada nao encontrada.");
    pacote.regiaoEntrega = {
      regiaoId: config.id,
      nome: config.nome,
      origem: dados.origemRegiao ?? "MANUAL",
      confianca: "MANUAL",
    };
    pacote.atualizadoEm = new Date().toISOString();
    return;
  }

  const personalizada = dados.regiaoPersonalizada?.trim();
  if (personalizada) {
    const conhecida = resolverRegiaoPorNome(personalizada);
    const regiao: RegiaoEntrega = conhecida
      ? {
          regiaoId: conhecida.id,
          nome: conhecida.nome,
          origem: dados.origemRegiao ?? "MANUAL",
          confianca: "MANUAL",
        }
      : {
          regiaoId: idRegiaoPersonalizada(personalizada),
          nome: personalizada,
          origem: dados.origemRegiao ?? "MANUAL",
          confianca: "MANUAL",
        };
    pacote.regiaoEntrega = regiao;
    pacote.atualizadoEm = new Date().toISOString();
    return;
  }

  const automatica = resolverRegiaoPorEndereco(endereco).regiao;
  pacote.regiaoEntrega = automatica;
  pacote.atualizadoEm = new Date().toISOString();
}

export function definirRegiaoEmLote(
  pacotes: PacoteDaCarga[],
  pacoteIds: string[],
  regiaoId?: string,
  regiaoPersonalizada?: string,
): number {
  const ids = new Set(pacoteIds);
  let alterados = 0;

  for (const pacote of pacotes) {
    if (!ids.has(pacote.id)) continue;
    definirLocalizacaoPacote(pacote, {
      endereco: pacote.enderecoEntrega?.texto ?? "",
      regiaoId,
      regiaoPersonalizada,
      origemRegiao: "MANUAL",
    });
    alterados += 1;
  }

  return alterados;
}

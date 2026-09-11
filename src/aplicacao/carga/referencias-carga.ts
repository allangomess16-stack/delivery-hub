import type {
  CargaEntregador,
  CargaImportada,
  OrigemLoteCarga,
} from "../../dominio/carga/tipos";

function somenteIdentificador(valor: string): string {
  const limpo = valor.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (limpo.slice(-6) || "000000").padStart(6, "0");
}

function dataCompacta(dataOperacao: string): string {
  return dataOperacao.replace(/-/g, "");
}

export function criarReferenciaLote(
  loteId: string,
  dataOperacao: string,
): string {
  return `LOTE-${dataCompacta(dataOperacao)}-${somenteIdentificador(loteId)}`;
}

export function criarReferenciaCarga(
  cargaId: string,
  dataOperacao: string,
): string {
  return `CARGA-${dataCompacta(dataOperacao)}-${somenteIdentificador(cargaId)}`;
}

export function obterReferenciaLote(carga: CargaEntregador): string {
  return carga.referenciaLote ?? criarReferenciaLote(carga.cargaOrigemId, carga.dataOperacao);
}

export function obterReferenciaCarga(carga: CargaEntregador): string {
  return carga.referenciaCarga ?? criarReferenciaCarga(carga.cargaId, carga.dataOperacao);
}

export function criarOrigemLote(
  importacao: CargaImportada,
  dataOperacao: string,
  quantidadePacotes: number,
): OrigemLoteCarga {
  return {
    loteId: importacao.id,
    referencia: criarReferenciaLote(importacao.id, dataOperacao),
    nomeArquivo: importacao.nomeArquivo,
    importadaEm: importacao.importadaEm,
    quantidadePacotes,
  };
}

export function listarOrigensLote(carga: CargaEntregador): OrigemLoteCarga[] {
  if (carga.lotesOrigem?.length) return carga.lotesOrigem;
  return [{
    loteId: carga.cargaOrigemId,
    referencia: obterReferenciaLote(carga),
    nomeArquivo: carga.nomeArquivoOrigem,
    importadaEm: carga.criadaEm,
    quantidadePacotes: carga.pacotes.length,
  }];
}

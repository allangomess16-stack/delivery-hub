import type { CargaImportada } from "../../dominio/carga/tipos";

/**
 * Remove uma coluna auxiliar da importacao sem alterar o arquivo original.
 * A decisao fica registrada para auditoria durante a sessao do Admin.
 */
export function ignorarColunaImportacao(
  carga: CargaImportada,
  cabecalho: string,
): CargaImportada {
  const quantidadeDescartada = carga.pacotes.filter(
    (pacote) => pacote.entregador === cabecalho,
  ).length;

  if (!carga.entregadores.includes(cabecalho)) {
    throw new Error("A coluna escolhida nao existe nesta importacao.");
  }

  return {
    ...carga,
    pacotes: carga.pacotes.filter((pacote) => pacote.entregador !== cabecalho),
    entregadores: carga.entregadores.filter((item) => item !== cabecalho),
    colunasIgnoradas: [
      ...(carga.colunasIgnoradas ?? []),
      {
        cabecalho,
        quantidadeDescartada,
        ignoradaEm: new Date().toISOString(),
      },
    ],
  };
}

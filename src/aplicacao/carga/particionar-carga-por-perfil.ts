import type { CargaEntregador, CargaImportada } from "../../dominio/carga/tipos";
import type { PerfilEncontrado } from "../identidade/conciliar-perfis-planilha";
import { normalizarNomeExcel } from "../identidade/normalizar-nome-excel";

function dataLocalIso(data = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function particionarCargaPorPerfil(
  carga: CargaImportada,
  encontrados: PerfilEncontrado[],
  dataOperacao = dataLocalIso(),
): CargaEntregador[] {
  const perfilPorColuna = new Map(
    encontrados.map((item) => [item.colunaNormalizada, item.perfil]),
  );

  const pacotesPorEntregador = new Map<string, CargaEntregador["pacotes"]>();

  for (const pacote of carga.pacotes) {
    const perfil = perfilPorColuna.get(normalizarNomeExcel(pacote.entregador));
    if (!perfil) {
      throw new Error(`Coluna sem perfil conciliado: ${pacote.entregador}`);
    }

    const atual = pacotesPorEntregador.get(perfil.entregadorId) ?? [];
    atual.push({
      ...pacote,
      origem: pacote.origem ?? "EXCEL",
      criadoEm: pacote.criadoEm ?? carga.importadaEm,
      atualizadoEm: new Date().toISOString(),
    });
    pacotesPorEntregador.set(perfil.entregadorId, atual);
  }

  const perfisUnicos = new Map(encontrados.map((item) => [item.entregadorId, item.perfil]));

  return [...perfisUnicos.values()].map((perfil) => {
    const pacotes = pacotesPorEntregador.get(perfil.entregadorId) ?? [];
    const cargaId = crypto.randomUUID();

    return {
      cargaId,
      cargaOrigemId: carga.id,
      entregadorId: perfil.entregadorId,
      nomeEntregador: perfil.nomeOficial,
      dataOperacao,
      nomeArquivoOrigem: carga.nomeArquivo,
      criadaEm: new Date().toISOString(),
      pacotes,
      chaveRemotaSimulada: `loads/${dataOperacao}/couriers/${perfil.entregadorId}/${cargaId}`,
      status: "PUBLICADA",
      publicadaEm: new Date().toISOString(),
    };
  });
}

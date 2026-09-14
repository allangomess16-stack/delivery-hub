import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { normalizarNomeExcel } from "./normalizar-nome-excel";

function slug(valor: string): string {
  return normalizarNomeExcel(valor)
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "ENTREGADOR";
}

export function criarPerfilEntregador(
  nomeOficial: string,
  primeiroAlias: string,
): PerfilEntregador {
  const agora = new Date().toISOString();
  const sufixo = crypto.randomUUID().slice(0, 6).toUpperCase();

  return {
    entregadorId: `ENT-${slug(nomeOficial)}-${sufixo}`,
    nomeOficial: nomeOficial.trim(),
    ativo: true,
    excelAliases: [primeiroAlias.trim()],
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

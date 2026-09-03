import type { PacoteDaCarga } from "../dominio/carga/tipos";

export function filtrarPacotesParaRevisao(pacotes: PacoteDaCarga[]): PacoteDaCarga[] {
  return pacotes
    .filter((pacote) => pacote.precisaRevisao)
    .sort((a, b) => {
      const porEntregador = a.entregador.localeCompare(b.entregador, "pt-BR");
      if (porEntregador !== 0) return porEntregador;
      return a.codigoNormalizado.localeCompare(b.codigoNormalizado, "pt-BR");
    });
}

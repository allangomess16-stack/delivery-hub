import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";

export interface CargaParaConciliacao {
  carga: CargaEntregador;
  nomeEntregador: string;
}

export interface AlertaExtraRota {
  cargaExecutora: CargaEntregador;
  pacote: PacoteDaCarga;
  executor: string;
  /** Dono sugerido apenas quando o mesmo AWB está em outra carga ativa. */
  atribuidoSugerido?: string;
  trocaMutuaSugeridaCom?: string;
}

/**
 * Produz sugestões, nunca transfere ou confirma baixa automaticamente.
 * A decisão segue sendo humana e auditável no painel administrativo.
 */
export function listarAlertasExtraRota(
  itens: readonly CargaParaConciliacao[],
): AlertaExtraRota[] {
  const abertos = itens.flatMap(({ carga, nomeEntregador }) => carga.pacotes
    .filter((pacote) => pacote.alertaAdmin && pacote.conciliacaoExtraRota?.status !== "RESOLVIDA")
    .map((pacote) => ({ cargaExecutora: carga, pacote, executor: nomeEntregador })));

  return abertos.map((alerta) => {
    const dono = itens.find(({ carga }) =>
      carga.entregadorId !== alerta.cargaExecutora.entregadorId &&
      (carga.status ?? "PUBLICADA") !== "ENCERRADA" &&
      carga.pacotes.some((pacote) => pacote.codigoNormalizado === alerta.pacote.codigoNormalizado),
    );
    const troca = dono && abertos.find((outra) =>
      outra.executor === dono.nomeEntregador &&
      outra.pacote.codigoNormalizado !== alerta.pacote.codigoNormalizado &&
      itens.some(({ carga, nomeEntregador }) =>
        nomeEntregador === alerta.executor &&
        carga.pacotes.some((pacote) => pacote.codigoNormalizado === outra.pacote.codigoNormalizado),
      ),
    );
    return {
      ...alerta,
      atribuidoSugerido: dono?.nomeEntregador,
      trocaMutuaSugeridaCom: troca?.executor,
    };
  });
}

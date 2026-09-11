import type { DestinoSincronizacaoEntrega } from "../../aplicacao/portas/destino-sincronizacao-entrega";
import type { ItemOutboxEntrega, ResultadoEnvioOperacao } from "../../dominio/sincronizacao/tipos";

/**
 * Destino usado apenas no modo local de desenvolvimento. Ele simula o aceite
 * idempotente pelo Hub sem afirmar que houve baixa na transportadora.
 */
export class DestinoSincronizacaoLocal implements DestinoSincronizacaoEntrega {
  private readonly recebidas = new Set<string>();

  async enviar(item: ItemOutboxEntrega): Promise<ResultadoEnvioOperacao> {
    const processadaAntes = this.recebidas.has(item.operacaoId);
    this.recebidas.add(item.operacaoId);
    return { tipo: "RECEBIDA_PELO_HUB", processadaAntes };
  }
}

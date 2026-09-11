import type { ServicoSincronizacaoEntrega } from "../../aplicacao/sincronizacao/servico-sincronizacao-entrega";

/**
 * Sincronizacao automatica enquanto o WebView/aplicacao esta ativo.
 *
 * A V0.4.0 nao promete execucao depois que o Android mata o processo. Isso
 * exigira um agendador nativo na etapa Android. Aqui cobrimos os eventos que
 * importam para a operacao em primeiro plano: inicializacao, retorno do sinal,
 * retorno da aba/app e uma varredura periodica leve.
 */
export class SincronizadorAutomaticoOutbox {
  private timer: number | null = null;
  private iniciado = false;

  constructor(
    private readonly servico: ServicoSincronizacaoEntrega,
    private readonly intervaloMs = 15_000,
  ) {}

  iniciar(entregadorId?: string): () => void {
    if (this.iniciado) return () => this.parar();
    this.iniciado = true;

    const solicitar = () => {
      if (document.visibilityState === "hidden") return;
      void this.servico.sincronizarAgora(entregadorId);
    };

    const aoOnline = () => solicitar();
    const aoVisibilidade = () => {
      if (document.visibilityState === "visible") solicitar();
    };
    const aoFoco = () => solicitar();

    window.addEventListener("online", aoOnline);
    window.addEventListener("focus", aoFoco);
    document.addEventListener("visibilitychange", aoVisibilidade);
    this.timer = window.setInterval(solicitar, this.intervaloMs);

    window.setTimeout(solicitar, 200);

    return () => {
      window.removeEventListener("online", aoOnline);
      window.removeEventListener("focus", aoFoco);
      document.removeEventListener("visibilitychange", aoVisibilidade);
      this.parar();
    };
  }

  parar(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.iniciado = false;
  }
}

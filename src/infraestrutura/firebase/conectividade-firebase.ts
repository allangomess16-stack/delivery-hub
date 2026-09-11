import type { FonteConectividade } from "../../aplicacao/portas/fonte-conectividade";

/**
 * Evita uma assinatura permanente apenas para descobrir conectividade.
 * navigator.onLine e um filtro rapido; a chamada REST confirma o backend.
 */
export class ConectividadeFirebase implements FonteConectividade {
  private conectado = typeof navigator === "undefined" ? false : navigator.onLine;
  private iniciada = false;
  private readonly aoFicarOnline = () => { this.conectado = true; };
  private readonly aoFicarOffline = () => { this.conectado = false; };

  iniciar(): () => void {
    if (!this.iniciada && typeof window !== "undefined") {
      this.iniciada = true;
      this.conectado = navigator.onLine;
      window.addEventListener("online", this.aoFicarOnline);
      window.addEventListener("offline", this.aoFicarOffline);
    }

    return () => this.encerrar();
  }

  estaOnline(): boolean {
    return this.conectado;
  }

  encerrar(): void {
    if (this.iniciada && typeof window !== "undefined") {
      window.removeEventListener("online", this.aoFicarOnline);
      window.removeEventListener("offline", this.aoFicarOffline);
    }
    this.iniciada = false;
    this.conectado = false;
  }
}

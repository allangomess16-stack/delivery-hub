import { escaparHtml } from "./html";

export function cabecalhoFixo(titulo: string, subtitulo = "Operacao") {
  return `
    <header class="cabecalho-fixo">
      <div class="marca">
        <span class="marca__sinal" aria-hidden="true"></span>
        <div>
          <strong>${escaparHtml(titulo)}</strong>
          <span>${escaparHtml(subtitulo)}</span>
        </div>
      </div>
      <span class="status-local"><i></i> LOCAL</span>
    </header>
  `;
}

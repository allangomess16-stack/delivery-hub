import { escaparHtml } from "./html";
import { VERSAO_DELIVERY_HUB } from "../../configuracao/versao";

export function atualizarIndicadorConectividade(): void {
  const online = navigator.onLine;
  document.querySelectorAll<HTMLElement>("[data-status-rede]").forEach((elemento) => {
    elemento.dataset.online = String(online);
    elemento.lastChild!.textContent = online ? " COM REDE" : " SEM REDE";
  });
}

export interface AcaoCabecalho {
  id: string;
  rotulo: string;
}

export function cabecalhoFixo(
  titulo: string,
  subtitulo = "Operacao",
  exibirVersao = false,
  acao?: AcaoCabecalho,
) {
  const online = navigator.onLine;
  return `
    <header class="cabecalho-fixo">
      <div class="marca">
        <span class="marca__sinal" aria-hidden="true"></span>
        <div>
          <strong>${escaparHtml(titulo)}${exibirVersao ? ` · v${VERSAO_DELIVERY_HUB}` : ""}</strong>
          <span>${escaparHtml(subtitulo)}</span>
        </div>
      </div>
      <div class="cabecalho-fixo__acoes">
        ${acao ? `<button id="${escaparHtml(acao.id)}" class="cabecalho-fixo__acao">${escaparHtml(acao.rotulo)}</button>` : ""}
        <span class="status-local" data-status-rede data-online="${online}"><i></i> ${online ? "COM REDE" : "SEM REDE"}</span>
      </div>
    </header>
  `;
}

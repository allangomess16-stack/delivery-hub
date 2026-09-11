import type { ResultadoScannerUniversal } from "../../dominio/scanner/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaResultadoScannerUniversal(
  nomeEntregador: string,
  leitura: ResultadoScannerUniversal,
  possuiIntegracao: boolean,
): string {
  const naCarga = leitura.origem === "CARGA_IMPORTADA";
  const extraRota = leitura.origem === "EXTRA_ROTA";
  return `
    ${cabecalhoFixo(nomeEntregador, "Scanner universal")}
    <main class="conteudo conteudo--com-rodape">
      <section class="resultado-entrega resultado-entrega--compacto ${possuiIntegracao ? "resultado-entrega--ok" : "resultado-entrega--atencao"}">
        <span class="resultado-entrega__icone">${possuiIntegracao ? "✓" : "!"}</span>
        <span class="sobrelinha">${escaparHtml(leitura.transportadora.nome.toUpperCase())}</span>
        <h1>${possuiIntegracao ? "Sistema reconhecido" : "Integracao pendente"}</h1>
        <strong class="codigo-destaque">${escaparHtml(leitura.tracking)}</strong>
        <p>${leitura.transportadoraSelecionadaManual
          ? "Transportadora escolhida manualmente. O tracking será sinalizado para conferência."
          : naCarga
          ? "Encomenda localizada na carga atual."
          : extraRota
            ? "Pacote nao esta na sua carga. O lancamento e permitido e sera sinalizado ao administrador."
            : "Leitura livre: a encomenda nao depende de carga importada."}</p>
      </section>

      <section class="painel-destaque painel-destaque--compacto">
        <span class="sobrelinha">ENCAMINHAMENTO</span>
        <p id="resultado-scanner-integracao" class="texto-apoio" role="status" aria-live="polite">
          ${possuiIntegracao ? "Registre o POD uma vez no Hub ou use a abertura direta." : "Este sistema ainda nao possui um adaptador operacional."}
        </p>
        ${possuiIntegracao ? `
          <button id="reabrir-transportadora" class="botao-acao botao-acao--secundario">ABRIR TRANSPORTADORA</button>
        ` : ""}
        <button id="registrar-entrega-completa" class="botao-acao botao-acao--sucesso">REGISTRAR POD NO DELIVERY HUB</button>
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="proxima-leitura-universal" class="botao-acao botao-acao--primario">ESCANEAR PROXIMA</button>
    </footer>
  `;
}

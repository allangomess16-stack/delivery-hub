import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaScanner(nomeEntregador: string, mensagem = "") {
  return `
    ${cabecalhoFixo(nomeEntregador, "Ler pacote")}

    <main class="conteudo conteudo--com-rodape">
      <section class="painel-operacao">
        <span class="sobrelinha">SCANNER UNIVERSAL</span>
        <h1>Escanear etiqueta</h1>
        <p>
          Aponte a camera para o codigo principal. A carga importada adiciona
          contexto, mas nao limita o reconhecimento da etiqueta.
        </p>

        <div id="scanner-visor" class="scanner-ao-vivo" data-estado="procurando">
          <video
            id="scanner-video"
            class="scanner-ao-vivo__video"
            autoplay
            muted
            playsinline
          ></video>
          <div class="scanner-ao-vivo__mascara" aria-hidden="true">
            <div class="scanner-ao-vivo__moldura">
              <span></span><span></span><span></span><span></span>
              <i></i>
            </div>
          </div>
        </div>

        <div id="status-scanner" class="status-scanner-foto" data-estado="procurando" aria-live="polite">
          ${escaparHtml(mensagem || "Preparando camera...")}
        </div>

        <section id="scanner-candidato" class="scanner-candidato" hidden aria-live="polite">
          <span class="sobrelinha">PRIMEIRA LEITURA</span>
          <strong id="scanner-candidato-codigo">--</strong>
          <span id="scanner-candidato-transportadora">--</span>
          <button id="scanner-confirmar-primeira" class="botao-acao botao-acao--sucesso botao-largura-total" disabled>
            CONFIRMAR E CONTINUAR
          </button>
          <small>Se estiver correto, confirme agora ou mantenha a etiqueta enquadrada para confirmar automaticamente.</small>
        </section>

        <div class="scanner-ao-vivo__controles">
          <button id="scanner-lanterna" class="botao-acao botao-acao--secundario" disabled>
            LANTERNA
          </button>
          <button id="scanner-reiniciar" class="botao-acao botao-acao--secundario">
            REINICIAR CAMERA
          </button>
        </div>

        ${mensagem ? `<div class="mensagem-operacao mensagem-operacao--erro">${escaparHtml(mensagem)}</div>` : ""}

        <div class="separador-scanner"><span>FALLBACK</span></div>

        <details class="scanner-manual">
          <summary>LER ETIQUETA DA GALERIA</summary>
          <label class="botao-scanner-foto botao-scanner-foto--compacto">
            <input
              id="foto-scanner"
              class="arquivo-escondido"
              type="file"
              accept="image/*"
            />
            <span class="botao-scanner-foto__icone">▣</span>
            <strong>SELECIONAR FOTO DA GALERIA</strong>
            <small>Use uma etiqueta fotografada antes; a câmera ao vivo fica acima.</small>
          </label>
        </details>

        <details class="scanner-manual">
          <summary>DIGITAR / COLAR CODIGO</summary>

          <label class="campo-grande">
            <span>CODIGO / TRACKING</span>
            <input
              id="codigo-scanner"
              inputmode="text"
              autocomplete="off"
              autocapitalize="characters"
              placeholder="Ex.: 999881790335907"
            />
          </label>

          <button id="procurar-pacote" class="botao-acao botao-acao--secundario botao-largura-total">
            RECONHECER E ENCAMINHAR
          </button>
        </details>

      </section>
    </main>

    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-entregador" class="botao-acao botao-acao--secundario">VOLTAR</button>
    </footer>
  `;
}

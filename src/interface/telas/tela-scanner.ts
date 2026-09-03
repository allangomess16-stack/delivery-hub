import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaScanner(nomeEntregador: string, mensagem = "") {
  return `
    ${cabecalhoFixo(nomeEntregador, "Ler pacote")}

    <main class="conteudo conteudo--com-rodape">
      <section class="painel-operacao">
        <span class="sobrelinha">SOMENTE SUA CARGA</span>
        <h1>Escanear etiqueta</h1>
        <p>
          Fotografe o codigo principal da etiqueta. O sistema le o barcode/QR
          e procura somente dentro da sua carga.
        </p>

        <label class="botao-scanner-foto">
          <input
            id="foto-scanner"
            class="arquivo-escondido"
            type="file"
            accept="image/*"
            capture="environment"
          />
          <span class="botao-scanner-foto__icone">▣</span>
          <strong>LER CODIGO PELA CAMERA</strong>
          <small>Fotografar etiqueta</small>
        </label>

        <div id="status-scanner-foto" class="status-scanner-foto" aria-live="polite"></div>

        ${mensagem ? `<div class="mensagem-operacao mensagem-operacao--erro">${escaparHtml(mensagem)}</div>` : ""}

        <div class="separador-scanner"><span>OU</span></div>

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
            PROCURAR NA MINHA CARGA
          </button>
        </details>

        <div class="nota-operacao">
          <strong>Importante</strong>
          <span>
            A foto desta tela serve apenas para localizar o pacote. A foto de
            comprovante/etiqueta da entrega continua sendo registrada na etapa
            de evidencias.
          </span>
        </div>
      </section>
    </main>

    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-entregador" class="botao-acao botao-acao--secundario">VOLTAR</button>
    </footer>
  `;
}

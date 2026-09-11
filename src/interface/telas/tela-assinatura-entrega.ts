import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";

export function telaAssinaturaEntrega(pacote: PacoteDaCarga): string {
  const registrada = Boolean(obterEstadoEntrega(pacote).assinatura);
  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      "Assinatura",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ETAPA 3</span>
        <h1>Assinatura</h1>
        <p>Registre somente quando a operacao exigir. Ela permanece protegida no aparelho ate a sincronizacao.</p>
      </section>

      <section class="painel-assinatura" data-registrada="${registrada}">
        <canvas id="canvas-assinatura" class="canvas-assinatura" width="900" height="360" aria-label="Area para assinatura"></canvas>
        <p id="status-assinatura" class="texto-apoio" role="status">
          ${registrada ? "Assinatura ja registrada. Desenhe novamente apenas se quiser substituir." : "Assine com o dedo dentro da area."}
        </p>
        <div class="acoes-assinatura">
          <button id="limpar-assinatura" class="botao-acao botao-acao--secundario">LIMPAR</button>
          <button id="salvar-assinatura" class="botao-acao botao-acao--sucesso" disabled>SALVAR ASSINATURA</button>
        </div>
        ${registrada ? `<button id="remover-assinatura" class="acao-texto acao-texto--perigo">REMOVER ASSINATURA REGISTRADA</button>` : ""}
      </section>
    </main>

    <footer class="acoes-fixas">
      <button id="voltar-recebedor" class="botao-acao botao-acao--secundario">VOLTAR</button>
      <button id="ir-finalizar" class="botao-acao botao-acao--primario">${registrada ? "PROXIMO" : "CONTINUAR SEM ASSINATURA"}</button>
    </footer>
  `;
}

import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";

export function telaOpcoesEntrega(pacote: PacoteDaCarga) {
  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      "Interromper operacao",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ESCOLHA SEGURA</span>
        <h1>O que deseja fazer?</h1>
        <p>Pausar preserva fotos e dados. Cancelar apaga a preparacao e devolve o pacote para pendente.</p>
      </section>

      <div class="acoes-empilhadas">
        <button id="pausar-entrega" class="botao-acao botao-acao--primario">CONTINUAR DEPOIS</button>
        <button id="cancelar-preparacao" class="botao-acao botao-acao--perigo">CANCELAR PREPARACAO</button>
        <button id="voltar-operacao" class="botao-acao botao-acao--secundario">VOLTAR PARA ENTREGA</button>
      </div>
    </main>
  `;
}

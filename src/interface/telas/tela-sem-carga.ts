import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaSemCarga(usuario: UsuarioAtual, operacoesHoje = 0) {
  return `
    ${cabecalhoFixo(escaparHtml(usuario.nome), "Minha carga", false, { id: "voltar-inicio", rotulo: "INÍCIO" })}
    <main class="conteudo conteudo--centro conteudo--com-rodape">
      <section class="estado-vazio estado-vazio--grande">
        <strong>Scanner universal disponivel</strong>
        <span>Nenhuma carga foi distribuida, mas voce pode reconhecer e encaminhar etiquetas normalmente.</span>
        <b>${operacoesHoje} ${operacoesHoje === 1 ? "etiqueta processada hoje" : "etiquetas processadas hoje"}</b>
      </section>
    </main>
    <footer class="acoes-fixas">
      <button id="sair" class="botao-acao botao-acao--secundario">SAIR</button>
      <button id="abrir-scanner-livre" class="botao-acao botao-acao--primario">ESCANEAR ETIQUETA</button>
    </footer>
  `;
}

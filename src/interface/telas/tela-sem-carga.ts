import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaSemCarga(usuario: UsuarioAtual) {
  return `
    ${cabecalhoFixo(escaparHtml(usuario.nome), "Minha carga")}
    <main class="conteudo conteudo--centro conteudo--com-rodape">
      <section class="estado-vazio estado-vazio--grande">
        <strong>Nenhuma carga disponivel</strong>
        <span>Seu perfil esta identificado como ${escaparHtml(usuario.entregadorId ?? "SEM VINCULO")}. A base ainda nao distribuiu uma carga para este perfil.</span>
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica"><button id="sair" class="botao-acao botao-acao--secundario">SAIR</button></footer>
  `;
}

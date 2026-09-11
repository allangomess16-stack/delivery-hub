import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaPerfilSemVinculo(usuario: UsuarioAtual) {
  return `
    ${cabecalhoFixo("Delivery Hub", "Perfil sem vinculo")}
    <main class="conteudo conteudo--centro conteudo--com-rodape">
      <section class="estado-vazio estado-vazio--grande">
        <strong>${escaparHtml(usuario.nome)}</strong>
        <span>Este login ainda nao possui entregadorId. A operacao foi bloqueada para evitar acesso incorreto a cargas.</span>
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica"><button id="sair" class="botao-acao botao-acao--secundario">SAIR</button></footer>
  `;
}

import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { ContaAcessoEntregador } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaAdminDistribuicao(
  cargas: CargaEntregador[],
  contas: Map<string, ContaAcessoEntregador>,
) {
  const total = cargas.reduce((soma, carga) => soma + carga.pacotes.length, 0);
  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Cargas distribuidas")}
    <main class="conteudo conteudo--com-rodape">
      <section class="resultado-entrega resultado-entrega--ok resultado-entrega--compacto">
        <span class="resultado-entrega__icone">✓</span>
        <h1>Distribuicao concluida</h1>
        <p>${total} pacotes separados em ${cargas.length} perfis com conta de acesso valida.</p>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">CARGAS</span><h2>Perfis</h2></div><span>${cargas.length}</span></div>
        <div class="lista-entregadores">
          ${cargas.map((carga) => {
            const conta = contas.get(carga.entregadorId);
            return `
              <article class="entregador-card entregador-card--estatico">
                <div>
                  <strong>${escaparHtml(carga.nomeEntregador)}</strong>
                  <span>${escaparHtml(conta?.email ?? carga.entregadorId)}</span>
                </div>
                <b>${carga.pacotes.length}</b>
              </article>`;
          }).join("")}
        </div>
      </section>

      <div class="nota-operacao">
        <strong>Pronto para o celular</strong>
        <span>Cada entregador deve abrir este mesmo servidor e entrar com o email cadastrado no seu perfil. O entregadorId do login direciona automaticamente para a carga correta.</span>
      </div>
    </main>
    <footer class="acoes-fixas">
      <button id="sair" class="botao-acao botao-acao--secundario">SAIR</button>
      <button id="nova-importacao-admin" class="botao-acao botao-acao--primario">NOVA IMPORTACAO</button>
    </footer>
  `;
}

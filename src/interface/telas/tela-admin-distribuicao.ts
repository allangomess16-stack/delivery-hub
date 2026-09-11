import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { ContaAcessoEntregador } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";
import { obterReferenciaLote } from "../../aplicacao/carga/referencias-carga";

export function telaAdminDistribuicao(
  cargas: CargaEntregador[],
  contas: Map<string, ContaAcessoEntregador>,
) {
  const total = cargas.reduce((soma, carga) => soma + carga.pacotes.length, 0);
  const referenciaLote = cargas[0] ? obterReferenciaLote(cargas[0]) : "LOTE";
  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Cargas distribuidas")}
    <main class="conteudo conteudo--com-rodape">
      <section class="resultado-entrega resultado-entrega--ok resultado-entrega--compacto">
        <span class="resultado-entrega__icone">✓</span>
        <span class="sobrelinha">${escaparHtml(referenciaLote)}</span>
        <h1>Distribuicao concluida</h1>
        <p>${total} pacotes • ${cargas.length} entregadores</p>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">${escaparHtml(referenciaLote)}</span><h2>Distribuicao deste lote</h2></div><span>${cargas.length}</span></div>
        <div class="lista-entregadores">
          ${cargas.map((carga, indice) => {
            const conta = contas.get(carga.entregadorId);
            return `
              <article class="entregador-card entregador-card--estatico">
                <div>
                  <small>DESTINO ${String(indice + 1).padStart(2, "0")}</small>
                  <strong>${escaparHtml(carga.nomeEntregador)}</strong>
                  <span>${escaparHtml(conta?.email ?? carga.entregadorId)}</span>
                </div>
                <b>${carga.pacotes.length}</b>
              </article>`;
          }).join("")}
        </div>
      </section>

    </main>
    <footer class="acoes-fixas">
      <button id="sair" class="botao-acao botao-acao--secundario">SAIR</button>
      <button id="nova-importacao-admin" class="botao-acao botao-acao--primario">NOVA IMPORTACAO</button>
    </footer>
  `;
}

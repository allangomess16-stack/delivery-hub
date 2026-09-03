import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import { resumirOperacaoEntregador } from "../../aplicacao/resumir-operacao-entregador";
import type { CargaEntregador } from "../../dominio/carga/tipos";
import { resumirCargaPorRegiao } from "../../aplicacao/regiao/resumir-carga-por-regiao";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

function seloEstado(estado: string): { texto: string; classe: string } {
  if (estado === "ENTREGUE") return { texto: "ENTREGUE", classe: "selo--ok" };
  if (estado === "NAO_ENTREGUE") return { texto: "NAO ENTREGUE", classe: "selo--atencao" };
  if (estado === "PENDENTE") return { texto: "PENDENTE", classe: "" };
  return { texto: "EM ANDAMENTO", classe: "selo--atencao" };
}

export function telaEntregador(carga: CargaEntregador) {
  const pacotes = carga.pacotes;
  const operacao = resumirOperacaoEntregador(pacotes);
  const regioes = resumirCargaPorRegiao(pacotes);

  return `
    ${cabecalhoFixo(carga.nomeEntregador, "Minha carga")}
    <main class="conteudo conteudo--com-rodape">
      <section class="identidade-carga"><span>${escaparHtml(carga.entregadorId)}</span><b>${escaparHtml(carga.dataOperacao)}</b></section>

      <section class="resumo-principal resumo-principal--compacto">
        <span class="sobrelinha">RESTANTES</span>
        <strong class="numero-grande">${operacao.pendentes + operacao.emAndamento}</strong>
        <span class="legenda-numero">${operacao.entregues} ENTREGUES • ${operacao.naoEntregues} NAO ENTREGUES</span>
      </section>

      <section class="grade-kpis grade-kpis--operacao">
        <article class="kpi kpi--jnt"><span>Pendentes</span><strong>${operacao.pendentes}</strong></article>
        <article class="kpi kpi--imile"><span>Entregues</span><strong>${operacao.entregues}</strong></article>
        <article class="kpi kpi--anjun"><span>Em andamento</span><strong>${operacao.emAndamento}</strong></article>
        <article class="kpi kpi--outra"><span>Nao entregues</span><strong>${operacao.naoEntregues}</strong></article>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">ORGANIZACAO DA ROTA</span><h2>Por regiao</h2></div><span>${regioes.length}</span></div>
        <div class="grade-regioes-entregador">
          ${regioes.map((regiao) => `
            <button class="regiao-entregador-card ${regiao.regiaoId === "SEM-REGIAO" ? "regiao-entregador-card--sem-regiao" : ""}" data-abrir-regiao="${escaparHtml(regiao.regiaoId)}">
              <span>${escaparHtml(regiao.nome)}</span>
              <strong>${regiao.restantes}</strong>
              <small>restantes • ${regiao.total} total</small>
            </button>`).join("")}
        </div>
        <button id="atualizar-carga" class="acao-texto acao-texto--primaria">ATUALIZAR CARGA</button>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">ULTIMOS / EM ANDAMENTO</span><h2>Pacotes</h2></div><span>${pacotes.length}</span></div>
        <div class="lista-pacotes">
          ${pacotes.filter((pacote) => obterEstadoEntrega(pacote).estadoFisico !== "PENDENTE").slice(-12).reverse().map((pacote) => {
            const estado = seloEstado(obterEstadoEntrega(pacote).estadoFisico);
            return `<button class="pacote-linha pacote-linha--botao" data-abrir-pacote="${pacote.id}"><div><strong>${escaparHtml(pacote.codigoNormalizado)}</strong><span>${escaparHtml(pacote.transportadora.nome)}</span></div><i class="selo ${estado.classe}">${estado.texto}</i></button>`;
          }).join("") || `<div class="estado-vazio estado-vazio--compacto"><strong>Nenhuma entrega iniciada</strong><span>Use o scanner para comecar.</span></div>`}
        </div>
      </section>
    </main>
    <footer class="acoes-fixas"><button id="sair" class="botao-acao botao-acao--secundario">SAIR</button><button id="abrir-scanner" class="botao-acao botao-acao--primario">ESCANEAR PACOTE</button></footer>
  `;
}

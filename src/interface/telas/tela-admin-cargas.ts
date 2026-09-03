import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export interface CargaAdminResumo {
  carga: CargaEntregador;
  perfil: PerfilEntregador;
}

function statusCarga(carga: CargaEntregador): string {
  return carga.status ?? "PUBLICADA";
}

export function telaAdminCargas(
  itens: CargaAdminResumo[],
) {
  const totalPacotes = itens.reduce((soma, item) => soma + item.carga.pacotes.length, 0);

  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Gestao de cargas")}
    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">OPERACAO</span>
        <h1>Gestao de cargas</h1>
        <p>O Excel continua sendo a entrada em massa. Aqui voce pode criar, corrigir, adicionar e transferir encomendas manualmente.</p>
      </section>

      <section class="grade-kpis grade-kpis--operacao">
        <article class="kpi kpi--jnt"><span>Cargas</span><strong>${itens.length}</strong></article>
        <article class="kpi kpi--imile"><span>Pacotes</span><strong>${totalPacotes}</strong></article>
      </section>

      <div class="acoes-empilhadas">
        <button id="nova-carga-manual" class="botao-acao botao-acao--primario">NOVA CARGA MANUAL</button>
      </div>

      <label class="campo-grande">
        <span>BUSCAR TRACKING</span>
        <input id="buscar-pacote-admin" placeholder="Digite parte do codigo" autocomplete="off" />
      </label>

      <section class="secao-lista">
        <div class="titulo-secao">
          <div><span class="sobrelinha">CARGAS EXISTENTES</span><h2>Entregadores</h2></div>
          <span>${itens.length}</span>
        </div>

        <div class="lista-cargas-admin" id="lista-cargas-admin">
          ${itens.length ? itens.map(({ carga, perfil }) => `
            <article
              class="carga-admin-card"
              data-carga-busca="${escaparHtml(
                `${perfil.nomeOficial} ${perfil.entregadorId} ${carga.pacotes.map((p) => p.codigoNormalizado).join(" ")}`
              )}"
            >
              <div class="carga-admin-card__topo">
                <div>
                  <span class="sobrelinha">${escaparHtml(statusCarga(carga))}</span>
                  <strong>${escaparHtml(perfil.nomeOficial)}</strong>
                  <small>${escaparHtml(carga.dataOperacao)} • ${escaparHtml(carga.nomeArquivoOrigem)}</small>
                </div>
                <b>${carga.pacotes.length}<small>pacotes</small></b>
              </div>

              <div class="carga-admin-card__acoes">
                <button class="botao-mini botao-mini--primario" data-abrir-carga="${escaparHtml(carga.cargaId)}" data-entregador="${escaparHtml(carga.entregadorId)}">ABRIR</button>
              </div>
            </article>
          `).join("") : `
            <div class="estado-vazio estado-vazio--grande">
              <strong>Nenhuma carga criada</strong>
              <span>Importe um Excel ou crie uma carga manual.</span>
            </div>
          `}
        </div>
      </section>

      <div class="nota-operacao">
        <strong>Associacao nao e transferencia</strong>
        <span>
          Associar uma coluna do Excel define a quem aquele nome pertence normalmente.
          Para um entregador assumir encomendas de outro, use TRANSFERIR dentro da carga.
        </span>
      </div>
    </main>

    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-admin-cargas" class="botao-acao botao-acao--secundario">VOLTAR</button>
    </footer>
  `;
}

export function telaNovaCargaManual(perfis: PerfilEntregador[], dataHoje: string) {
  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Nova carga manual")}
    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">CRIACAO MANUAL</span>
        <h1>Nova carga</h1>
        <p>Use para excecoes, encomendas que chegaram depois do Excel ou uma operacao sem planilha.</p>
      </section>

      <form id="form-nova-carga" class="form-perfil-admin">
        <label class="campo-grande">
          <span>ENTREGADOR</span>
          <select id="nova-carga-entregador" class="select-grande" required>
            <option value="">Selecione...</option>
            ${perfis.filter((p) => p.ativo).map((perfil) => `
              <option value="${escaparHtml(perfil.entregadorId)}">${escaparHtml(perfil.nomeOficial)}</option>
            `).join("")}
          </select>
        </label>

        <label class="campo-grande">
          <span>DATA DA OPERACAO</span>
          <input id="nova-carga-data" type="date" value="${escaparHtml(dataHoje)}" required />
        </label>

        <div class="nota-operacao">
          <strong>Rascunho</strong>
          <span>A carga so aparece para o entregador depois que voce adicionar pacotes e tocar em PUBLICAR.</span>
        </div>
      </form>
    </main>

    <footer class="acoes-fixas">
      <button id="cancelar-nova-carga" class="botao-acao botao-acao--secundario">CANCELAR</button>
      <button id="salvar-nova-carga" class="botao-acao botao-acao--primario">CRIAR CARGA</button>
    </footer>
  `;
}

import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";
import {
  listarOrigensLote,
  obterReferenciaCarga,
  obterReferenciaLote,
} from "../../aplicacao/carga/referencias-carga";
import { listarAlertasExtraRota } from "../../aplicacao/carga/listar-alertas-extra-rota";

export interface CargaAdminResumo {
  carga: CargaEntregador;
  perfil: PerfilEntregador;
}

function statusCarga(carga: CargaEntregador): string {
  return carga.status ?? "PUBLICADA";
}

function categoriaStatus(carga: CargaEntregador): "ATIVA" | "ARQUIVADA" | "EXCLUIDA" {
  if (carga.motivoEncerramento === "EXCLUIDA_TESTE") return "EXCLUIDA";
  return statusCarga(carga) === "ENCERRADA" ? "ARQUIVADA" : "ATIVA";
}

function textoStatus(carga: CargaEntregador): string {
  const categoria = categoriaStatus(carga);
  if (categoria === "EXCLUIDA") return "REMOVIDA DA OPERACAO";
  if (categoria === "ARQUIVADA") return "ARQUIVADA";
  return statusCarga(carga).replace("_", " ");
}

function formatarCriacao(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export function telaAdminCargas(
  itens: CargaAdminResumo[],
) {
  const ativos = itens.filter((item) => categoriaStatus(item.carga) === "ATIVA");
  const totalPacotes = ativos.reduce((soma, item) => soma + item.carga.pacotes.length, 0);
  const alertasExtraRota = listarAlertasExtraRota(itens.map(({ carga, perfil }) => ({
    carga,
    nomeEntregador: perfil.nomeOficial,
  })));

  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Gestao de cargas")}
    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">OPERACAO</span>
        <h1>Gestao de cargas</h1>
      </section>

      <section class="grade-kpis grade-kpis--operacao">
        <article class="kpi kpi--jnt"><span>Cargas ativas</span><strong>${ativos.length}</strong></article>
        <article class="kpi kpi--imile"><span>Pacotes ativos</span><strong>${totalPacotes}</strong></article>
        <article class="kpi ${alertasExtraRota.length ? "kpi--erro" : ""}"><span>Extra rota</span><strong>${alertasExtraRota.length}</strong></article>
      </section>

      ${alertasExtraRota.length ? `
        <section class="alertas-extra-rota" aria-label="Alertas de extra rota">
          <div class="titulo-secao"><div><span class="sobrelinha">ATENÇÃO ADMINISTRATIVA</span><h2>Pacotes fora da rota</h2></div><span>${alertasExtraRota.length}</span></div>
          <p>Estes alertas permanecem visíveis até uma resolução manual. Nenhum deles representa baixa oficial na transportadora.</p>
          <div class="lista-pacotes">
            ${alertasExtraRota.slice(0, 8).map(({ cargaExecutora, executor, pacote, atribuidoSugerido, trocaMutuaSugeridaCom }) => `
              <button class="alerta-extra-rota-card" data-abrir-alerta-extra="${escaparHtml(pacote.codigoNormalizado)}" data-entregador-alerta="${escaparHtml(cargaExecutora.entregadorId)}" data-carga-alerta="${escaparHtml(cargaExecutora.cargaId)}">
                <span>EXTRA ROTA · EXECUTADO POR ${escaparHtml(executor).toUpperCase()}</span>
                <strong>${escaparHtml(pacote.codigoNormalizado)}</strong>
                <small>${escaparHtml(obterReferenciaCarga(cargaExecutora))} · ${atribuidoSugerido ? `possível atribuído: ${escaparHtml(atribuidoSugerido)}` : "sem atribuição encontrada"}${trocaMutuaSugeridaCom ? " · possível troca mútua" : ""}</small>
              </button>`).join("")}
          </div>
        </section>
      ` : ""}

      <div class="acoes-empilhadas">
        <button id="nova-carga-manual" class="botao-acao botao-acao--primario">NOVA CARGA MANUAL</button>
        <label class="botao-acao botao-acao--sucesso">
          LER FOTO DA ETIQUETA
          <input id="foto-scanner-admin" class="arquivo-escondido" type="file" accept="image/*" capture="environment" />
        </label>
      </div>

      <label class="campo-grande">
        <span>BUSCAR TRACKING</span>
        <input id="buscar-pacote-admin" placeholder="Digite parte do codigo" autocomplete="off" />
      </label>
      <button id="localizar-pacote-admin" class="botao-mini botao-mini--primario">LOCALIZAR E ABRIR</button>
      <p id="status-scanner-admin" class="texto-apoio" aria-live="polite"></p>

      <label class="campo-grande">
        <span>EXIBIR</span>
        <select id="filtro-status-cargas" class="select-grande">
          <option value="ATIVA">Cargas ativas</option>
          <option value="ARQUIVADA">Cargas arquivadas</option>
          <option value="TODAS">Todas as cargas</option>
        </select>
      </label>

      <section class="secao-lista">
        <div class="titulo-secao">
          <div><span class="sobrelinha">CONTROLE OPERACIONAL</span><h2>Cargas identificadas</h2></div>
          <span id="total-cargas-filtradas">${ativos.length}</span>
        </div>

        <div class="lista-cargas-admin" id="lista-cargas-admin">
          ${itens.length ? itens.map(({ carga, perfil }) => {
            const origens = listarOrigensLote(carga);
            return `
            <article
              class="carga-admin-card"
              data-carga-status="${categoriaStatus(carga)}"
              data-carga-busca="${escaparHtml(
                `${obterReferenciaCarga(carga)} ${obterReferenciaLote(carga)} ${origens.map((origem) => origem.referencia).join(" ")} ${perfil.nomeOficial} ${perfil.entregadorId} ${carga.nomeArquivoOrigem} ${carga.pacotes.map((p) => p.codigoNormalizado).join(" ")}`
              )}"
            >
              <div class="carga-admin-card__topo">
                <div>
                  <span class="sobrelinha">${escaparHtml(textoStatus(carga))}</span>
                  <strong class="carga-admin-card__referencia">${escaparHtml(obterReferenciaCarga(carga))}</strong>
                  <strong>${escaparHtml(perfil.nomeOficial)}</strong>
                  <small>${escaparHtml(formatarCriacao(carga.criadaEm))} • operacao ${escaparHtml(carga.dataOperacao)}</small>
                </div>
                <b>${carga.pacotes.length}<small>pacotes</small></b>
              </div>

              <div class="carga-admin-card__origens">
                ${origens.map((origem) => `
                  <span title="${escaparHtml(origem.nomeArquivo)}">
                    ${escaparHtml(origem.referencia)} · ${origem.quantidadePacotes}
                  </span>
                `).join("")}
              </div>

              <div class="carga-admin-card__acoes">
                <button class="botao-mini botao-mini--primario" data-abrir-carga="${escaparHtml(carga.cargaId)}" data-entregador="${escaparHtml(carga.entregadorId)}">ABRIR</button>
              </div>
            </article>
          `; }).join("") : `
            <div class="estado-vazio estado-vazio--grande">
              <strong>Nenhuma carga criada</strong>
            </div>
          `}
          <div id="nenhuma-carga-filtro" class="estado-vazio estado-vazio--grande" hidden>
            <strong>Nenhuma carga neste filtro</strong>
          </div>
        </div>
      </section>
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

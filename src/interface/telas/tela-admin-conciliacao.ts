import type { CargaImportada } from "../../dominio/carga/tipos";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import type { ResultadoConciliacaoPerfis } from "../../aplicacao/identidade/conciliar-perfis-planilha";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";
import { descreverDuplicidade, detectarDuplicados } from "../../aplicacao/detectar-duplicados";

function contar(carga: CargaImportada, coluna: string): number {
  return carga.pacotes.filter((pacote) => pacote.entregador === coluna).length;
}

function opcoesPerfis(perfis: PerfilEntregador[], selecionadoIds: string[] = []): string {
  return perfis
    .filter((perfil) => perfil.ativo)
    .map((perfil) => `<option value="${escaparHtml(perfil.entregadorId)}" ${selecionadoIds.includes(perfil.entregadorId) ? "selected" : ""}>${escaparHtml(perfil.nomeOficial)}</option>`)
    .join("");
}

export function telaAdminConciliacao(
  carga: CargaImportada,
  resultado: ResultadoConciliacaoPerfis,
  perfis: PerfilEntregador[],
  entregadoresComAcessoAtivo: Set<string>,
) {
  const semAcesso = [...new Set(resultado.encontrados.filter((item) => !entregadoresComAcessoAtivo.has(item.entregadorId)).map((item) => item.entregadorId))];
  const duplicados = detectarDuplicados(carga.pacotes);
  const ignoradas = carga.colunasIgnoradas ?? [];
  const pendencias = resultado.desconhecidos.length + resultado.conflitos.length + resultado.inativos.length;
  const podeDistribuir = resultado.podeDistribuir && semAcesso.length === 0 && duplicados.length === 0;
  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Conciliar perfis")}
    <main class="conteudo conteudo--com-rodape">
      <section class="resumo-principal resumo-principal--compacto">
        <span class="sobrelinha">${escaparHtml(carga.nomeArquivo)}</span>
        <strong class="numero-grande">${carga.pacotes.length}</strong>
        <span class="legenda-numero">PACOTES • ${carga.entregadores.length} COLUNAS</span>
      </section>

      <section class="alertas">
        <article class="alerta-card"><span>Encontrados</span><strong>${resultado.encontrados.length}</strong></article>
        <article class="alerta-card ${pendencias ? "alerta-card--atencao" : ""}"><span>Perfis</span><strong>${pendencias}</strong></article>
        <article class="alerta-card ${semAcesso.length ? "alerta-card--atencao" : ""}"><span>Sem acesso</span><strong>${semAcesso.length}</strong></article>
        <article class="alerta-card ${duplicados.length ? "alerta-card--atencao" : ""}"><span>Duplicados</span><strong>${duplicados.length}</strong></article>
      </section>

      ${ignoradas.length ? `<div class="nota-operacao"><strong>${ignoradas.length} coluna(s) ignorada(s)</strong><span>${escaparHtml(ignoradas.map((item) => `${item.cabecalho} (${item.quantidadeDescartada} valores)`).join(" • "))}</span></div>` : ""}

      ${duplicados.length ? `
        <section class="secao-lista">
          <div class="titulo-secao"><div><span class="sobrelinha">IMPORTACAO BLOQUEADA</span><h2>Trackings duplicados</h2></div><span>${duplicados.length}</span></div>
          <div class="lista-conciliacao">
            ${duplicados.map((item) => `
              <article class="conciliacao-item conciliacao-item--erro">
                <div class="conciliacao-item__conteudo">
                  <strong>${escaparHtml(item.codigo)}</strong>
                  <small>${escaparHtml(descreverDuplicidade(item).replace(`Tracking ${item.codigo}: `, ""))}</small>
                </div>
              </article>`).join("")}
          </div>
        </section>` : ""}

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">CONCILIACAO</span><h2>Colunas do Excel</h2></div><span>${carga.entregadores.length}</span></div>
        <div class="lista-conciliacao">
          ${resultado.encontrados.map((item) => {
            const acessoOk = entregadoresComAcessoAtivo.has(item.entregadorId);
            return `
              <article class="conciliacao-item ${acessoOk ? "conciliacao-item--ok" : "conciliacao-item--atencao"}">
                <div class="conciliacao-item__conteudo">
                  <span class="sobrelinha">${acessoOk ? "ENCONTRADO" : "PERFIL SEM ACESSO"}</span>
                  <strong>${escaparHtml(item.colunaExcel)}</strong>
                  <small>→ ${escaparHtml(item.perfil.nomeOficial)}</small>
                  <button class="botao-mini" data-ignorar-coluna="${escaparHtml(item.colunaExcel)}">IGNORAR COLUNA</button>
                  ${acessoOk ? "" : `<button class="botao-mini botao-mini--primario" data-editar-acesso="${escaparHtml(item.entregadorId)}">CADASTRAR ACESSO</button>`}
                </div>
                <b>${contar(carga, item.colunaExcel)}</b>
              </article>`;
          }).join("")}

          ${resultado.desconhecidos.map((item) => `
            <article class="conciliacao-item conciliacao-item--atencao">
              <div class="conciliacao-item__conteudo">
                <span class="sobrelinha">PERFIL NAO ENCONTRADO</span>
                <strong>${escaparHtml(item.colunaExcel)}</strong>
                <small>${contar(carga, item.colunaExcel)} pacotes</small>
                <div class="conciliacao-acoes">
                  <select data-selecionar-perfil="${escaparHtml(item.colunaExcel)}"><option value="">Associar coluna a perfil existente...</option>${opcoesPerfis(perfis)}</select>
                  <button class="botao-mini" data-vincular-coluna="${escaparHtml(item.colunaExcel)}">ASSOCIAR</button>
                  <button class="botao-mini botao-mini--primario" data-criar-perfil="${escaparHtml(item.colunaExcel)}">CRIAR PERFIL</button>
                  <button class="botao-mini" data-ignorar-coluna="${escaparHtml(item.colunaExcel)}">IGNORAR COLUNA</button>
                </div>
              </div>
            </article>
          `).join("")}

          ${resultado.conflitos.map((item) => `
            <article class="conciliacao-item conciliacao-item--erro">
              <div class="conciliacao-item__conteudo">
                <span class="sobrelinha">CONFLITO DE ASSOCIACAO</span>
                <strong>${escaparHtml(item.colunaExcel)}</strong>
                <small>O mesmo nome do Excel esta associado a mais de um perfil. Escolha o correto.</small>
                <div class="conciliacao-acoes">
                  <select data-selecionar-perfil="${escaparHtml(item.colunaExcel)}">${opcoesPerfis(item.perfis)}</select>
                  <button class="botao-mini" data-resolver-conflito="${escaparHtml(item.colunaExcel)}">USAR PERFIL</button>
                  <button class="botao-mini" data-ignorar-coluna="${escaparHtml(item.colunaExcel)}">IGNORAR COLUNA</button>
                </div>
              </div>
            </article>
          `).join("")}

          ${resultado.inativos.map((item) => `
            <article class="conciliacao-item conciliacao-item--atencao">
              <div class="conciliacao-item__conteudo">
                <span class="sobrelinha">PERFIL INATIVO</span>
                <strong>${escaparHtml(item.colunaExcel)}</strong>
                <small>${escaparHtml(item.perfil.nomeOficial)}</small>
                <button class="botao-mini botao-mini--primario" data-reativar-perfil="${escaparHtml(item.perfil.entregadorId)}">REATIVAR PERFIL</button>
                <button class="botao-mini" data-ignorar-coluna="${escaparHtml(item.colunaExcel)}">IGNORAR COLUNA</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    </main>
    <footer class="acoes-fixas">
      <button id="cancelar-importacao" class="botao-acao botao-acao--secundario">VOLTAR</button>
      <button id="distribuir-cargas" class="botao-acao botao-acao--sucesso" ${podeDistribuir ? "" : "disabled"}>DISTRIBUIR CARGAS</button>
    </footer>
  `;
}

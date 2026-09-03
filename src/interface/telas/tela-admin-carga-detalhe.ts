import { REGIOES_DF } from "../../configuracao/regioes-df";
import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import { idRegiaoPacote, resumirCargaPorRegiao } from "../../aplicacao/regiao/resumir-carga-por-regiao";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

function nomeOrigem(pacote: PacoteDaCarga): string {
  if (pacote.origem === "MANUAL") return "MANUAL";
  if (pacote.origem === "TRANSFERENCIA") return "TRANSFERIDO";
  return "EXCEL";
}

function podeAlterar(pacote: PacoteDaCarga): boolean {
  return obterEstadoEntrega(pacote).estadoFisico === "PENDENTE";
}

export function telaAdminCargaDetalhe(carga: CargaEntregador, perfis: PerfilEntregador[]) {
  const status = carga.status ?? "PUBLICADA";
  const regioes = resumirCargaPorRegiao(carga.pacotes);
  const destinos = perfis.filter((perfil) => perfil.ativo && perfil.entregadorId !== carga.entregadorId);

  return `
    ${cabecalhoFixo("Delivery Hub • Admin", carga.nomeEntregador)}
    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">${escaparHtml(status)}</span>
        <h1>${carga.pacotes.length} pacotes</h1>
        <p>${escaparHtml(carga.dataOperacao)} • ${escaparHtml(carga.nomeArquivoOrigem)}</p>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">DISTRIBUICAO</span><h2>Por regiao</h2></div><span>${regioes.length}</span></div>
        <div class="grade-regioes-admin">
          ${regioes.map((regiao) => `
            <button class="regiao-admin-card ${regiao.regiaoId === "SEM-REGIAO" ? "regiao-admin-card--sem-regiao" : ""}" data-filtrar-regiao-card="${escaparHtml(regiao.regiaoId)}">
              <span>${escaparHtml(regiao.nome)}</span>
              <strong>${regiao.pendentes}</strong>
              <small>pendentes • ${regiao.total} total</small>
            </button>`).join("")}
        </div>
      </section>

      ${status !== "ENCERRADA" ? `
        <section class="painel-carga-manual">
          <span class="sobrelinha">ADICIONAR ENCOMENDA</span>
          <div class="linha-adicionar-pacote linha-adicionar-pacote--endereco">
            <input id="codigo-pacote-manual" placeholder="Tracking / codigo" autocomplete="off" />
            <input id="endereco-pacote-manual" placeholder="Endereco (opcional)" autocomplete="off" />
            <button id="adicionar-pacote-manual" class="botao-mini botao-mini--primario">ADICIONAR</button>
          </div>

          <label class="botao-importar-endereco">
            <input id="arquivo-enderecos" class="arquivo-escondido" type="file" accept=".xlsx,.xls" />
            IMPORTAR ENDERECOS (XLSX)
          </label>
          <small class="ajuda-inline">Planilha complementar: CODIGO/TRACKING + ENDERECO; REGIAO e opcional.</small>
        </section>
      ` : ""}

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">ENCOMENDAS</span><h2>Lista da carga</h2></div><span>${carga.pacotes.length}</span></div>

        <div class="filtros-carga-regiao">
          <label class="campo-grande campo-grande--sem-margem">
            <span>FILTRAR CODIGO</span>
            <input id="filtro-pacotes-carga" placeholder="Pesquisar tracking" autocomplete="off" />
          </label>
          <label class="campo-grande campo-grande--sem-margem">
            <span>REGIAO</span>
            <select id="filtro-regiao-carga" class="select-grande">
              <option value="TODAS">Todas as regioes</option>
              ${regioes.map((regiao) => `<option value="${escaparHtml(regiao.regiaoId)}">${escaparHtml(regiao.nome)} (${regiao.total})</option>`).join("")}
            </select>
          </label>
        </div>

        ${status !== "ENCERRADA" ? `
          <section class="painel-selecao-lote">
            <div class="painel-selecao-lote__topo">
              <div><span class="sobrelinha">AJUSTE EM LOTE</span><strong><span id="quantidade-selecionados">0</span> selecionados</strong></div>
              <div class="acoes-mini-inline">
                <button id="selecionar-regiao-visivel" class="botao-mini">SELECIONAR REGIAO</button>
                <button id="limpar-selecao" class="botao-mini">LIMPAR</button>
              </div>
            </div>

            <div class="lote-regiao-controles">
              <select id="regiao-lote" class="select-mini">
                <option value="">Definir regiao...</option>
                ${REGIOES_DF.map((regiao) => `<option value="${regiao.id}">${escaparHtml(regiao.nome)}</option>`).join("")}
                <option value="OUTRA">Outra regiao...</option>
              </select>
              <input id="regiao-lote-personalizada" class="input-mini input-mini--oculto" placeholder="Nome da regiao" />
              <button id="aplicar-regiao-lote" class="botao-mini botao-mini--primario">APLICAR REGIAO</button>
            </div>

            <div class="lote-transferencia-controles">
              <select id="destino-transferencia-selecao" class="select-mini">
                <option value="">Transferir selecionados para...</option>
                ${destinos.map((perfil) => `<option value="${escaparHtml(perfil.entregadorId)}">${escaparHtml(perfil.nomeOficial)}</option>`).join("")}
              </select>
              <button id="transferir-selecionados" class="botao-mini botao-mini--atencao">TRANSFERIR SELECIONADOS</button>
            </div>
            <small class="ajuda-inline">Selecione a regiao inteira e, se quiser transferencia parcial, desmarque os pacotes que devem permanecer.</small>
          </section>
        ` : ""}

        <div class="lista-pacotes-admin" id="lista-pacotes-admin">
          ${carga.pacotes.length ? carga.pacotes.map((pacote) => {
            const estado = obterEstadoEntrega(pacote).estadoFisico;
            const alteravel = podeAlterar(pacote) && status !== "ENCERRADA";
            const regiaoId = idRegiaoPacote(pacote);
            const regiaoNome = pacote.regiaoEntrega?.nome ?? "Sem regiao";
            return `
              <article class="pacote-admin-card" data-pacote-codigo="${escaparHtml(pacote.codigoNormalizado)}" data-pacote-regiao="${escaparHtml(regiaoId)}">
                <div class="pacote-admin-card__topo">
                  ${alteravel ? `<label class="checkbox-pacote"><input type="checkbox" data-selecionar-pacote="${escaparHtml(pacote.id)}" /><span></span></label>` : ""}
                  <div class="pacote-admin-card__conteudo">
                    <strong>${escaparHtml(pacote.codigoNormalizado)}</strong>
                    <span>${escaparHtml(pacote.transportadora.nome)} • ${nomeOrigem(pacote)}</span>
                    <b class="regiao-pacote-label">${escaparHtml(regiaoNome)}</b>
                    ${pacote.enderecoEntrega?.texto ? `<small class="endereco-pacote-label">${escaparHtml(pacote.enderecoEntrega.texto)}</small>` : `<small class="endereco-pacote-label endereco-pacote-label--vazio">Endereco nao informado</small>`}
                  </div>
                  <i class="selo ${estado === "ENTREGUE" ? "selo--ok" : estado === "NAO_ENTREGUE" ? "selo--atencao" : ""}">${escaparHtml(estado)}</i>
                </div>

                <div class="pacote-admin-card__acoes pacote-admin-card__acoes--regiao">
                  <button class="botao-mini" data-editar-localizacao="${escaparHtml(pacote.id)}">ENDERECO / REGIAO</button>
                  ${alteravel ? `
                    <select data-destino-pacote="${escaparHtml(pacote.id)}" class="select-mini">
                      <option value="">Transferir para...</option>
                      ${destinos.map((perfil) => `<option value="${escaparHtml(perfil.entregadorId)}">${escaparHtml(perfil.nomeOficial)}</option>`).join("")}
                    </select>
                    <button class="botao-mini" data-transferir-pacote="${escaparHtml(pacote.id)}">TRANSFERIR</button>
                    <button class="botao-mini botao-mini--perigo" data-excluir-pacote="${escaparHtml(pacote.id)}">EXCLUIR</button>
                  ` : `<small class="pacote-admin-card__bloqueio">Em operacao/finalizado: transferencia bloqueada.</small>`}
                </div>
              </article>`;
          }).join("") : `<div class="estado-vazio"><strong>Carga vazia</strong><span>Adicione um pacote para continuar.</span></div>`}
        </div>
      </section>

      ${status !== "ENCERRADA" ? `
        <section class="painel-transferencia-total">
          <span class="sobrelinha">SUBSTITUICAO COMPLETA</span>
          <strong>Transferir todos os pendentes</strong>
          <p>Use somente quando outro entregador for assumir todo o restante da carga. Para transferir uma regiao, use o filtro e a selecao em lote acima.</p>
          <select id="destino-transferencia-total" class="select-grande">
            <option value="">Escolha o novo entregador...</option>
            ${destinos.map((perfil) => `<option value="${escaparHtml(perfil.entregadorId)}">${escaparHtml(perfil.nomeOficial)}</option>`).join("")}
          </select>
          <button id="transferir-pendentes" class="botao-acao botao-acao--atencao botao-largura-total">TRANSFERIR TODOS OS PENDENTES</button>
        </section>
      ` : ""}
    </main>

    <footer class="acoes-fixas">
      <button id="voltar-lista-cargas" class="botao-acao botao-acao--secundario">VOLTAR</button>
      ${status === "RASCUNHO"
        ? `<button id="publicar-carga" class="botao-acao botao-acao--sucesso">PUBLICAR CARGA</button>`
        : `<button id="encerrar-carga" class="botao-acao botao-acao--primario" ${status === "ENCERRADA" ? "disabled" : ""}>ENCERRAR</button>`}
    </footer>
  `;
}

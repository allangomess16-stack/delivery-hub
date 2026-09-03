import { REGIOES_DF } from "../../configuracao/regioes-df";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function conteudoAdminLocalizacaoPacote(pacote: PacoteDaCarga) {
  const regiaoAtual = pacote.regiaoEntrega;
  const regiaoConhecida = REGIOES_DF.some((regiao) => regiao.id === regiaoAtual?.regiaoId);
  const valorSelect = regiaoConhecida ? regiaoAtual?.regiaoId ?? "AUTO" : regiaoAtual ? "OUTRA" : "AUTO";

  return `
    <div class="bottom-sheet__identidade-pacote">
      <span class="sobrelinha">${escaparHtml(pacote.transportadora.nome)}</span>
      <strong>${escaparHtml(pacote.codigoNormalizado)}</strong>
      <small>Corrija somente quando necessario. A ordem da rota continua sendo definida pelo entregador.</small>
    </div>

    <label class="campo-grande">
      <span>ENDERECO DA ENTREGA</span>
      <textarea id="localizacao-endereco" class="textarea-grande" rows="4" placeholder="Ex.: QNM 12 Conjunto A, Ceilandia - DF">${escaparHtml(pacote.enderecoEntrega?.texto ?? "")}</textarea>
    </label>

    <label class="campo-grande">
      <span>REGIAO</span>
      <select id="localizacao-regiao" class="select-grande">
        <option value="AUTO" ${valorSelect === "AUTO" ? "selected" : ""}>Detectar pelo endereco</option>
        ${REGIOES_DF.map((regiao) => `<option value="${regiao.id}" ${valorSelect === regiao.id ? "selected" : ""}>${escaparHtml(regiao.nome)} • ${escaparHtml(regiao.ra)}</option>`).join("")}
        <option value="OUTRA" ${valorSelect === "OUTRA" ? "selected" : ""}>Outra regiao / Entorno</option>
      </select>
    </label>

    <label id="campo-regiao-personalizada" class="campo-grande ${valorSelect === "OUTRA" ? "" : "campo-grande--oculto"}">
      <span>NOME DA REGIAO</span>
      <input id="localizacao-regiao-personalizada" value="${valorSelect === "OUTRA" ? escaparHtml(regiaoAtual?.nome ?? "") : ""}" placeholder="Ex.: Valparaiso de Goias" autocomplete="off" />
    </label>`;
}

export function telaAdminLocalizacaoPacote(pacote: PacoteDaCarga) {
  return `
    ${cabecalhoFixo("Delivery Hub • Admin", "Endereco e regiao")}
    <main class="conteudo conteudo--com-rodape">
      ${conteudoAdminLocalizacaoPacote(pacote)}
      <div class="nota-operacao">
        <strong>Sem roteamento automatico</strong>
        <span>O Delivery Hub apenas agrupa e conta as encomendas. A ordem da rota continua sendo definida pelo entregador.</span>
      </div>
    </main>
    <footer class="acoes-fixas">
      <button id="cancelar-localizacao" class="botao-acao botao-acao--secundario">VOLTAR</button>
      <button id="salvar-localizacao" class="botao-acao botao-acao--primario">SALVAR</button>
    </footer>`;
}

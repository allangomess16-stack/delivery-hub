import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import type { TipoDocumentoImile, TipoRecebedorImile } from "../../dominio/entrega/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

const recebedores: Array<{ id: TipoRecebedorImile; nome: string }> = [
  { id: "PROPRIO", nome: "PRÓPRIO" },
  { id: "PORTARIA", nome: "PORTARIA" },
  { id: "OUTROS", nome: "OUTROS" },
  { id: "FUNCIONARIO", nome: "FUNCIONÁRIO(A)" },
  { id: "CONJUGE", nome: "CÔNJUGE" },
  { id: "ASSOCIACAO_BAIRRO", nome: "ASSOCIAÇÃO DE BAIRRO" },
  { id: "VIZINHO", nome: "VIZINHO" },
  { id: "PROPRIETARIO", nome: "PROPRIETÁRIO" },
  { id: "EMPREGADO", nome: "EMPREGADO" },
  { id: "FAMILIAR", nome: "FAMILIAR" },
];

const documentos: Array<{ id: TipoDocumentoImile; nome: string }> = [
  { id: "CPF", nome: "CPF" },
  { id: "RG", nome: "RG" },
  { id: "CNH", nome: "CNH" },
  { id: "PASSAPORTE", nome: "PASSAPORTE" },
  { id: "OUTRO", nome: "OUTRO" },
];

export function telaDadosComprovacaoImile(pacote: PacoteDaCarga): string {
  const dados = obterEstadoEntrega(pacote).dadosComprovacaoImile;

  return `
    ${cabecalhoFixo(`iMile • ...${pacote.codigoNormalizado.slice(-6)}`, "Dados para baixa")}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ETAPA 2 • IMILE</span>
        <h1>Quem recebeu?</h1>
        <p>Preencha agora os campos exigidos no aplicativo iMile. Eles ficam protegidos neste aparelho até a sincronização.</p>
      </section>

      <section class="grade-escolhas homologacao-recebedores" aria-label="Quem recebeu a encomenda">
        ${recebedores.map((opcao) => `
          <button class="botao-escolha" data-recebedor-imile="${opcao.id}" data-selecionado="${dados?.recebedor === opcao.id ? "true" : "false"}">
            ${opcao.nome}
          </button>
        `).join("")}
      </section>

      <section class="dados-recebedor-opcionais">
        <label class="campo-grande">
          <span>NOME COMPLETO *</span>
          <input id="imile-nome-completo" value="${escaparHtml(dados?.nomeCompleto ?? "")}" autocomplete="name" placeholder="Nome de quem recebeu" />
        </label>

        <label class="campo-grande">
          <span>TIPO DE DOCUMENTO *</span>
          <select id="imile-tipo-documento">
            ${documentos.map((opcao) => `<option value="${opcao.id}" ${dados?.tipoDocumento === opcao.id || (!dados && opcao.id === "CPF") ? "selected" : ""}>${opcao.nome}</option>`).join("")}
          </select>
        </label>

        <label class="campo-grande">
          <span>NÚMERO DO DOCUMENTO *</span>
          <input id="imile-numero-documento" value="${escaparHtml(dados?.numeroDocumento ?? "")}" autocomplete="off" placeholder="CPF ou documento informado" />
        </label>

        <label class="campo-grande">
          <span>NOTAS DE ENTREGA</span>
          <textarea id="imile-observacao" rows="3" maxlength="500" placeholder="Opcional">${escaparHtml(dados?.observacao ?? "")}</textarea>
        </label>
      </section>
    </main>

    <footer class="acoes-fixas">
      <button id="voltar-fotos" class="botao-acao botao-acao--secundario">VOLTAR</button>
      <button id="ir-assinatura-imile" class="botao-acao botao-acao--primario">PRÓXIMO</button>
    </footer>
  `;
}

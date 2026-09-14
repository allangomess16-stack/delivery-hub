import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import type { TipoRecebedor } from "../../dominio/entrega/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

const opcoes: Array<{ id: TipoRecebedor; nome: string }> = [
  { id: "PROPRIO", nome: "PROPRIO" },
  { id: "PORTARIA", nome: "PORTARIA" },
  { id: "FAMILIAR", nome: "FAMILIAR" },
  { id: "VIZINHO", nome: "VIZINHO" },
  { id: "OUTRO", nome: "OUTRO" },
];

export function telaRecebedor(pacote: PacoteDaCarga) {
  const entrega = obterEstadoEntrega(pacote);
  const selecionado = entrega.recebedor?.tipo;

  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      "Quem recebeu?",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ETAPA 2</span>
        <h1>Quem recebeu?</h1>
        <p>Escolha uma opcao. Nome e CPF/documento sao opcionais e podem ficar em branco.</p>
      </section>

      <section class="grade-escolhas">
        ${opcoes
          .map(
            (opcao) => `
              <button
                class="botao-escolha"
                data-recebedor="${opcao.id}"
                data-selecionado="${selecionado === opcao.id ? "true" : "false"}"
              >
                ${opcao.nome}
              </button>
            `,
          )
          .join("")}
      </section>

      <label class="campo-grande campo-grande--condicional ${selecionado && selecionado !== "PROPRIO" ? "" : "campo-grande--oculto"}" id="campo-nome-recebedor">
        <span>NOME (SE NECESSARIO)</span>
        <input id="nome-recebedor" value="${escaparHtml(entrega.recebedor?.nome ?? "")}" autocomplete="off" placeholder="Nome de quem recebeu" />
      </label>

      <label class="campo-grande campo-grande--condicional ${selecionado ? "" : "campo-grande--oculto"}" id="campo-documento-recebedor">
        <span>CPF / DOCUMENTO (OPCIONAL)</span>
        <input id="documento-recebedor" value="${escaparHtml(entrega.recebedor?.documento ?? "")}" autocomplete="off" inputmode="numeric" placeholder="Pode deixar em branco" />
      </label>
    </main>

    <footer class="acoes-fixas">
      <button id="voltar-fotos" class="botao-acao botao-acao--secundario">VOLTAR</button>
      <button id="ir-finalizar" class="botao-acao botao-acao--primario" ${selecionado ? "" : "disabled"}>PROXIMO</button>
    </footer>
  `;
}

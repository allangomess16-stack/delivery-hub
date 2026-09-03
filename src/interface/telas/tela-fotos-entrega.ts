import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import type { TipoEvidenciaFoto } from "../../dominio/entrega/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

function fotoCard(pacote: PacoteDaCarga, tipo: TipoEvidenciaFoto, titulo: string, descricao: string) {
  const foto = obterEstadoEntrega(pacote).fotos.find((item) => item.tipo === tipo);

  return `
    <article class="tarefa-foto ${foto ? "tarefa-foto--ok" : ""}">
      <div>
        <span class="sobrelinha">${foto ? "REGISTRADA" : "PODE ADIANTAR AGORA"}</span>
        <strong>${escaparHtml(titulo)}</strong>
        <p>${escaparHtml(descricao)}</p>
      </div>

      <label class="botao-foto ${foto ? "botao-foto--ok" : ""}">
        <input
          class="arquivo-escondido"
          type="file"
          accept="image/*"
          capture="environment"
          data-foto-tipo="${tipo}"
        />
        ${foto ? "REFazer FOTO" : "TIRAR FOTO"}
      </label>

      ${foto ? `<button class="acao-texto acao-texto--perigo" data-remover-foto="${tipo}">REMOVER</button>` : ""}
    </article>
  `;
}

export function telaFotosEntrega(pacote: PacoteDaCarga) {
  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      "Preparar evidencias",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ETAPA 1</span>
        <h1>Aproveite a espera</h1>
        <p>
          Tire as fotos que puder enquanto aguarda. Nesta versao elas nao bloqueiam
          o avancar ate validarmos a regra de cada transportadora.
        </p>
      </section>

      <section class="grade-fotos">
        ${fotoCard(pacote, "ETIQUETA", "Etiqueta", "Registre o pacote e o codigo visivel.")}
        ${fotoCard(pacote, "FACHADA", "Fachada / local", "Registre o local da tentativa ou entrega.")}
      </section>
    </main>

    <footer class="acoes-fixas">
      <button id="opcoes-entrega" class="botao-acao botao-acao--perigo">CANCELAR / PAUSAR</button>
      <button id="ir-recebedor" class="botao-acao botao-acao--primario">PROXIMO</button>
    </footer>
  `;
}

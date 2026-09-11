import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import type { TipoEvidenciaFoto } from "../../dominio/entrega/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

function fotoCard(pacote: PacoteDaCarga, tipo: TipoEvidenciaFoto, titulo: string, descricao: string) {
  const foto = obterEstadoEntrega(pacote).fotos.find((item) => item.tipo === tipo);
  const origem = foto?.origem === "GALERIA" ? "DA GALERIA" : foto ? "DA CÂMERA" : "PODE ADIANTAR AGORA";

  return `
    <article class="tarefa-foto ${foto ? "tarefa-foto--ok" : ""}">
      <div>
        <span class="sobrelinha">${foto ? `REGISTRADA • ${origem}` : origem}</span>
        <strong>${escaparHtml(titulo)}</strong>
        <p>${escaparHtml(descricao)}</p>
      </div>

      <div class="acoes-foto" aria-label="Adicionar foto de ${escaparHtml(titulo)}">
        <label class="botao-foto ${foto ? "botao-foto--ok" : ""}">
          <input
            class="arquivo-escondido"
            type="file"
            accept="image/*"
            capture="environment"
            data-foto-tipo="${tipo}"
            data-foto-origem="CAMERA"
          />
          CÂMERA
        </label>
        <label class="botao-foto botao-foto--galeria">
          <input
            class="arquivo-escondido"
            type="file"
            accept="image/*"
            data-foto-tipo="${tipo}"
            data-foto-origem="GALERIA"
          />
          GALERIA
        </label>
      </div>

      ${foto ? `<p class="nota-foto">Uma nova seleção substitui esta foto.</p>` : ""}

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
        <h1>Fotos de comprovação</h1>
        <p>
          Use a câmera do Hub ou fotografe antes no celular e anexe depois pela
          galeria. As fotos ficam guardadas neste aparelho, mesmo sem rede.
        </p>
      </section>

      <section class="grade-fotos">
        ${fotoCard(pacote, "ETIQUETA", "Etiqueta", "Registre o pacote e o código visível.")}
        ${fotoCard(pacote, "FACHADA", "Fachada / local", "Registre o local da tentativa ou entrega.")}
      </section>
    </main>

    <footer class="acoes-fixas">
      <button id="opcoes-entrega" class="botao-acao botao-acao--perigo">CANCELAR / PAUSAR</button>
      <button id="ir-recebedor" class="botao-acao botao-acao--primario">PRÓXIMO</button>
    </footer>
  `;
}

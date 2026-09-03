import { detectarDuplicados } from "../../aplicacao/detectar-duplicados";
import { resumirEntregadores, resumirTransportadoras } from "../../aplicacao/resumir-carga";
import type { CargaImportada } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

function classeTransportadora(id: string): string {
  if (id === "JNT") return "jnt";
  if (id === "ANJUN") return "anjun";
  if (id === "IMILE") return "imile";
  return "outra";
}

export function telaResumo(carga: CargaImportada) {
  const transportadoras = resumirTransportadoras(carga);
  const entregadores = resumirEntregadores(carga);
  const duplicados = detectarDuplicados(carga.pacotes);
  const revisao = carga.pacotes.filter((pacote) => pacote.precisaRevisao).length;
  const desconhecidos = carga.pacotes.filter((pacote) => pacote.transportadora.id === "OUTRA").length;

  return `
    ${cabecalhoFixo("Delivery Hub", "Carga importada")}

    <main class="conteudo conteudo--com-rodape">
      <section class="resumo-principal">
        <span class="sobrelinha">${escaparHtml(carga.nomeArquivo)}</span>
        <strong class="numero-grande">${carga.pacotes.length}</strong>
        <span class="legenda-numero">PACOTES</span>
      </section>

      <section class="grade-kpis">
        ${transportadoras
          .map(
            (item) => `
              <article class="kpi kpi--${classeTransportadora(item.id)}">
                <span>${escaparHtml(item.nome)}</span>
                <strong>${item.quantidade}</strong>
              </article>`,
          )
          .join("")}
      </section>

      <section class="alertas">
        <article class="alerta-card ${duplicados.length ? "alerta-card--atencao" : ""}">
          <span>Duplicidades</span><strong>${duplicados.length}</strong>
        </article>
        <button
          id="abrir-revisao"
          class="alerta-card alerta-card--botao ${revisao ? "alerta-card--atencao" : ""}"
          ${revisao ? "" : "disabled"}
          aria-label="${revisao ? `Abrir ${revisao} pacotes para revisar` : "Nenhum pacote para revisar"}"
        >
          <span>Revisar</span>
          <strong>${revisao}</strong>
          <small>${revisao ? "TOQUE PARA VER" : "SEM PENDENCIAS"}</small>
        </button>
        <article class="alerta-card ${desconhecidos ? "alerta-card--neutro" : ""}">
          <span>Outros</span><strong>${desconhecidos}</strong>
        </article>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao">
          <div>
            <span class="sobrelinha">DISTRIBUICAO</span>
            <h2>Entregadores</h2>
          </div>
          <span>${entregadores.length}</span>
        </div>

        <div class="lista-entregadores">
          ${entregadores
            .map(
              (entregador) => `
                <button class="entregador-card" data-entregador="${escaparHtml(entregador.nome)}">
                  <div>
                    <strong>${escaparHtml(entregador.nome)}</strong>
                    <span>${entregador.transportadoras
                      .slice(0, 3)
                      .map((item) => `${escaparHtml(item.nome)} ${item.quantidade}`)
                      .join(" • ")}</span>
                  </div>
                  <b>${entregador.total}</b>
                </button>`,
            )
            .join("")}
        </div>
      </section>
    </main>

    <footer class="acoes-fixas">
      <button id="limpar-carga" class="botao-acao botao-acao--perigo">CANCELAR CARGA</button>
      <button id="nova-planilha" class="botao-acao botao-acao--primario">NOVA PLANILHA</button>
    </footer>
  `;
}

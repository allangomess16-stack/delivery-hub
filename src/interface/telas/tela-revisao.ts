import { filtrarPacotesParaRevisao } from "../../aplicacao/filtrar-pacotes-revisao";
import type { CargaImportada } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaRevisao(carga: CargaImportada) {
  const pacotes = filtrarPacotesParaRevisao(carga.pacotes);

  return `
    ${cabecalhoFixo("Delivery Hub", "Pacotes para revisar")}

    <main class="conteudo conteudo--com-rodape">
      <section class="resumo-principal resumo-principal--compacto">
        <span class="sobrelinha">REVISAO DA IMPORTACAO</span>
        <strong class="numero-grande numero-grande--atencao">${pacotes.length}</strong>
        <span class="legenda-numero">PACOTES PRECISAM DE CONFERENCIA</span>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao">
          <div>
            <span class="sobrelinha">FILTRO ATIVO</span>
            <h2>Somente revisoes</h2>
          </div>
          <span>${pacotes.length}</span>
        </div>

        ${
          pacotes.length
            ? `
              <div class="lista-revisao">
                ${pacotes
                  .map(
                    (pacote) => `
                      <article class="revisao-item">
                        <div class="revisao-item__topo">
                          <div>
                            <span class="revisao-item__entregador">${escaparHtml(pacote.entregador)}</span>
                            <strong>${escaparHtml(pacote.codigoNormalizado || "Codigo nao identificado")}</strong>
                          </div>
                          <i class="selo selo--atencao">REVISAR</i>
                        </div>

                        <div class="revisao-item__dados">
                          <span>
                            <b>Transportadora</b>
                            ${escaparHtml(pacote.transportadora.nome)}
                          </span>
                          <span>
                            <b>Motivo</b>
                            ${escaparHtml(pacote.motivoRevisao ?? "Conferencia manual solicitada")}
                          </span>
                        </div>

                        ${
                          pacote.codigoOriginal !== pacote.codigoNormalizado
                            ? `
                              <div class="codigo-original">
                                <span>Valor original</span>
                                <code>${escaparHtml(pacote.codigoOriginal)}</code>
                              </div>
                            `
                            : ""
                        }
                      </article>`,
                  )
                  .join("")}
              </div>
            `
            : `
              <div class="estado-vazio">
                <strong>Nenhuma revisao pendente</strong>
                <span>A importacao nao possui pacotes marcados para conferencia.</span>
              </div>
            `
        }
      </section>
    </main>

    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-revisao" class="botao-acao botao-acao--secundario">VOLTAR PARA RESUMO</button>
    </footer>
  `;
}

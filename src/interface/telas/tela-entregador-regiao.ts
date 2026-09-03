import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import { idRegiaoPacote, nomeRegiaoPacote } from "../../aplicacao/regiao/resumir-carga-por-regiao";
import type { CargaEntregador } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaEntregadorRegiao(carga: CargaEntregador, regiaoId: string) {
  const pacotes = carga.pacotes.filter((pacote) => idRegiaoPacote(pacote) === regiaoId);
  const nome = pacotes[0] ? nomeRegiaoPacote(pacotes[0]) : "Regiao";
  const restantes = pacotes.filter((pacote) => {
    const estado = obterEstadoEntrega(pacote).estadoFisico;
    return estado !== "ENTREGUE" && estado !== "NAO_ENTREGUE";
  }).length;

  return `
    ${cabecalhoFixo(carga.nomeEntregador, nome)}
    <main class="conteudo conteudo--com-rodape">
      <section class="resumo-principal resumo-principal--compacto">
        <span class="sobrelinha">REGIAO</span>
        <strong class="numero-grande">${restantes}</strong>
        <span class="legenda-numero">RESTANTES • ${pacotes.length} NO TOTAL</span>
      </section>

      <section class="secao-lista">
        <div class="titulo-secao"><div><span class="sobrelinha">ENCOMENDAS</span><h2>${escaparHtml(nome)}</h2></div><span>${pacotes.length}</span></div>
        <div class="lista-pacotes">
          ${pacotes.map((pacote) => {
            const estado = obterEstadoEntrega(pacote).estadoFisico;
            return `
              <button class="pacote-linha pacote-linha--botao" data-abrir-pacote-regiao="${escaparHtml(pacote.id)}">
                <div>
                  <strong>${escaparHtml(pacote.codigoNormalizado)}</strong>
                  <span>${escaparHtml(pacote.enderecoEntrega?.texto ?? pacote.transportadora.nome)}</span>
                </div>
                <i class="selo ${estado === "ENTREGUE" ? "selo--ok" : estado === "NAO_ENTREGUE" ? "selo--atencao" : ""}">${escaparHtml(estado)}</i>
              </button>`;
          }).join("")}
        </div>
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-regioes-entregador" class="botao-acao botao-acao--secundario">VOLTAR PARA MINHA CARGA</button>
    </footer>
  `;
}

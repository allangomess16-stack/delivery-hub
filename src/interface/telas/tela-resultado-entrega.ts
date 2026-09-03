import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";

export function telaResultadoEntrega(pacote: PacoteDaCarga) {
  const entrega = obterEstadoEntrega(pacote);
  const entregue = entrega.estadoFisico === "ENTREGUE";

  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      entregue ? "Entrega registrada" : "Ocorrencia registrada",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="resultado-entrega ${entregue ? "resultado-entrega--ok" : "resultado-entrega--atencao"}">
        <span class="resultado-entrega__icone">${entregue ? "✓" : "!"}</span>
        <h1>${entregue ? "Entrega registrada" : "Nao entregue"}</h1>
        <p>
          ${entregue
            ? "A entrega fisica esta concluida. A baixa externa ainda sera tratada em fase posterior."
            : `Motivo: ${entrega.motivoNaoEntrega ?? "OUTRO"}.`}
        </p>
      </section>
    </main>

    <footer class="acoes-fixas">
      <button id="desfazer-conclusao" class="botao-acao botao-acao--perigo">DESFAZER</button>
      <button id="proximo-pacote" class="botao-acao botao-acao--primario">PROXIMO PACOTE</button>
    </footer>
  `;
}

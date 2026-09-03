import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaFinalizarEntrega(pacote: PacoteDaCarga) {
  const entrega = obterEstadoEntrega(pacote);
  const temEtiqueta = entrega.fotos.some((foto) => foto.tipo === "ETIQUETA");
  const temFachada = entrega.fotos.some((foto) => foto.tipo === "FACHADA");

  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      "Finalizar",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ETAPA 3</span>
        <h1>Confirmar entrega</h1>
        <p>A entrega fisica so muda de estado quando voce confirmar abaixo.</p>
      </section>

      <section class="resumo-confirmacao">
        <div><span>Etiqueta</span><strong>${temEtiqueta ? "REGISTRADA" : "NAO REGISTRADA"}</strong></div>
        <div><span>Fachada</span><strong>${temFachada ? "REGISTRADA" : "NAO REGISTRADA"}</strong></div>
        <div><span>Recebedor</span><strong>${entrega.recebedor?.tipo ?? "NAO INFORMADO"}</strong></div>
        <div><span>CPF / documento</span><strong>${escaparHtml(entrega.recebedor?.documento || "NAO INFORMADO")}</strong></div>
      </section>

      <div class="acoes-empilhadas">
        <button id="confirmar-entrega" class="botao-acao botao-acao--sucesso">CONFIRMAR ENTREGA</button>
        <button id="abrir-nao-entregue" class="botao-acao botao-acao--atencao">NAO FOI POSSIVEL ENTREGAR</button>
      </div>
    </main>

    <footer class="acoes-fixas">
      <button id="voltar-recebedor" class="botao-acao botao-acao--secundario">VOLTAR</button>
      <button id="opcoes-entrega" class="botao-acao botao-acao--perigo">CANCELAR / PAUSAR</button>
    </footer>
  `;
}

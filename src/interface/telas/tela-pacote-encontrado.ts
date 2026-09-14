import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

function nomeEstado(estado: string): string {
  const nomes: Record<string, string> = {
    PENDENTE: "PENDENTE",
    PREPARANDO: "EM PREPARACAO",
    AGUARDANDO_RECEBEDOR: "AGUARDANDO",
    ENTREGUE: "ENTREGUE",
    NAO_ENTREGUE: "NAO ENTREGUE",
  };
  return nomes[estado] ?? estado;
}

function podeDesfazerLocalmente(estadoIntegracao: string): boolean {
  return (
    estadoIntegracao === "NAO_INICIADA" ||
    estadoIntegracao === "AGUARDANDO_SINCRONIZACAO" ||
    estadoIntegracao === "ERRO" ||
    estadoIntegracao === "ACAO_MANUAL"
  );
}

export function telaPacoteEncontrado(pacote: PacoteDaCarga) {
  const entrega = obterEstadoEntrega(pacote);
  const finalizado = entrega.estadoFisico === "ENTREGUE" || entrega.estadoFisico === "NAO_ENTREGUE";
  const iniciado = entrega.estadoFisico !== "PENDENTE" && !finalizado;

  return `
    ${cabecalhoFixo(pacote.transportadora.nome, `Pacote • ...${escaparHtml(pacote.codigoNormalizado.slice(-6))}`)}

    <main class="conteudo conteudo--com-rodape">
      <section class="pacote-encontrado">
        <span class="sobrelinha">PACOTE ENCONTRADO</span>
        <strong class="codigo-destaque">${escaparHtml(pacote.codigoNormalizado)}</strong>

        <div class="linha-status-entrega">
          <span>${escaparHtml(pacote.entregador)}</span>
          <i class="selo ${finalizado ? "selo--ok" : "selo--atencao"}">${nomeEstado(entrega.estadoFisico)}</i>
        </div>

        ${pacote.precisaRevisao ? `
          <div class="mensagem-operacao mensagem-operacao--atencao">
            Este pacote esta marcado para revisao da importacao.
          </div>
        ` : ""}

        ${finalizado ? `
          <div class="resumo-finalizado">
            <strong>${nomeEstado(entrega.estadoFisico)}</strong>
            <span>
              ${entrega.concluidaEm ? new Date(entrega.concluidaEm).toLocaleString("pt-BR") : ""}
            </span>
          </div>
        ` : `
          <div class="nota-operacao">
            <strong>${iniciado ? "Continuar" : "Pronto para iniciar"}</strong>
            <span>
              ${iniciado
                ? "O que ja foi preenchido foi preservado."
                : "A entrega fisica so sera concluida quando voce confirmar no final."}
            </span>
          </div>
        `}
      </section>
    </main>

    <footer class="acoes-fixas">
      <button id="voltar-scanner" class="botao-acao botao-acao--secundario">OUTRO PACOTE</button>
      ${
        finalizado
          ? `<button id="desfazer-conclusao" class="botao-acao botao-acao--perigo" ${entrega.ultimaAcaoDesfazivel && podeDesfazerLocalmente(entrega.estadoIntegracao) ? "" : "disabled"}>DESFAZER</button>`
          : `<button id="iniciar-entrega" class="botao-acao botao-acao--primario">${iniciado ? "CONTINUAR" : "INICIAR ENTREGA"}</button>`
      }
    </footer>
  `;
}

import type { MotivoNaoEntrega } from "../../dominio/entrega/tipos";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";

const motivos: Array<{ id: MotivoNaoEntrega; nome: string }> = [
  { id: "DESTINATARIO_AUSENTE", nome: "DESTINATARIO AUSENTE" },
  { id: "LOCAL_FECHADO", nome: "LOCAL FECHADO" },
  { id: "SEM_ACESSO", nome: "SEM ACESSO" },
  { id: "ENDERECO_INCORRETO", nome: "ENDERECO INCORRETO" },
  { id: "ENDERECO_NAO_ENCONTRADO", nome: "ENDERECO NAO ENCONTRADO" },
  { id: "RECUSADO", nome: "RECUSADO" },
  { id: "OUTRO", nome: "OUTRO" },
];

export function telaNaoEntregue(pacote: PacoteDaCarga) {
  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      "Nao entregue",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">OCORRENCIA</span>
        <h1>O que aconteceu?</h1>
        <p>Escolha apenas o motivo. Outros campos so serao adicionados se a transportadora exigir.</p>
      </section>

      <section class="lista-motivos">
        ${motivos
          .map(
            (motivo) => `
              <button class="botao-motivo" data-motivo="${motivo.id}">
                ${motivo.nome}
              </button>`,
          )
          .join("")}
      </section>
    </main>

    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-finalizar" class="botao-acao botao-acao--secundario">VOLTAR</button>
    </footer>
  `;
}

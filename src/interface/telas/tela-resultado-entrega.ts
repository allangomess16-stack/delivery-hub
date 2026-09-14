import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";
import type {
  CapacidadePodTransportadora,
  EstadoCampoPodTransportadora,
} from "../../dominio/integracao/capacidade-pod-transportadora";

function textoCapacidade(estado: EstadoCampoPodTransportadora): string {
  if (estado === "PREENCHIDO_AUTOMATICAMENTE") return "AUTOMÁTICO";
  if (estado === "PREENCHER_NO_APP") return "PREENCHER NO APP";
  return "NÃO SUPORTADO";
}

function classeCapacidade(estado: EstadoCampoPodTransportadora): string {
  return estado === "PREENCHIDO_AUTOMATICAMENTE" ? "selo--ok" : "selo--atencao";
}

export function telaResultadoEntrega(
  pacote: PacoteDaCarga,
  possuiIntegracao = false,
  capacidade?: CapacidadePodTransportadora,
) {
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
            ? "A entrega fisica esta concluida e foi salva no aparelho. A sincronizacao acontece separadamente."
            : `Motivo: ${entrega.motivoNaoEntrega ?? "OUTRO"}.`}
        </p>
      </section>

      ${possuiIntegracao ? `
        <section class="painel-destaque painel-destaque--compacto">
          <span class="sobrelinha">APP DA TRANSPORTADORA</span>
          ${capacidade?.transportadora === "IMILE" ? `
            <button id="preparar-assistencia-imile" class="botao-acao botao-acao--secundario">
              ATIVAR/PREPARAR PREENCHIMENTO IMILE
            </button>
            <p class="texto-apoio">Preenche nome, documento e notas na tela Confirmar. Foto, assinatura e “Entregue” continuam manuais.</p>
          ` : ""}
          <button id="abrir-transportadora" class="botao-acao botao-acao--primario">
            ABRIR NOVAMENTE ${escaparHtml(pacote.transportadora.nome.toUpperCase())}
          </button>
          <p id="resultado-integracao" class="texto-apoio" role="status" aria-live="polite">
            POD salvo. Preparando aplicativo da transportadora...
          </p>
        </section>
        ${capacidade ? `
          <section class="painel-destaque painel-destaque--compacto matriz-pod">
            <span class="sobrelinha">TRANSFERÊNCIA PARA ${escaparHtml(pacote.transportadora.nome.toUpperCase())}</span>
            <p>Somente capacidades comprovadas são automáticas. O POD salvo no Hub não é enviado sem contrato validado.</p>
            <div class="matriz-pod__linha"><span>Tracking</span><i class="selo ${classeCapacidade(capacidade.tracking)}">${textoCapacidade(capacidade.tracking)}</i></div>
            <div class="matriz-pod__linha"><span>Recebedor</span><i class="selo ${classeCapacidade(capacidade.recebedor)}">${textoCapacidade(capacidade.recebedor)}</i></div>
            <div class="matriz-pod__linha"><span>Fotos</span><i class="selo ${classeCapacidade(capacidade.fotos)}">${textoCapacidade(capacidade.fotos)}</i></div>
            <div class="matriz-pod__linha"><span>Assinatura</span><i class="selo ${classeCapacidade(capacidade.assinatura)}">${textoCapacidade(capacidade.assinatura)}</i></div>
            <div class="matriz-pod__linha"><span>Baixa</span><i class="selo ${classeCapacidade(capacidade.confirmacaoBaixa)}">${textoCapacidade(capacidade.confirmacaoBaixa)}</i></div>
          </section>
        ` : ""}
      ` : ""}
    </main>

    <footer class="acoes-fixas">
      <button id="desfazer-conclusao" class="botao-acao botao-acao--perigo">DESFAZER</button>
      <button id="proximo-pacote" class="botao-acao botao-acao--primario">PROXIMO PACOTE</button>
    </footer>
  `;
}

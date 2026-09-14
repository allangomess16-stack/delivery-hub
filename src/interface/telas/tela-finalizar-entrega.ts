import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

export function telaFinalizarEntrega(pacote: PacoteDaCarga) {
  const entrega = obterEstadoEntrega(pacote);
  const ehImile = pacote.transportadora.id === "IMILE";
  const temEtiqueta = entrega.fotos.some((foto) => foto.tipo === "ETIQUETA");
  const temFachada = entrega.fotos.some((foto) => foto.tipo === "FACHADA");
  const temComprovante = entrega.fotos.some((foto) => foto.tipo === "COMPROVANTE_RECEBIMENTO");
  const temAssinatura = Boolean(entrega.assinatura);
  const dadosImile = entrega.dadosComprovacaoImile;

  return `
    ${cabecalhoFixo(
      `${pacote.transportadora.nome} • ...${pacote.codigoNormalizado.slice(-6)}`,
      "Finalizar",
    )}

    <main class="conteudo conteudo--com-rodape">
      <section class="cabecalho-etapa">
        <span class="sobrelinha">ETAPA 4${ehImile ? " • IMILE" : ""}</span>
        <h1>${ehImile ? "Confirmar no Hub" : "Confirmar entrega"}</h1>
        <p>${ehImile
          ? "Confirme o POD no Hub depois de conferir estes dados. A baixa no aplicativo iMile continua manual nesta versão."
          : "A entrega fisica so muda de estado quando voce confirmar abaixo."}</p>
      </section>

      <section class="resumo-confirmacao">
        <div><span>Etiqueta</span><strong>${temEtiqueta ? "REGISTRADA" : "NAO REGISTRADA"}</strong></div>
        <div><span>Fachada</span><strong>${temFachada ? "REGISTRADA" : "NAO REGISTRADA"}</strong></div>
        ${ehImile ? `
          <div><span>Comprovante de recebimento</span><strong>${temComprovante ? "REGISTRADO" : "NAO REGISTRADO"}</strong></div>
          <div><span>Quem recebeu</span><strong>${escaparHtml(dadosImile?.recebedor ?? "NAO INFORMADO")}</strong></div>
          <div><span>Nome completo</span><strong>${escaparHtml(dadosImile?.nomeCompleto || "NAO INFORMADO")}</strong></div>
          <div><span>Documento</span><strong>${escaparHtml(dadosImile ? `${dadosImile.tipoDocumento}: ${dadosImile.numeroDocumento}` : "NAO INFORMADO")}</strong></div>
        ` : `
          <div><span>Recebedor</span><strong>${entrega.recebedor?.tipo ?? "NAO INFORMADO"}</strong></div>
          <div><span>CPF / documento</span><strong>${escaparHtml(entrega.recebedor?.documento || "NAO INFORMADO")}</strong></div>
        `}
        <div><span>Assinatura</span><strong>${temAssinatura ? "REGISTRADA" : "NAO REGISTRADA"}</strong></div>
      </section>

      <div class="acoes-empilhadas">
        <button id="confirmar-entrega" class="botao-acao botao-acao--sucesso">${ehImile ? "CONFIRMAR POD NO HUB" : "CONFIRMAR ENTREGA"}</button>
        <button id="abrir-nao-entregue" class="botao-acao botao-acao--atencao">NAO FOI POSSIVEL ENTREGAR</button>
      </div>
    </main>

    <footer class="acoes-fixas">
      <button id="voltar-assinatura" class="botao-acao botao-acao--secundario">VOLTAR</button>
      <button id="opcoes-entrega" class="botao-acao botao-acao--perigo">CANCELAR / PAUSAR</button>
    </footer>
  `;
}

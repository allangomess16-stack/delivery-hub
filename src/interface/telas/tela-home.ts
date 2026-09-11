import type { ResumoHomeEntregador } from "../../aplicacao/home/resumir-home-entregador";
import { MODO_CONTA_ATUAL } from "../../configuracao/modo-conta";
import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

/** Componente de apresentação: decisões de navegação ficam em AplicacaoDeliveryHub. */
export function telaHome(
  usuario: UsuarioAtual,
  resumo: ResumoHomeEntregador,
): string {
  const acaoRetomada = Boolean(resumo.retomada);
  const acaoId = acaoRetomada ? "retomar-operacao" : "acessar-operacao";
  const acaoRotulo = acaoRetomada
    ? "RETOMAR ENTREGA"
    : resumo.possuiCargaHoje
      ? "ACESSAR CARGA DE HOJE"
      : "INICIAR SCANNER UNIVERSAL";

  return `
    ${cabecalhoFixo("Delivery Hub", `Olá, ${usuario.nome}`, true)}
    <main class="conteudo conteudo--com-rodape home-entregador">
      <section class="home-boas-vindas">
        <span class="sobrelinha">OPERAÇÃO DE CAMPO</span>
        <h1>Pronto para a rota?</h1>
        <p>Entre na operação quando estiver pronto. Seus registros continuam protegidos neste aparelho.</p>
      </section>

      <section class="home-saude-conta">
        <span class="home-saude-conta__icone" aria-hidden="true">✓</span>
        <div><strong>${escaparHtml(MODO_CONTA_ATUAL.rotulo)}</strong><span>${escaparHtml(MODO_CONTA_ATUAL.detalhe)}</span></div>
      </section>

      <section class="grade-kpis home-indicadores" aria-label="Resumo da operação">
        <div class="kpi"><span>ENTREGAS NA SEMANA</span><strong>${resumo.entregasSemana}</strong><small>prova registrada no Hub</small></div>
        <div class="kpi kpi--anjun"><span>PENDENTES HOJE</span><strong>${resumo.pendentesHoje}</strong><small>${resumo.possuiCargaHoje ? "na carga atual" : "sem carga atribuída"}</small></div>
      </section>

      ${resumo.retomada ? `
        <section class="home-retomada">
          <span class="sobrelinha">ENTREGA PRESERVADA</span>
          <strong>Retome de onde parou</strong>
          <p>Pacote …${escaparHtml(resumo.retomada.pacote.codigoNormalizado.slice(-6))} · dados e evidências continuam salvos.</p>
        </section>
      ` : ""}

      <section class="home-avisos">
        <div class="titulo-secao"><div><span class="sobrelinha">AVISOS</span><h2>Hoje</h2></div></div>
        <ul>
          <li><time>${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</time><span>Bem-vindo ao Delivery Hub.</span></li>
          ${resumo.avisos.map((aviso) => `<li><time>AGORA</time><span>${escaparHtml(aviso)}</span></li>`).join("")}
        </ul>
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--scanner">
      <button id="sair" class="botao-acao botao-acao--secundario">SAIR</button>
      <button id="${acaoId}" class="botao-acao botao-acao--primario">${acaoRotulo}</button>
    </footer>
  `;
}

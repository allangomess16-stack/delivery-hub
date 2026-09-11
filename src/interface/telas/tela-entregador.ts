import { resumirOperacaoEntregador } from "../../aplicacao/resumir-operacao-entregador";
import { resumirCargaPorRegiao } from "../../aplicacao/regiao/resumir-carga-por-regiao";
import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { RegistroOperacaoScanner } from "../../dominio/scanner/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

function nomeTransportadora(id: string): string {
  if (id === "IMILE") return "iMile · Rider Delivery";
  if (id === "ANJUN") return "Anjun";
  if (id === "JNT") return "J&T Express";
  return "Sistema reconhecido";
}

function textoEstado(operacao: RegistroOperacaoScanner): string {
  if (operacao.estado === "DESPACHADO") return "Aplicativo aberto";
  if (operacao.estado === "FALLBACK") return "Codigo copiado para contingencia";
  if (operacao.estado === "FALHA") return "Abertura pendente";
  if (operacao.origem === "EXTRA_ROTA") return "Extra rota · registrado para conciliacao";
  return "Pronto para encaminhar";
}

/** Painel de campo: carga atribuida e scanner livre aparecem sem misturar saldos. */
export function telaEntregador(
  carga: CargaEntregador,
  operacoesHoje: readonly RegistroOperacaoScanner[] = [],
): string {
  const operacao = resumirOperacaoEntregador(carga.pacotes);
  const regioes = resumirCargaPorRegiao(carga.pacotes);
  const finalizados = operacao.entregues + operacao.naoEntregues;
  const restantes = operacao.pendentes + operacao.emAndamento;
  const progresso = operacao.total ? Math.round((finalizados / operacao.total) * 100) : 0;
  const ultima = operacoesHoje[0];

  return `
    ${cabecalhoFixo(
      "Delivery Hub",
      `${carga.nomeEntregador} · Operacao de hoje`,
      true,
      { id: "voltar-inicio", rotulo: "INÍCIO" },
    )}
    <main class="conteudo conteudo--com-rodape painel-entregador">
      <section class="painel-operacao-hoje">
        <div class="painel-operacao-hoje__topo">
          <div><span class="sobrelinha">MINHA CARGA</span><h1>Entregas de hoje</h1></div>
          <strong>${operacao.total}</strong>
        </div>
        <p>${finalizados} concluidos · ${restantes} restantes</p>
        <div class="barra-progresso" aria-label="${progresso}% concluido"><i style="width:${progresso}%"></i><b>${progresso}%</b></div>
        <div class="painel-operacao-hoje__rodape">
          <span>${carga.referenciaCarga ? escaparHtml(carga.referenciaCarga) : "Carga atribuida"}</span>
          <button id="ver-regioes-entregador" class="acao-texto">VER POR REGIAO</button>
        </div>
      </section>

      <section class="grade-kpis grade-kpis--resumo-hibrido">
        <div class="kpi kpi--imile"><span>CONCLUÍDAS</span><strong>${finalizados}</strong><small>prova registrada</small></div>
        <button id="sincronizar-agora" class="kpi kpi--botao kpi--anjun"><span>PENDENTES</span><strong>${operacao.aguardandoSincronizacao}</strong><small>toque para sincronizar</small></button>
        <div class="kpi"><span>OPERAÇÕES HOJE</span><strong>${operacoesHoje.length}</strong><small>leituras no Hub</small></div>
      </section>
      <div id="status-sincronizacao" class="status-sincronizacao" aria-live="polite"></div>

      <section class="ultima-operacao ${ultima ? "ultima-operacao--ativa" : ""}">
        <span class="sobrelinha">ÚLTIMA OPERAÇÃO</span>
        ${ultima ? `
          <strong id="copiar-ultima-operacao" class="codigo-destaque codigo-destaque--copiavel" title="Toque longo para copiar" data-codigo="${escaparHtml(ultima.tracking)}">${escaparHtml(ultima.tracking)}</strong>
          <p>${escaparHtml(nomeTransportadora(ultima.transportadoraId))} · ${escaparHtml(textoEstado(ultima))}</p>
          <div class="ultima-operacao__acoes">
            <button id="copiar-ultima-operacao-botao" class="botao-acao botao-acao--secundario">COPIAR CÓDIGO</button>
            <button id="abrir-ultima-operacao" class="botao-acao botao-acao--primario">ABRIR APP</button>
          </div>
        ` : `<p>Nenhuma etiqueta reconhecida hoje. A ultima operacao ficara aqui para retomada rapida.</p>`}
      </section>

      <section class="resumo-rotas">
        <div class="titulo-secao"><div><span class="sobrelinha">ORGANIZAÇÃO</span><h2>Por região</h2></div><span>${regioes.length}</span></div>
        <div class="grade-regioes-entregador">
          ${regioes.slice(0, 6).map((regiao) => `
            <button class="regiao-entregador-card ${regiao.regiaoId === "SEM-REGIAO" ? "regiao-entregador-card--sem-regiao" : ""}" data-abrir-regiao="${escaparHtml(regiao.regiaoId)}">
              <span>${escaparHtml(regiao.nome)}</span><strong>${regiao.restantes}</strong><small>restantes</small>
            </button>`).join("")}
        </div>
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--scanner">
      <button id="sair" class="botao-acao botao-acao--secundario">SAIR</button>
      <button id="abrir-scanner" class="botao-acao botao-acao--primario">ESCANEAR ENTREGA</button>
    </footer>
  `;
}

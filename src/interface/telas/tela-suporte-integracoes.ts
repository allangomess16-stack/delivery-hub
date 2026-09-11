import type { RegistroTelemetriaIntegracao } from "../../aplicacao/portas/repositorio-telemetria-integracao";
import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";
import type { ContratoIntegracaoEfetivo } from "../../dominio/integracao/contrato-integracao";

function linha(registro: RegistroTelemetriaIntegracao): string {
  const evento = registro.evento;
  const hora = Number.isFinite(Date.parse(evento.ocorridoEm))
    ? new Date(evento.ocorridoEm).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
  return `
    <article class="pacote-linha">
      <div>
        <strong>${escaparHtml(evento.codigo)}</strong>
        <span>${escaparHtml(evento.transportadora)} • ${escaparHtml(evento.etapa)}</span>
        <small>${escaparHtml(registro.usuarioId.slice(0, 10))}… • ${escaparHtml(hora)}</small>
      </div>
      <i class="selo ${evento.codigo === "DESPACHADO_VALIDADO" ? "selo--ok" : "selo--atencao"}">
        ${escaparHtml(evento.estrategia)}
      </i>
    </article>
  `;
}

export function telaSuporteIntegracoes(
  usuario: UsuarioAtual,
  dia: string,
  registros: RegistroTelemetriaIntegracao[],
  contrato: ContratoIntegracaoEfetivo | null,
  mensagem = "",
): string {
  const falhas = registros.filter((item) =>
    !["DESPACHADO_VALIDADO", "FALLBACK_CLIPBOARD"].includes(item.evento.codigo),
  ).length;
  const fallbacks = registros.filter(
    (item) => item.evento.codigo === "FALLBACK_CLIPBOARD",
  ).length;

  return `
    ${cabecalhoFixo(usuario.nome, "Suporte de integracoes")}
    <main class="conteudo conteudo--com-rodape">
      <section class="painel-destaque">
        <span class="sobrelinha">DIAGNOSTICO SILENCIOSO</span>
        <h1>Saude das integracoes</h1>
        <p>Somente eventos tecnicos, sem tracking, recebedor, documento, foto ou token.</p>
      </section>

      <section class="grade-kpis">
        <div class="kpi"><span>EVENTOS</span><strong>${registros.length}</strong></div>
        <div class="kpi"><span>FALLBACKS</span><strong>${fallbacks}</strong></div>
        <div class="kpi"><span>FALHAS</span><strong>${falhas}</strong></div>
      </section>

      <section class="painel-destaque painel-destaque--compacto">
        <span class="sobrelinha">CONTRATO RIDER DELIVERY 2.3.21</span>
        <p>
          Estado: <strong>${contrato?.habilitado && contrato.modo === "DEEPLINK" ? "DEEP LINK ATIVO" : "FALLBACK ATIVO"}</strong>
          • origem ${escaparHtml(contrato?.origem ?? "INDISPONIVEL")}
        </p>
        <div class="acoes-empilhadas">
          <button id="ativar-deeplink" class="botao-acao botao-acao--primario">ATIVAR DEEP LINK</button>
          <button id="ativar-fallback" class="botao-acao botao-acao--secundario">USAR FALLBACK</button>
        </div>
      </section>

      <section class="painel-destaque painel-destaque--compacto">
        <label class="campo-grande">
          <span>DATA UTC</span>
          <input id="dia-suporte" type="date" value="${escaparHtml(dia)}" />
        </label>
        <button id="atualizar-suporte" class="botao-acao botao-acao--primario">ATUALIZAR</button>
        <p role="status">${escaparHtml(mensagem)}</p>
      </section>

      <section class="lista-pacotes">
        ${registros.length ? registros.map(linha).join("") : `
          <div class="estado-vazio"><strong>Nenhum evento neste dia</strong></div>
        `}
      </section>
    </main>
    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="sair" class="botao-acao botao-acao--secundario">SAIR</button>
    </footer>
  `;
}

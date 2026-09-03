import { INTEGRACOES_TRANSPORTADORAS } from "../../configuracao/integracoes-transportadoras";
import type {
  NivelEvidenciaIntegracao,
  RegistroIntegracaoTransportadora,
} from "../../dominio/integracao/tipos";
import { cabecalhoFixo } from "../componentes/cabecalho";
import { escaparHtml } from "../componentes/html";

const ROTULO_NIVEL: Record<NivelEvidenciaIntegracao, string> = {
  UNKNOWN: "AGUARDANDO",
  MANIFEST_DISCOVERED: "MANIFEST",
  CODE_DISCOVERED: "CODIGO",
  ADB_VALIDATED: "ADB",
  DEVICE_VALIDATED: "APARELHO",
  PRODUCTION_VALIDATED: "PRODUCAO",
};

function classeNivel(nivel: NivelEvidenciaIntegracao): string {
  if (nivel === "PRODUCTION_VALIDATED") return "integracao-status--ok";
  if (nivel === "DEVICE_VALIDATED" || nivel === "ADB_VALIDATED") {
    return "integracao-status--teste";
  }
  if (nivel === "CODE_DISCOVERED" || nivel === "MANIFEST_DISCOVERED") {
    return "integracao-status--codigo";
  }
  return "integracao-status--pendente";
}

function card(registro: RegistroIntegracaoTransportadora): string {
  const principais = registro.capacidades
    .filter((item) =>
      ["ABRIR_APP", "SCANNER_INTERNO", "PROVA_FOTO", "ASSINATURA", "MODO_OFFLINE"].includes(
        item.capacidade,
      ),
    )
    .map(
      (item) => `
        <li>
          <span>${escaparHtml(item.capacidade.replaceAll("_", " "))}</span>
          <b class="${classeNivel(item.nivel)}">${ROTULO_NIVEL[item.nivel]}</b>
        </li>
      `,
    )
    .join("");

  return `
    <article class="integracao-card">
      <div class="integracao-card__topo">
        <div>
          <span class="etiqueta-status">${escaparHtml(registro.nomeTransportadora)}</span>
          <strong>${escaparHtml(registro.nomeAplicativo)}</strong>
          <small>${escaparHtml(registro.packageName ?? "Package ainda nao confirmado")}</small>
        </div>
        <b class="integracao-status ${classeNivel(registro.nivelPackage)}">
          ${ROTULO_NIVEL[registro.nivelPackage]}
        </b>
      </div>

      <div class="integracao-card__meta">
        <span>Versao APK</span>
        <strong>${escaparHtml(registro.apk?.versaoNome ?? "—")}</strong>
      </div>

      <ul class="integracao-capacidades">
        ${principais}
      </ul>

      ${
        registro.apk
          ? `<p class="integracao-hash">SHA-256 ${escaparHtml(registro.apk.sha256)}</p>`
          : ""
      }
    </article>
  `;
}

export function telaAdminIntegracoes(): string {
  const registros = [
    INTEGRACOES_TRANSPORTADORAS.ANJUN,
    INTEGRACOES_TRANSPORTADORAS.IMILE,
    INTEGRACOES_TRANSPORTADORAS.JNT,
  ];

  return `
    ${cabecalhoFixo("Delivery Hub • Integracoes", "Diagnostico Android")}
    <main class="conteudo conteudo--com-rodape">
      <section class="painel-destaque">
        <span class="etiqueta-status">MOTOR DE INTEGRACOES</span>
        <h1>Aplicativos das transportadoras</h1>
        <p>
          Descoberta de codigo nao significa automacao aprovada.
          O sistema so libera automacao quando a capacidade chega a PRODUCAO.
        </p>
      </section>

      <section class="lista-integracoes">
        ${registros.map(card).join("")}
      </section>

      <section class="painel-destaque painel-destaque--compacto">
        <span class="etiqueta-status">PROXIMO TESTE</span>
        <p>
          Use BAT\\ANDROID\\02_DIAGNOSTICAR_APPS.bat com o celular conectado.
          Isso confirma package, versao instalada e Activity de abertura sem executar baixa de entrega.
        </p>
      </section>
    </main>

    <footer class="acoes-fixas acoes-fixas--unica">
      <button id="voltar-integracoes" class="botao-acao botao-acao--secundario">
        VOLTAR
      </button>
    </footer>
  `;
}

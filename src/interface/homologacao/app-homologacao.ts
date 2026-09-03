import { lerCodigosDaFoto } from "../../infraestrutura/scanner/leitor-codigo-foto";
import {
  analisarCodigosEtiqueta,
  resumoIntegracaoDaEtiqueta,
  type AnaliseEtiquetaHomologacao,
  type CodigoEtiquetaAnalisado,
} from "../../aplicacao/homologacao/analisar-etiqueta";
import { escaparHtml } from "../componentes/html";

type TelaHomologacao =
  | "INICIO"
  | "CARGA"
  | "SCAN"
  | "RESULTADO_SCAN"
  | "PACOTE"
  | "EVIDENCIAS"
  | "RECEBEDOR"
  | "FINALIZAR"
  | "CONCLUIDO";

interface PacoteDemo {
  tracking: string;
  transportadora: string;
  regiao: string;
  origem: "DEMO" | "SCAN_REAL";
}

const PACOTES_DEMO: PacoteDemo[] = [
  { tracking: "999881790335907", transportadora: "J&T Express", regiao: "Ceilandia", origem: "DEMO" },
  { tracking: "888002420473763", transportadora: "J&T Express", regiao: "Taguatinga", origem: "DEMO" },
  { tracking: "AJ260818113988201", transportadora: "Anjun", regiao: "Samambaia", origem: "DEMO" },
  { tracking: "3320094881787", transportadora: "iMile", regiao: "Aguas Claras", origem: "DEMO" },
  { tracking: "6082326468665", transportadora: "iMile", regiao: "Ceilandia", origem: "DEMO" },
];

export class AplicacaoHomologacao {
  private tela: TelaHomologacao = "INICIO";
  private analiseAtual: AnaliseEtiquetaHomologacao | null = null;
  private pacoteAtual: PacoteDemo | null = null;
  private fotosEvidencia = 0;
  private recebedor = "";
  private resultadoMensagem = "";

  constructor(private readonly raiz: HTMLElement) {}

  iniciar(): void {
    this.renderizar();
  }

  private cabecalho(titulo: string, subtitulo: string): string {
    return `
      <header class="cabecalho-fixo">
        <div class="marca">
          <span class="marca__sinal" aria-hidden="true"></span>
          <div>
            <strong>${escaparHtml(titulo)}</strong>
            <span>${escaparHtml(subtitulo)}</span>
          </div>
        </div>
        <span class="status-local status-homologacao"><i></i> TESTE</span>
      </header>
    `;
  }

  private avisoSeguro(): string {
    return `
      <div class="homologacao-aviso">
        <strong>MODO HOMOLOGACAO</strong>
        <span>
          Nenhuma baixa e enviada para J&T, Anjun ou iMile. Fotos e dados desta simulacao
          ficam apenas no aparelho durante o teste.
        </span>
      </div>
    `;
  }

  private renderizar(): void {
    if (this.tela === "INICIO") return this.renderizarInicio();
    if (this.tela === "CARGA") return this.renderizarCarga();
    if (this.tela === "SCAN") return this.renderizarScanner();
    if (this.tela === "RESULTADO_SCAN") return this.renderizarResultadoScanner();
    if (this.tela === "PACOTE") return this.renderizarPacote();
    if (this.tela === "EVIDENCIAS") return this.renderizarEvidencias();
    if (this.tela === "RECEBEDOR") return this.renderizarRecebedor();
    if (this.tela === "FINALIZAR") return this.renderizarFinalizar();
    this.renderizarConcluido();
  }

  private ir(tela: TelaHomologacao): void {
    this.tela = tela;
    this.renderizar();
  }

  private renderizarInicio(): void {
    this.raiz.innerHTML = `
      ${this.cabecalho("Delivery Hub", "Homologacao")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}

        <section class="painel-destaque homologacao-hero">
          <span class="sobrelinha">AVALIACAO DO PRODUTO</span>
          <h1>Teste o fluxo como entregador.</h1>
          <p>
            Explore a carga demonstrativa ou fotografe uma etiqueta real apenas para
            verificar o que o Delivery Hub consegue reconhecer.
          </p>
        </section>

        <section class="homologacao-acoes">
          <button id="abrir-carga-demo" class="botao-acao botao-acao--primario">
            VER CARGA DE DEMONSTRACAO
          </button>
          <button id="scan-real" class="botao-acao botao-acao--sucesso">
            SCANEAR ETIQUETA REAL
          </button>
        </section>

        <section class="homologacao-checklist">
          <span class="sobrelinha">O QUE AVALIAR</span>
          <div><b>01</b><span>Leitura e tamanho das informacoes</span></div>
          <div><b>02</b><span>Quantidade de toques para concluir uma entrega</span></div>
          <div><b>03</b><span>Scanner e identificacao da etiqueta</span></div>
          <div><b>04</b><span>Botoes para uso rapido na rua</span></div>
        </section>
      </main>
    `;

    document.querySelector("#abrir-carga-demo")?.addEventListener("click", () => this.ir("CARGA"));
    document.querySelector("#scan-real")?.addEventListener("click", () => this.ir("SCAN"));
  }

  private renderizarCarga(): void {
    const regioes = [
      ["Ceilandia", 15],
      ["Taguatinga", 12],
      ["Samambaia", 9],
      ["Aguas Claras", 7],
      ["Outras", 5],
    ];

    this.raiz.innerHTML = `
      ${this.cabecalho("Entregador Demo", "Minha carga")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}

        <section class="resumo-principal">
          <span class="sobrelinha">CARGA DE TESTE</span>
          <strong class="numero-grande">48</strong>
          <span class="legenda-numero">PACOTES PENDENTES</span>
        </section>

        <section class="grade-kpis">
          <div class="kpi kpi--jnt"><span>J&T</span><strong>21</strong></div>
          <div class="kpi kpi--anjun"><span>Anjun</span><strong>13</strong></div>
          <div class="kpi kpi--imile"><span>iMile</span><strong>14</strong></div>
          <div class="kpi"><span>Concluidos</span><strong>0</strong></div>
        </section>

        <div class="titulo-secao">
          <div>
            <span class="sobrelinha">REFERENCIA</span>
            <h2>Por regiao</h2>
          </div>
        </div>

        <section class="lista-pacotes">
          ${regioes.map(([nome, quantidade]) => `
            <div class="pacote-linha">
              <div><strong>${nome}</strong><span>Organizacao visual da carga</span></div>
              <b>${quantidade}</b>
            </div>
          `).join("")}
        </section>
      </main>

      <footer class="acoes-fixas">
        <button id="voltar-inicio" class="botao-acao botao-acao--secundario">VOLTAR</button>
        <button id="scan-carga" class="botao-acao botao-acao--primario">ESCANEAR PACOTE</button>
      </footer>
    `;

    document.querySelector("#voltar-inicio")?.addEventListener("click", () => this.ir("INICIO"));
    document.querySelector("#scan-carga")?.addEventListener("click", () => this.ir("SCAN"));
  }

  private renderizarScanner(mensagem = ""): void {
    this.raiz.innerHTML = `
      ${this.cabecalho("Delivery Hub", "Scanner")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}

        <section class="painel-operacao">
          <span class="sobrelinha">SCAN REAL / SOMENTE LEITURA</span>
          <h1>Fotografe a etiqueta</h1>
          <p>
            Pode usar uma encomenda real proxima. A imagem serve apenas para ler
            barcode/QR e gerar o diagnostico da etiqueta.
          </p>

          <label class="botao-scanner-foto">
            <input
              id="foto-homologacao"
              class="arquivo-escondido"
              type="file"
              accept="image/*"
              capture="environment"
            />
            <span class="botao-scanner-foto__icone">▣</span>
            <strong>ABRIR CAMERA</strong>
            <small>Enquadrar barcode ou QR principal</small>
          </label>

          <div id="status-homologacao" class="status-scanner-foto" aria-live="polite">
            ${escaparHtml(mensagem)}
          </div>

          <div class="separador-scanner"><span>OU</span></div>

          <details class="scanner-manual">
            <summary>DIGITAR / COLAR TRACKING</summary>
            <label class="campo-grande">
              <span>CODIGO</span>
              <input id="codigo-homologacao" autocomplete="off" autocapitalize="characters" />
            </label>
            <button id="analisar-digitado" class="botao-acao botao-acao--secundario botao-largura-total">
              ANALISAR CODIGO
            </button>
          </details>
        </section>
      </main>

      <footer class="acoes-fixas acoes-fixas--unica">
        <button id="voltar-scan" class="botao-acao botao-acao--secundario">VOLTAR</button>
      </footer>
    `;

    document.querySelector("#voltar-scan")?.addEventListener("click", () => this.ir("INICIO"));

    document.querySelector<HTMLInputElement>("#foto-homologacao")?.addEventListener(
      "change",
      async (evento) => {
        const arquivo = (evento.currentTarget as HTMLInputElement).files?.[0];
        if (!arquivo) return;

        const status = document.querySelector<HTMLElement>("#status-homologacao");
        if (status) status.textContent = "LENDO ETIQUETA...";

        try {
          const leitura = await lerCodigosDaFoto(arquivo);
          this.analiseAtual = analisarCodigosEtiqueta(leitura.codigos);
          this.resultadoMensagem = `Leitura por ${leitura.mecanismo}`;
          this.ir("RESULTADO_SCAN");
        } catch (erro) {
          this.renderizarScanner(
            erro instanceof Error ? erro.message : "Falha ao ler a etiqueta.",
          );
        }
      },
    );

    document.querySelector("#analisar-digitado")?.addEventListener("click", () => {
      const codigo =
        document.querySelector<HTMLInputElement>("#codigo-homologacao")?.value ?? "";
      if (!codigo.trim()) return this.renderizarScanner("Informe um codigo.");
      this.analiseAtual = analisarCodigosEtiqueta([codigo]);
      this.resultadoMensagem = "Codigo informado manualmente";
      this.ir("RESULTADO_SCAN");
    });
  }

  private selecionarCodigo(item: CodigoEtiquetaAnalisado): void {
    if (!this.analiseAtual) return;
    this.analiseAtual = {
      ...this.analiseAtual,
      principal: item,
      exigeEscolha: false,
    };
    this.renderizarResultadoScanner();
  }

  private renderizarResultadoScanner(): void {
    const analise = this.analiseAtual;
    if (!analise) return this.ir("SCAN");

    const principal = analise.principal;
    const integracao = principal
      ? resumoIntegracaoDaEtiqueta(principal.transportadora)
      : null;

    this.raiz.innerHTML = `
      ${this.cabecalho("Delivery Hub", "Resultado da etiqueta")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}

        <section class="painel-destaque painel-destaque--compacto">
          <span class="sobrelinha">LEITURA CONCLUIDA</span>
          <h1>${principal ? escaparHtml(principal.normalizado) : "Escolha o tracking"}</h1>
          <p>${escaparHtml(this.resultadoMensagem)}</p>
        </section>

        ${
          analise.aviso
            ? `<div class="mensagem-operacao mensagem-operacao--aviso">${escaparHtml(analise.aviso)}</div>`
            : ""
        }

        <section class="homologacao-resultado">
          ${
            principal
              ? `
                <div class="homologacao-info">
                  <span>TRANSPORTADORA</span>
                  <strong>${escaparHtml(principal.nomeTransportadora)}</strong>
                </div>
                <div class="homologacao-info">
                  <span>CONFIANCA</span>
                  <strong>${escaparHtml(principal.confianca)}</strong>
                </div>
                <div class="homologacao-info">
                  <span>REGRA IDENTIFICADA</span>
                  <strong>${escaparHtml(principal.regraUsada ?? "Sem regra conhecida")}</strong>
                </div>
                <div class="homologacao-info">
                  <span>APP OPERACIONAL CONHECIDO</span>
                  <strong>${escaparHtml(integracao?.packageName ?? "Ainda nao confirmado")}</strong>
                </div>
                <div class="homologacao-info homologacao-info--texto">
                  <span>NIVEL DA INTEGRACAO</span>
                  <strong>${escaparHtml(integracao?.nivel ?? "UNKNOWN")}</strong>
                  <small>${escaparHtml(integracao?.mensagem ?? "")}</small>
                </div>
              `
              : ""
          }

          ${
            analise.codigos.length > 1
              ? `
                <div class="titulo-secao">
                  <div>
                    <span class="sobrelinha">CODIGOS ENCONTRADOS</span>
                    <h2>${analise.codigos.length}</h2>
                  </div>
                </div>
                <div class="lista-pacotes">
                  ${analise.codigos.map((item, indice) => `
                    <button class="pacote-linha homologacao-codigo" data-codigo-indice="${indice}">
                      <div>
                        <strong>${escaparHtml(item.normalizado)}</strong>
                        <span>${escaparHtml(item.nomeTransportadora)}</span>
                      </div>
                      <i class="selo ${item.conhecido ? "selo--ok" : "selo--atencao"}">
                        ${item.conhecido ? "RECONHECIDO" : "REVISAR"}
                      </i>
                    </button>
                  `).join("")}
                </div>
              `
              : ""
          }
        </section>

        <div class="nota-operacao">
          <strong>O que este scan nao faz</strong>
          <span>
            Nao consulta dados pessoais do destinatario, nao descobre endereco pelo
            tracking e nao registra baixa na transportadora. Ele mostra apenas o que
            conseguimos extrair/identificar da etiqueta neste momento.
          </span>
        </div>
      </main>

      <footer class="acoes-fixas">
        <button id="novo-scan" class="botao-acao botao-acao--secundario">NOVA LEITURA</button>
        <button
          id="simular-com-scan"
          class="botao-acao botao-acao--primario"
          ${principal ? "" : "disabled"}
        >
          SIMULAR ENTREGA
        </button>
      </footer>
    `;

    document.querySelector("#novo-scan")?.addEventListener("click", () => this.ir("SCAN"));

    document.querySelectorAll<HTMLButtonElement>("[data-codigo-indice]").forEach(
      (botao) => {
        botao.addEventListener("click", () => {
          const indice = Number(botao.dataset.codigoIndice);
          const item = analise.codigos[indice];
          if (item) this.selecionarCodigo(item);
        });
      },
    );

    document.querySelector("#simular-com-scan")?.addEventListener("click", () => {
      if (!principal) return;
      this.pacoteAtual = {
        tracking: principal.normalizado,
        transportadora: principal.nomeTransportadora,
        regiao: "Nao informada",
        origem: "SCAN_REAL",
      };
      this.ir("PACOTE");
    });
  }

  private renderizarPacote(): void {
    if (!this.pacoteAtual) this.pacoteAtual = PACOTES_DEMO[0];
    const pacote = this.pacoteAtual;

    this.raiz.innerHTML = `
      ${this.cabecalho(pacote.transportadora, "Pacote encontrado")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}
        <section class="painel-destaque">
          <span class="sobrelinha">${pacote.origem === "SCAN_REAL" ? "ETIQUETA REAL / SIMULACAO" : "PACOTE DEMO"}</span>
          <h1>${escaparHtml(pacote.tracking)}</h1>
          <p>
            Transportadora: <strong>${escaparHtml(pacote.transportadora)}</strong><br/>
            Regiao: ${escaparHtml(pacote.regiao)}
          </p>
        </section>

        <section class="homologacao-acoes">
          <button id="iniciar-simulacao" class="botao-acao botao-acao--primario">
            INICIAR ENTREGA
          </button>
        </section>
      </main>

      <footer class="acoes-fixas acoes-fixas--unica">
        <button id="cancelar-pacote" class="botao-acao botao-acao--secundario">VOLTAR</button>
      </footer>
    `;

    document.querySelector("#iniciar-simulacao")?.addEventListener("click", () => this.ir("EVIDENCIAS"));
    document.querySelector("#cancelar-pacote")?.addEventListener("click", () =>
      this.pacoteAtual?.origem === "SCAN_REAL" ? this.ir("RESULTADO_SCAN") : this.ir("CARGA"),
    );
  }

  private renderizarEvidencias(): void {
    const pacote = this.pacoteAtual;
    if (!pacote) return this.ir("CARGA");

    this.raiz.innerHTML = `
      ${this.cabecalho(pacote.transportadora, "Evidencias")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}
        <section class="painel-operacao">
          <span class="sobrelinha">ETAPA 1 DE 3</span>
          <h1>Fotos da entrega</h1>
          <p>Teste como seria registrar a evidencia no momento da entrega.</p>

          <label class="botao-scanner-foto">
            <input id="foto-evidencia-demo" class="arquivo-escondido" type="file" accept="image/*" capture="environment" />
            <span class="botao-scanner-foto__icone">▣</span>
            <strong>FOTOGRAFAR EVIDENCIA</strong>
            <small>Somente simulacao local</small>
          </label>

          <div class="homologacao-contador">
            <span>Fotos registradas nesta simulacao</span>
            <strong>${this.fotosEvidencia}</strong>
          </div>
        </section>
      </main>
      <footer class="acoes-fixas">
        <button id="voltar-pacote" class="botao-acao botao-acao--secundario">VOLTAR</button>
        <button id="seguir-recebedor" class="botao-acao botao-acao--primario">CONTINUAR</button>
      </footer>
    `;

    document.querySelector<HTMLInputElement>("#foto-evidencia-demo")?.addEventListener(
      "change",
      (evento) => {
        const temFoto = Boolean((evento.currentTarget as HTMLInputElement).files?.[0]);
        if (temFoto) {
          this.fotosEvidencia += 1;
          this.renderizarEvidencias();
        }
      },
    );
    document.querySelector("#voltar-pacote")?.addEventListener("click", () => this.ir("PACOTE"));
    document.querySelector("#seguir-recebedor")?.addEventListener("click", () => this.ir("RECEBEDOR"));
  }

  private renderizarRecebedor(): void {
    const opcoes = ["Proprio destinatario", "Portaria", "Familiar", "Vizinho"];

    this.raiz.innerHTML = `
      ${this.cabecalho("Delivery Hub", "Recebedor")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}
        <section class="painel-operacao">
          <span class="sobrelinha">ETAPA 2 DE 3</span>
          <h1>Quem recebeu?</h1>
          <div class="homologacao-recebedores">
            ${opcoes.map((opcao) => `
              <button class="botao-acao botao-acao--secundario" data-recebedor="${escaparHtml(opcao)}">
                ${escaparHtml(opcao).toUpperCase()}
              </button>
            `).join("")}
          </div>
        </section>
      </main>
      <footer class="acoes-fixas acoes-fixas--unica">
        <button id="voltar-evidencias" class="botao-acao botao-acao--secundario">VOLTAR</button>
      </footer>
    `;

    document.querySelector("#voltar-evidencias")?.addEventListener("click", () => this.ir("EVIDENCIAS"));
    document.querySelectorAll<HTMLButtonElement>("[data-recebedor]").forEach((botao) => {
      botao.addEventListener("click", () => {
        this.recebedor = botao.dataset.recebedor ?? "";
        this.ir("FINALIZAR");
      });
    });
  }

  private renderizarFinalizar(): void {
    const pacote = this.pacoteAtual;
    if (!pacote) return this.ir("CARGA");

    this.raiz.innerHTML = `
      ${this.cabecalho(pacote.transportadora, "Confirmacao")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}
        <section class="painel-destaque">
          <span class="sobrelinha">ETAPA 3 DE 3</span>
          <h1>Confirmar simulacao</h1>
          <p>
            Tracking: <strong>${escaparHtml(pacote.tracking)}</strong><br/>
            Recebedor: <strong>${escaparHtml(this.recebedor)}</strong><br/>
            Fotos: <strong>${this.fotosEvidencia}</strong>
          </p>
        </section>
      </main>
      <footer class="acoes-fixas">
        <button id="voltar-recebedor" class="botao-acao botao-acao--secundario">VOLTAR</button>
        <button id="concluir-demo" class="botao-acao botao-acao--sucesso">CONFIRMAR TESTE</button>
      </footer>
    `;

    document.querySelector("#voltar-recebedor")?.addEventListener("click", () => this.ir("RECEBEDOR"));
    document.querySelector("#concluir-demo")?.addEventListener("click", () => this.ir("CONCLUIDO"));
  }

  private renderizarConcluido(): void {
    this.raiz.innerHTML = `
      ${this.cabecalho("Delivery Hub", "Homologacao")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}
        <section class="painel-destaque">
          <span class="sobrelinha">SIMULACAO CONCLUIDA</span>
          <h1>Nenhuma baixa foi enviada.</h1>
          <p>
            O fluxo terminou apenas dentro do modo de homologacao.
            Use o aplicativo para avaliar navegacao, scanner, fotos e quantidade de etapas.
          </p>
        </section>
      </main>
      <footer class="acoes-fixas">
        <button id="nova-simulacao" class="botao-acao botao-acao--secundario">REINICIAR</button>
        <button id="novo-scan-final" class="botao-acao botao-acao--primario">SCANEAR OUTRA</button>
      </footer>
    `;

    document.querySelector("#nova-simulacao")?.addEventListener("click", () => {
      this.pacoteAtual = null;
      this.analiseAtual = null;
      this.fotosEvidencia = 0;
      this.recebedor = "";
      this.ir("INICIO");
    });
    document.querySelector("#novo-scan-final")?.addEventListener("click", () => {
      this.pacoteAtual = null;
      this.fotosEvidencia = 0;
      this.recebedor = "";
      this.ir("SCAN");
    });
  }
}

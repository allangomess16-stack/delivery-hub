import { lerCodigosDaFoto } from "../../infraestrutura/scanner/leitor-codigo-foto";
import {
  iniciarScannerCameraContinuo,
  type ControleScannerCamera,
} from "../../infraestrutura/scanner/scanner-camera-continuo";
import { ConfirmadorLeituraFrames } from "../../aplicacao/homologacao/confirmador-leitura-frames";
import {
  analisarCodigosEtiqueta,
  resumoIntegracaoDaEtiqueta,
  type AnaliseEtiquetaHomologacao,
  type CodigoEtiquetaAnalisado,
} from "../../aplicacao/homologacao/analisar-etiqueta";
import { escaparHtml } from "../componentes/html";
import {
  HomologacaoOutbox,
  type ReferenciaOperacaoHomologacao,
} from "./homologacao-outbox";
import type { IntegracaoTransportadora } from "../../aplicacao/portas/integracao-transportadora";
import { TRACKING_SINTETICO_IMILE } from "../../infraestrutura/integracoes/imile-adapter";

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
  private recebedorNome = "";
  private recebedorDocumento = "";
  private resultadoMensagem = "";
  private scannerAoVivo: ControleScannerCamera | null = null;
  private readonly confirmadorLeitura = new ConfirmadorLeituraFrames(2, 1_800);
  private candidatoScanner: CodigoEtiquetaAnalisado | null = null;
  private analiseCandidata: AnaliseEtiquetaHomologacao | null = null;
  private mecanismoCandidato = "";
  private scannerToken = 0;
  private readonly outboxHomologacao = new HomologacaoOutbox();
  private referenciaOutbox: ReferenciaOperacaoHomologacao | null = null;

  constructor(
    private readonly raiz: HTMLElement,
    private readonly integracaoIMile?: IntegracaoTransportadora,
  ) {}

  async iniciar(): Promise<void> {
    const estado = await this.outboxHomologacao.iniciar();
    if (estado.referenciaPendente) {
      this.referenciaOutbox = estado.referenciaPendente;
      this.tela = "CONCLUIDO";
    }
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
    if (this.tela === "SCAN" && tela !== "SCAN") {
      this.pararScannerAoVivo();
    }
    this.tela = tela;
    this.renderizar();
  }

  private pararScannerAoVivo(): void {
    this.scannerToken += 1;
    this.scannerAoVivo?.parar();
    this.scannerAoVivo = null;
  }

  private atualizarStatusScanner(
    mensagem: string,
    estado: "procurando" | "detectado" | "confirmado" | "erro" = "procurando",
  ): void {
    const status = document.querySelector<HTMLElement>("#status-homologacao");
    const visor = document.querySelector<HTMLElement>("#scanner-visor");
    if (status) {
      status.textContent = mensagem;
      status.dataset.estado = estado;
    }
    if (visor) visor.dataset.estado = estado;
  }

  private atualizarCandidatoScanner(
    candidato: CodigoEtiquetaAnalisado | null,
    analise: AnaliseEtiquetaHomologacao | null,
    mecanismo: string,
  ): void {
    this.candidatoScanner = candidato;
    this.analiseCandidata = analise;
    this.mecanismoCandidato = mecanismo;

    const painel = document.querySelector<HTMLElement>("#scanner-candidato");
    const codigo = document.querySelector<HTMLElement>("#scanner-candidato-codigo");
    const transportadora = document.querySelector<HTMLElement>(
      "#scanner-candidato-transportadora",
    );
    const botao = document.querySelector<HTMLButtonElement>(
      "#scanner-confirmar-primeira",
    );

    if (!painel || !codigo || !transportadora || !botao) return;

    if (!candidato) {
      painel.hidden = true;
      botao.disabled = true;
      return;
    }

    codigo.textContent = candidato.normalizado;
    transportadora.textContent = candidato.conhecido
      ? candidato.nomeTransportadora
      : "Transportadora ainda nao identificada";
    painel.hidden = false;
    botao.disabled = false;
  }

  private confirmarCandidatoScanner(modo: "MANUAL" | "AUTOMATICO"): void {
    const candidato = this.candidatoScanner;
    const analise = this.analiseCandidata;
    if (!candidato || !analise) return;

    this.analiseAtual = {
      ...analise,
      principal: candidato,
      exigeEscolha: false,
    };
    this.resultadoMensagem =
      modo === "MANUAL"
        ? `Scanner ao vivo / ${this.mecanismoCandidato} / confirmado pelo entregador na primeira leitura`
        : `Scanner ao vivo / ${this.mecanismoCandidato} / confirmado automaticamente`;

    this.atualizarStatusScanner(
      `Confirmado: ${candidato.normalizado}`,
      "confirmado",
    );
    navigator.vibrate?.(modo === "MANUAL" ? 60 : 90);
    this.scannerAoVivo?.parar();
    this.scannerAoVivo = null;
    this.ir("RESULTADO_SCAN");
  }

  private async iniciarScannerHomologacao(): Promise<void> {
    this.pararScannerAoVivo();
    this.confirmadorLeitura.limpar();
    this.candidatoScanner = null;
    this.analiseCandidata = null;
    this.mecanismoCandidato = "";

    const token = ++this.scannerToken;
    const video = document.querySelector<HTMLVideoElement>("#scanner-video");
    const botaoLanterna =
      document.querySelector<HTMLButtonElement>("#scanner-lanterna");

    if (!video) return;

    this.atualizarStatusScanner(
      "Preparando camera... Aponte o codigo para dentro da moldura.",
    );

    try {
      const controle = await iniciarScannerCameraContinuo(video, {
        intervaloMs: 140,
        onLeitura: (leitura) => {
          if (token !== this.scannerToken || this.tela !== "SCAN") return;

          const progresso = this.confirmadorLeitura.registrar(leitura.codigos);
          const candidato = progresso.candidato;

          if (candidato) {
            const analiseCandidata: AnaliseEtiquetaHomologacao = progresso.analise
              ? {
                  ...progresso.analise,
                  principal: candidato,
                  exigeEscolha: false,
                }
              : {
                  codigos: [candidato],
                  principal: candidato,
                  exigeEscolha: false,
                };

            const mudou =
              this.candidatoScanner?.normalizado !== candidato.normalizado;
            this.atualizarCandidatoScanner(
              candidato,
              analiseCandidata,
              leitura.mecanismo,
            );

            if (mudou) navigator.vibrate?.(25);
          }

          if (!progresso.confirmado) {
            if (candidato) {
              this.atualizarStatusScanner(
                `Leitura encontrada: ${candidato.normalizado}. Confira abaixo ou mantenha enquadrado para confirmacao automatica.`,
                "detectado",
              );
            } else {
              this.atualizarStatusScanner(
                "Procurando barcode ou QR... aproxime a etiqueta.",
              );
            }
            return;
          }

          if (candidato) {
            this.confirmarCandidatoScanner("AUTOMATICO");
            return;
          }

          if (!progresso.analise) return;

          this.analiseAtual = progresso.analise;
          this.resultadoMensagem =
            `Scanner ao vivo / ${leitura.mecanismo} / varios codigos confirmados`;
          this.atualizarStatusScanner(
            "Mais de um tracking foi lido. Selecione o codigo principal.",
            "confirmado",
          );
          navigator.vibrate?.(90);
          this.scannerAoVivo?.parar();
          this.scannerAoVivo = null;

          window.setTimeout(() => {
            if (token === this.scannerToken && this.tela === "SCAN") {
              this.ir("RESULTADO_SCAN");
            }
          }, 120);
        },
        onErro: (erro) => {
          if (token !== this.scannerToken || this.tela !== "SCAN") return;
          this.atualizarStatusScanner(erro.message, "erro");
        },
      });

      if (token !== this.scannerToken || this.tela !== "SCAN") {
        controle.parar();
        return;
      }

      this.scannerAoVivo = controle;
      if (botaoLanterna) {
        botaoLanterna.disabled = !controle.possuiLanterna();
        botaoLanterna.title = controle.possuiLanterna()
          ? "Ligar ou desligar a lanterna"
          : "Lanterna nao disponivel nesta camera";
      }
      this.atualizarStatusScanner(
        "Scanner ativo. A primeira leitura ja aparecera abaixo para conferencia.",
      );
    } catch (erro) {
      if (token !== this.scannerToken || this.tela !== "SCAN") return;
      this.atualizarStatusScanner(
        erro instanceof Error ? erro.message : "Falha ao iniciar a camera.",
        "erro",
      );
    }
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
          <button id="testar-imile" class="botao-acao">
            TESTAR NAVEGACAO IMILE
          </button>
          <p id="resultado-imile" role="status" aria-live="polite"></p>
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
    document.querySelector("#testar-imile")?.addEventListener("click", async () => {
      // Este fluxo nunca envia tracking real durante a homologacao, inclusive pela rede local.
      const saida = document.querySelector<HTMLElement>("#resultado-imile");
      if (!this.integracaoIMile) {
        if (saida) saida.textContent = "Integracao iMile indisponivel nesta plataforma.";
        return;
      }

      if (saida) saida.textContent = "Verificando iMile instalada...";
      const resultado = await this.integracaoIMile.abrirPesquisaPorTracking({
        tracking: TRACKING_SINTETICO_IMILE,
        modo: "HOMOLOGACAO",
      });
      if (saida) saida.textContent = resultado.mensagem;
    });
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
      ${this.cabecalho("Delivery Hub", "Scanner ao vivo")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}

        <section class="painel-operacao">
          <span class="sobrelinha">SCAN REAL / SOMENTE LEITURA</span>
          <h1>Aponte para a etiqueta</h1>
          <p>
            Nao precisa tirar foto. Assim que houver a primeira leitura, tracking e
            transportadora aparecem abaixo. Voce pode confirmar na hora ou aguardar
            uma segunda leitura rapida para confirmacao automatica.
          </p>

          <div id="scanner-visor" class="scanner-ao-vivo" data-estado="procurando">
            <video
              id="scanner-video"
              class="scanner-ao-vivo__video"
              autoplay
              muted
              playsinline
            ></video>
            <div class="scanner-ao-vivo__mascara" aria-hidden="true">
              <div class="scanner-ao-vivo__moldura">
                <span></span><span></span><span></span><span></span>
                <i></i>
              </div>
            </div>
          </div>

          <div id="status-homologacao" class="status-scanner-foto" data-estado="procurando" aria-live="polite">
            ${escaparHtml(mensagem || "Preparando camera...")}
          </div>

          <section id="scanner-candidato" class="scanner-candidato" hidden aria-live="polite">
            <span class="sobrelinha">PRIMEIRA LEITURA</span>
            <strong id="scanner-candidato-codigo">--</strong>
            <span id="scanner-candidato-transportadora">--</span>
            <button id="scanner-confirmar-primeira" class="botao-acao botao-acao--sucesso botao-largura-total" disabled>
              CONFIRMAR E CONTINUAR
            </button>
            <small>Se estiver correto, nao e necessario esperar a segunda leitura.</small>
          </section>

          <div class="scanner-ao-vivo__controles">
            <button id="scanner-lanterna" class="botao-acao botao-acao--secundario" disabled>
              LANTERNA
            </button>
            <button id="scanner-reiniciar" class="botao-acao botao-acao--secundario">
              REINICIAR CAMERA
            </button>
          </div>

          <div class="separador-scanner"><span>FALLBACK</span></div>

          <details class="scanner-manual">
            <summary>FOTOGRAFAR ETIQUETA</summary>
            <label class="botao-scanner-foto botao-scanner-foto--compacto">
              <input
                id="foto-homologacao"
                class="arquivo-escondido"
                type="file"
                accept="image/*"
                capture="environment"
              />
              <span class="botao-scanner-foto__icone">▣</span>
              <strong>TIRAR FOTO E TENTAR LEITURA</strong>
              <small>Use apenas se o scanner continuo nao conseguir</small>
            </label>
          </details>

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

    document.querySelector("#scanner-reiniciar")?.addEventListener("click", () => {
      void this.iniciarScannerHomologacao();
    });

    document.querySelector("#scanner-confirmar-primeira")?.addEventListener(
      "click",
      () => this.confirmarCandidatoScanner("MANUAL"),
    );

    document.querySelector("#scanner-lanterna")?.addEventListener("click", async () => {
      if (!this.scannerAoVivo) return;
      const ligada = await this.scannerAoVivo.alternarLanterna();
      const botao = document.querySelector<HTMLButtonElement>("#scanner-lanterna");
      if (botao) botao.textContent = ligada ? "DESLIGAR LANTERNA" : "LANTERNA";
    });

    document.querySelector<HTMLInputElement>("#foto-homologacao")?.addEventListener(
      "change",
      async (evento) => {
        const arquivo = (evento.currentTarget as HTMLInputElement).files?.[0];
        if (!arquivo) return;

        this.atualizarStatusScanner("Lendo foto de fallback...", "detectado");

        try {
          const leitura = await lerCodigosDaFoto(arquivo);
          this.analiseAtual = analisarCodigosEtiqueta(leitura.codigos);
          this.resultadoMensagem = `Foto de fallback / ${leitura.mecanismo}`;
          this.ir("RESULTADO_SCAN");
        } catch (erro) {
          this.atualizarStatusScanner(
            erro instanceof Error ? erro.message : "Falha ao ler a etiqueta.",
            "erro",
          );
        }
      },
    );

    document.querySelector("#analisar-digitado")?.addEventListener("click", () => {
      const codigo =
        document.querySelector<HTMLInputElement>("#codigo-homologacao")?.value ?? "";
      if (!codigo.trim()) {
        this.atualizarStatusScanner("Informe um codigo.", "erro");
        return;
      }
      this.analiseAtual = analisarCodigosEtiqueta([codigo]);
      this.resultadoMensagem = "Codigo informado manualmente";
      this.ir("RESULTADO_SCAN");
    });

    void this.iniciarScannerHomologacao();
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
    const opcoes = ["Proprio destinatario", "Portaria", "Familiar", "Vizinho", "Outro"];

    this.raiz.innerHTML = `
      ${this.cabecalho("Delivery Hub", "Recebedor")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}
        <section class="painel-operacao">
          <span class="sobrelinha">ETAPA 2 DE 3</span>
          <h1>Quem recebeu?</h1>
          <p>Escolha o tipo. Nome e CPF/documento podem ser preenchidos se forem necessarios, mas nao bloqueiam a entrega.</p>
          <div class="homologacao-recebedores">
            ${opcoes.map((opcao) => `
              <button
                class="botao-acao botao-acao--secundario"
                data-recebedor="${escaparHtml(opcao)}"
                data-selecionado="${this.recebedor === opcao ? "true" : "false"}"
              >
                ${escaparHtml(opcao).toUpperCase()}
              </button>
            `).join("")}
          </div>

          <div id="dados-recebedor-opcionais" class="dados-recebedor-opcionais" ${this.recebedor ? "" : "hidden"}>
            <label class="campo-grande">
              <span>NOME (OPCIONAL)</span>
              <input id="homologacao-recebedor-nome" value="${escaparHtml(this.recebedorNome)}" autocomplete="off" placeholder="Nome de quem recebeu" />
            </label>

            <label class="campo-grande">
              <span>CPF / DOCUMENTO (OPCIONAL)</span>
              <input id="homologacao-recebedor-documento" value="${escaparHtml(this.recebedorDocumento)}" autocomplete="off" inputmode="numeric" placeholder="Pode deixar em branco" />
            </label>

            <div class="mensagem-operacao">Esses dados sao opcionais nesta etapa e podem ficar vazios.</div>
          </div>
        </section>
      </main>
      <footer class="acoes-fixas">
        <button id="voltar-evidencias" class="botao-acao botao-acao--secundario">VOLTAR</button>
        <button id="seguir-finalizar" class="botao-acao botao-acao--primario" ${this.recebedor ? "" : "disabled"}>CONTINUAR</button>
      </footer>
    `;

    const dados = document.querySelector<HTMLElement>("#dados-recebedor-opcionais");
    const botaoContinuar = document.querySelector<HTMLButtonElement>("#seguir-finalizar");
    const inputNome = document.querySelector<HTMLInputElement>("#homologacao-recebedor-nome");
    const inputDocumento = document.querySelector<HTMLInputElement>("#homologacao-recebedor-documento");

    document.querySelector("#voltar-evidencias")?.addEventListener("click", () => this.ir("EVIDENCIAS"));
    document.querySelectorAll<HTMLButtonElement>("[data-recebedor]").forEach((botao) => {
      botao.addEventListener("click", () => {
        this.recebedor = botao.dataset.recebedor ?? "";
        document.querySelectorAll<HTMLButtonElement>("[data-recebedor]").forEach((item) => {
          item.dataset.selecionado = String(item === botao);
        });
        if (dados) dados.hidden = false;
        if (botaoContinuar) botaoContinuar.disabled = !this.recebedor;
      });
    });

    inputNome?.addEventListener("input", () => {
      this.recebedorNome = inputNome.value.trim();
    });
    inputDocumento?.addEventListener("input", () => {
      this.recebedorDocumento = inputDocumento.value.trim();
    });
    botaoContinuar?.addEventListener("click", () => {
      if (!this.recebedor) return;
      this.ir("FINALIZAR");
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
            Nome: <strong>${escaparHtml(this.recebedorNome || "Nao informado")}</strong><br/>
            CPF/documento: <strong>${escaparHtml(this.recebedorDocumento || "Nao informado")}</strong><br/>
            Fotos: <strong>${this.fotosEvidencia}</strong>
          </p>
        </section>

        <section class="painel-operacao">
          <span class="sobrelinha">TESTE CONTROLADO DA OUTBOX</span>
          <div class="homologacao-info homologacao-info--texto">
            <span>REDE DE TESTE</span>
            <strong id="hom-rede-finalizar">
              ${this.outboxHomologacao.estaOfflineSimulado() ? "OFFLINE SIMULADO" : "ONLINE SIMULADO"}
            </strong>
            <small>
              Este controle e independente do modo aviao e existe somente nesta versao de homologacao.
            </small>
          </div>
          <button id="hom-alternar-rede-finalizar" class="botao-acao botao-acao--secundario botao-largura-total">
            ${this.outboxHomologacao.estaOfflineSimulado() ? "REATIVAR REDE SIMULADA" : "SIMULAR SEM REDE"}
          </button>
          <div class="nota-operacao">
            <strong>Teste offline correto</strong>
            <span>
              Toque em SIMULAR SEM REDE antes de confirmar. A operacao deve ficar na fila mesmo fechando o aplicativo.
            </span>
          </div>
        </section>
      </main>
      <footer class="acoes-fixas">
        <button id="voltar-recebedor" class="botao-acao botao-acao--secundario">VOLTAR</button>
        <button id="concluir-demo" class="botao-acao botao-acao--sucesso">CONFIRMAR TESTE</button>
      </footer>
    `;

    document.querySelector("#voltar-recebedor")?.addEventListener("click", () => this.ir("RECEBEDOR"));
    document.querySelector("#hom-alternar-rede-finalizar")?.addEventListener("click", async () => {
      await this.outboxHomologacao.definirOfflineSimulado(
        !this.outboxHomologacao.estaOfflineSimulado(),
      );
      this.renderizarFinalizar();
    });
    document.querySelector("#concluir-demo")?.addEventListener("click", async () => {
      const botao = document.querySelector<HTMLButtonElement>("#concluir-demo");
      if (botao) botao.disabled = true;
      try {
        this.referenciaOutbox = await this.outboxHomologacao.concluir({
          tracking: pacote.tracking,
          transportadora: pacote.transportadora,
          recebedor: this.recebedor,
          nome: this.recebedorNome || undefined,
          documento: this.recebedorDocumento || undefined,
        });
        this.ir("CONCLUIDO");
      } catch (erro) {
        if (botao) botao.disabled = false;
        alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar a operacao offline.");
      }
    });
  }

  private renderizarConcluido(): void {
    const offlineSimulado = this.outboxHomologacao.estaOfflineSimulado();
    this.raiz.innerHTML = `
      ${this.cabecalho("Delivery Hub", "Homologacao V0.4.6.1")}
      <main class="conteudo conteudo--com-rodape">
        ${this.avisoSeguro()}
        <section class="painel-destaque">
          <span class="sobrelinha">ENTREGA FISICA CONCLUIDA</span>
          <h1>Salva primeiro no aparelho.</h1>
          <p>
            A conclusao fisica e a situacao sistemica agora sao estados independentes.
            Nenhuma baixa real e enviada para J&T, Anjun ou iMile neste modo.
          </p>
        </section>

        <section class="painel-operacao">
          <span class="sobrelinha">OUTBOX / TESTE OFFLINE</span>
          <div class="homologacao-info">
            <span>ENTREGA FISICA</span>
            <strong id="hom-status-fisico">ENTREGUE</strong>
          </div>
          <div class="homologacao-info homologacao-info--texto">
            <span>ESTADO SISTEMICO</span>
            <strong id="hom-status-integracao">CARREGANDO...</strong>
            <small id="hom-status-integracao-detalhe">Consultando a fila local.</small>
          </div>
          <div class="homologacao-info">
            <span>OPERACOES NA FILA</span>
            <strong id="hom-status-fila">--</strong>
          </div>
          <div class="homologacao-info homologacao-info--texto">
            <span>REDE DE TESTE</span>
            <strong id="hom-status-rede">${offlineSimulado ? "OFFLINE SIMULADO" : "ONLINE SIMULADO"}</strong>
            <small>${offlineSimulado ? "A sincronizacao esta bloqueada de forma deterministica." : "A sincronizacao local esta liberada."}</small>
          </div>
          <div class="homologacao-info homologacao-info--texto">
            <span>UUID IDEMPOTENTE</span>
            <strong id="hom-status-uuid">--</strong>
            <small>O mesmo UUID e reutilizado em qualquer nova tentativa desta operacao.</small>
          </div>

          <div class="nota-operacao">
            <strong>Como validar offline</strong>
            <span>
              Use SIMULAR SEM REDE antes da confirmacao. Verifique FILA 1, feche e
              abra o app e confirme o mesmo UUID. Depois reative a rede simulada:
              a fila deve chegar a 0 sem duplicar a operacao.
            </span>
          </div>

          ${offlineSimulado ? `
            <button id="hom-reativar-rede" class="botao-acao botao-acao--sucesso botao-largura-total">
              REATIVAR REDE E SINCRONIZAR
            </button>
          ` : ""}

          <button id="hom-sincronizar-agora" class="botao-acao botao-acao--primario botao-largura-total">
            SINCRONIZAR AGORA
          </button>
        </section>
      </main>
      <footer class="acoes-fixas">
        <button id="nova-simulacao" class="botao-acao botao-acao--secundario">REINICIAR</button>
        <button id="novo-scan-final" class="botao-acao botao-acao--primario">SCANEAR OUTRA</button>
      </footer>
    `;

    document.querySelector("#hom-sincronizar-agora")?.addEventListener("click", async () => {
      await this.outboxHomologacao.sincronizarAgora();
      await this.atualizarEstadoOutboxHomologacao();
    });

    document.querySelector("#hom-reativar-rede")?.addEventListener("click", async () => {
      await this.outboxHomologacao.restaurarModoOnline();
      await this.outboxHomologacao.sincronizarAgora();
      this.renderizarConcluido();
    });

    document.querySelector("#nova-simulacao")?.addEventListener("click", async () => {
      await this.outboxHomologacao.restaurarModoOnline();
      this.pacoteAtual = null;
      this.analiseAtual = null;
      this.fotosEvidencia = 0;
      this.recebedor = "";
      this.recebedorNome = "";
      this.recebedorDocumento = "";
      this.referenciaOutbox = null;
      this.ir("INICIO");
    });
    document.querySelector("#novo-scan-final")?.addEventListener("click", async () => {
      await this.outboxHomologacao.restaurarModoOnline();
      this.pacoteAtual = null;
      this.fotosEvidencia = 0;
      this.recebedor = "";
      this.recebedorNome = "";
      this.recebedorDocumento = "";
      this.referenciaOutbox = null;
      this.ir("SCAN");
    });

    void this.atualizarEstadoOutboxHomologacao();
    window.setTimeout(() => {
      if (this.tela === "CONCLUIDO") void this.atualizarEstadoOutboxHomologacao();
    }, 1_200);
  }

  private async atualizarEstadoOutboxHomologacao(): Promise<void> {
    if (!this.referenciaOutbox || this.tela !== "CONCLUIDO") return;
    const estado = await this.outboxHomologacao.obterEstado(this.referenciaOutbox);
    if (!estado || this.tela !== "CONCLUIDO") return;

    const fisico = document.querySelector<HTMLElement>("#hom-status-fisico");
    const integracao = document.querySelector<HTMLElement>("#hom-status-integracao");
    const detalhe = document.querySelector<HTMLElement>("#hom-status-integracao-detalhe");
    const fila = document.querySelector<HTMLElement>("#hom-status-fila");
    const uuid = document.querySelector<HTMLElement>("#hom-status-uuid");

    if (fisico) fisico.textContent = estado.estadoFisico;
    if (fila) fila.textContent = String(estado.fila);
    if (uuid) uuid.textContent = estado.operacaoId ?? "--";

    if (!integracao || !detalhe) return;
    integracao.textContent = estado.estadoIntegracao.replaceAll("_", " ");

    if (estado.estadoIntegracao === "AGUARDANDO_SINCRONIZACAO") {
      detalhe.textContent = this.outboxHomologacao.estaOfflineSimulado()
        ? "Offline simulado. A operacao continua protegida no aparelho."
        : "A operacao esta no aparelho e sera reenviada automaticamente.";
    } else if (estado.estadoIntegracao === "SINCRONIZANDO") {
      detalhe.textContent = "Tentando enviar a operacao idempotente agora.";
    } else if (estado.estadoIntegracao === "AGUARDANDO_INTEGRACAO") {
      detalhe.textContent = "SIMULACAO: recebida pelo Hub. A transportadora ainda NAO confirmou a baixa.";
    } else if (estado.estadoIntegracao === "CONFIRMADA") {
      detalhe.textContent = "Baixa confirmada na transportadora.";
    } else if (estado.estadoIntegracao === "ERRO" || estado.estadoIntegracao === "ACAO_MANUAL") {
      detalhe.textContent = estado.ultimoErro ?? "A operacao precisa de atencao.";
    } else {
      detalhe.textContent = "A operacao ainda nao iniciou sincronizacao.";
    }
  }
}

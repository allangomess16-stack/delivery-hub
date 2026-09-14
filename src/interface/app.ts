import type { DependenciasAplicacao } from "../configuracao/dependencias";
import type { CargaEntregador, CargaImportada, PacoteDaCarga } from "../dominio/carga/tipos";
import type { ContaAcessoEntregador, PerfilEntregador, UsuarioAtual } from "../dominio/identidade/tipos";
import { ConciliadorPerfisPlanilha } from "../aplicacao/identidade/conciliar-perfis-planilha";
import { ControladorAdminCargas } from "./controladores/controlador-admin-cargas";
import { ControladorFluxoEntrega } from "./controladores/controlador-fluxo-entrega";
import { EstadoUiSessao } from "./nucleo/estado-ui";
import { delegarEvento, selecionar, selecionarTodos } from "./nucleo/dom";
import { criarPerfilEntregador } from "../aplicacao/identidade/criar-perfil-entregador";
import { normalizarNomeExcel } from "../aplicacao/identidade/normalizar-nome-excel";
import { salvarPerfilComAcesso } from "../aplicacao/identidade/salvar-perfil-com-acesso";
import { listarPerfisSemContaAtiva } from "../aplicacao/identidade/validar-acesso-perfis";
import { particionarCargaPorPerfil } from "../aplicacao/carga/particionar-carga-por-perfil";
import { consolidarCargasImportadas } from "../aplicacao/carga/consolidar-cargas-importadas";
import { ignorarColunaImportacao } from "../aplicacao/importacao/ignorar-coluna-importacao";
import { resolverTelaInicial } from "../aplicacao/navegacao/resolver-tela-inicial";
import {
  resolverCodigosScannerUniversal,
  resolverScannerUniversal,
  resolverTransportadoraManual,
} from "../aplicacao/scanner/resolver-scanner-universal";
import { normalizarCodigo } from "../aplicacao/normalizar-codigo";
import { telaLogin } from "./telas/tela-login";
import { telaAdminImportar } from "./telas/tela-admin-importar";
import { telaAdminConciliacao } from "./telas/tela-admin-conciliacao";
import { telaAdminDistribuicao } from "./telas/tela-admin-distribuicao";
import { telaAdminPerfis } from "./telas/tela-admin-perfis";
import { telaAdminPerfilForm } from "./telas/tela-admin-perfil-form";
import { telaEntregador } from "./telas/tela-entregador";
import { telaSemCarga } from "./telas/tela-sem-carga";
import { telaPerfilSemVinculo } from "./telas/tela-perfil-sem-vinculo";
import { telaScanner } from "./telas/tela-scanner";
import { lerCodigosDaFoto } from "../infraestrutura/scanner/leitor-codigo-foto";
import { telaResultadoScannerUniversal } from "./telas/tela-resultado-scanner-universal";
import { telaAdminIntegracoes } from "./telas/tela-admin-integracoes";
import { telaEntregadorRegiao } from "./telas/tela-entregador-regiao";
import {
  iniciarScannerCameraContinuo,
  type ControleScannerCamera,
} from "../infraestrutura/scanner/scanner-camera-continuo";
import { CODIGOS_ERRO } from "../dominio/diagnostico/codigos-erro";
import { telaSuporteIntegracoes } from "./telas/tela-suporte-integracoes";
import type { RegistroTelemetriaIntegracao } from "../aplicacao/portas/repositorio-telemetria-integracao";
import type { ContratoIntegracaoEfetivo } from "../dominio/integracao/contrato-integracao";
import {
  POLITICA_IMILE_2_3_21,
  PROTOCOLO_IMILE_REQUEST_CODE_V1,
} from "../configuracao/contratos-integracao/imile-2-3-18";
import type { ResultadoScannerUniversal } from "../dominio/scanner/tipos";
import { obterDataLocalIso } from "../aplicacao/tempo/data-local";
import { materializarPacoteScannerLivre } from "../aplicacao/scanner/materializar-pacote-scanner-livre";
import { encontrarCargaAtual } from "../aplicacao/carga/encontrar-carga-atual";
import { resumirHomeEntregador } from "../aplicacao/home/resumir-home-entregador";
import { telaHome } from "./telas/tela-home";
import { telaSelecaoTransportadoraManual } from "./telas/tela-selecao-transportadora-manual";
import type { IdTransportadora } from "../dominio/transportadora/tipos";

const conciliador = new ConciliadorPerfisPlanilha();


export class AplicacaoDeliveryHub {
  private usuarioAtual: UsuarioAtual | null = null;
  private importacaoAdmin: CargaImportada | null = null;
  private cargaEntregador: CargaEntregador | null = null;
  private cargasEntregador: CargaEntregador[] = [];
  private compartilhamentoAtivo = false;
  private readonly estadoUi = new EstadoUiSessao();
  private readonly controladorAdminCargas: ControladorAdminCargas;
  private controladorFluxoEntrega: ControladorFluxoEntrega | null = null;
  private pararSincronizacaoAutomatica: (() => void) | null = null;
  private pararAtualizacoesRemotas: (() => void) | null = null;
  private timerAtualizacaoRemota: number | null = null;
  private scannerAoVivo: ControleScannerCamera | null = null;
  private scannerToken = 0;
  private candidatoScanner: ResultadoScannerUniversal | null = null;
  private leiturasScanner = new Map<string, { leitura: ResultadoScannerUniversal; quantidade: number; em: number }>();
  private leiturasScannerDesconhecidas = new Map<string, { quantidade: number; em: number }>();
  private operacoesScannerHoje: import("../dominio/scanner/tipos").RegistroOperacaoScanner[] = [];

  constructor(
    private readonly raiz: HTMLElement,
    private readonly dependencias: DependenciasAplicacao,
  ) {
    this.controladorAdminCargas = new ControladorAdminCargas(
      raiz,
      dependencias,
      this.estadoUi,
      { voltarInicio: () => this.renderizarAdminImportar() },
    );
  }

  async iniciar() {
    await this.dependencias.prepararInfraestrutura();
    this.compartilhamentoAtivo = await this.dependencias.dadosCompartilhadosAtivos();
    await this.dependencias.prepararDadosDemonstracao();
    this.usuarioAtual = await this.dependencias.autenticacao.obterUsuarioAtual();
    this.ajustarSincronizacaoAutomatica();
    await this.ajustarAtualizacoesRemotas();
    await this.rotear();
  }

  /** Chamado pelo Android. Prioriza uma volta segura e só pede saída no Lobby. */
  voltarNativo(): void {
    if (this.controladorFluxoEntrega) {
      this.controladorFluxoEntrega.voltar();
      return;
    }
    if (selecionar(this.raiz, "#scanner-video") || selecionar(this.raiz, "#voltar-scanner-manual")) {
      this.pararScannerAoVivo();
      void this.carregarHomeEntregador();
      return;
    }
    if (selecionar(this.raiz, "#proxima-leitura-universal")) {
      this.renderizarScanner();
      return;
    }
    if (selecionar(this.raiz, "#voltar-regioes-entregador")) {
      this.renderizarEntregador();
      return;
    }
    if (this.usuarioAtual?.tipo === "ENTREGADOR" && confirm("Deseja sair do Delivery Hub?")) {
      void import("../infraestrutura/android/ponte-nativa-capacitor").then(({ sairDoAplicativoNativo }) => sairDoAplicativoNativo());
    }
  }

  private ajustarSincronizacaoAutomatica(): void {
    this.pararSincronizacaoAutomatica?.();
    this.pararSincronizacaoAutomatica = null;

    const entregadorId = this.usuarioAtual?.entregadorId;
    if (!entregadorId) return;

    this.pararSincronizacaoAutomatica =
      this.dependencias.iniciarSincronizacaoAutomatica(entregadorId);
  }

  private async ajustarAtualizacoesRemotas(): Promise<void> {
    this.pararAtualizacoesRemotas?.();
    this.pararAtualizacoesRemotas = null;
    if (!this.usuarioAtual) return;

    // O entregador usa somente operacoes HTTP curtas. Isso impede que cada
    // aparelho ocupe uma das 100 conexoes persistentes do plano Spark.
    // Cargas novas sao buscadas ao abrir/atualizar o resumo; o Admin continua
    // com assinaturas em tempo real para acompanhar a operacao.
    if (this.usuarioAtual.tipo !== "ADMIN") return;

    const entregadorIds = (await this.dependencias.repositorioPerfis.listar()).map(
      (perfil) => perfil.entregadorId,
    );

    this.pararAtualizacoesRemotas = this.dependencias.observadorDadosRemotos.assinar(
      entregadorIds,
      () => this.agendarAtualizacaoRemotaSegura(),
    );
  }

  private agendarAtualizacaoRemotaSegura(): void {
    if (this.timerAtualizacaoRemota !== null) {
      window.clearTimeout(this.timerAtualizacaoRemota);
    }

    // Agrupa cargas + operacoes que normalmente chegam em sequencia. A tela de
    // scanner ou um formulario nunca e interrompido por uma renderizacao remota.
    this.timerAtualizacaoRemota = window.setTimeout(() => {
      this.timerAtualizacaoRemota = null;
      if (this.usuarioAtual?.tipo === "ADMIN" && selecionar(this.raiz, "#lista-cargas-admin")) {
        void this.controladorAdminCargas.mostrarLista();
        return;
      }
      if (this.usuarioAtual?.tipo === "ENTREGADOR" && selecionar(this.raiz, "#atualizar-carga")) {
        void this.carregarCargaEntregador();
        return;
      }

      const status = selecionar<HTMLElement>(this.raiz, "#status-sincronizacao");
      if (status) status.textContent = "Atualizacao recebida. Os dados serao aplicados ao voltar para o resumo.";
    }, 350);
  }

  private async rotear() {
    const destino = resolverTelaInicial(this.usuarioAtual);
    if (destino === "LOGIN") return this.renderizarLogin();
    if (destino === "ADMIN_IMPORTAR") return this.renderizarAdminImportar();
    if (destino === "SUPORTE_INTEGRACOES") return this.renderizarSuporteIntegracoes();
    if (destino === "PERFIL_SEM_VINCULO") return this.renderizarPerfilSemVinculo();
    return this.carregarHomeEntregador();
  }

  private renderizarLogin(mensagem = "") {
    this.raiz.innerHTML = telaLogin(mensagem);
    const form = document.querySelector<HTMLFormElement>("#form-login");
    form?.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const email = document.querySelector<HTMLInputElement>("#login-email")?.value ?? "";
      const senha = document.querySelector<HTMLInputElement>("#login-senha")?.value ?? "";
      try {
        this.usuarioAtual = await this.dependencias.autenticacao.entrar(email, senha);
        this.ajustarSincronizacaoAutomatica();
        await this.ajustarAtualizacoesRemotas();
        await this.rotear();
      } catch (erro) {
        this.renderizarLogin(erro instanceof Error ? erro.message : "Falha ao entrar.");
      }
    });
  }

  private async renderizarSuporteIntegracoes(
    dia = new Date().toISOString().slice(0, 10),
    mensagemInicial = "",
  ): Promise<void> {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "SUPORTE") return;
    let mensagem = mensagemInicial;
    let registros: RegistroTelemetriaIntegracao[] = [];
    let contrato: ContratoIntegracaoEfetivo | null = null;
    try {
      [registros, contrato] = await Promise.all([
        this.dependencias.repositorioTelemetriaIntegracao.listarDia(dia),
        this.dependencias.repositorioContratosIntegracao.resolver({
          transportadora: "IMILE",
          packageName: "com.imile.redelivery",
          versionCode: "461",
        }),
      ]);
    } catch {
      mensagem = "Nao foi possivel atualizar agora. Tente novamente.";
    }
    this.raiz.innerHTML = telaSuporteIntegracoes(
      this.usuarioAtual,
      dia,
      registros,
      contrato,
      mensagem,
    );
    this.ligarSair();
    selecionar(this.raiz, "#atualizar-suporte")?.addEventListener("click", () => {
      const selecionado = selecionar<HTMLInputElement>(this.raiz, "#dia-suporte")?.value;
      void this.renderizarSuporteIntegracoes(selecionado || dia);
    });
    selecionar(this.raiz, "#ativar-deeplink")?.addEventListener("click", async () => {
      try {
        await this.dependencias.repositorioContratosIntegracao.definir({
          ...POLITICA_IMILE_2_3_21,
          protocoloId: PROTOCOLO_IMILE_REQUEST_CODE_V1,
          versaoContrato: (contrato?.versaoContrato ?? 0) + 1,
          habilitado: true,
          modo: "DEEPLINK",
          atualizadoEm: new Date().toISOString(),
          motivo: "Deep Link ativado pelo suporte.",
        });
        await this.renderizarSuporteIntegracoes(dia);
      } catch {
        await this.renderizarSuporteIntegracoes(
          dia,
          "Nao foi possivel ativar o Deep Link.",
        );
      }
    });
    selecionar(this.raiz, "#ativar-fallback")?.addEventListener("click", async () => {
      try {
        await this.dependencias.repositorioContratosIntegracao.definir({
          ...POLITICA_IMILE_2_3_21,
          protocoloId: null,
          versaoContrato: (contrato?.versaoContrato ?? 0) + 1,
          habilitado: false,
          modo: "CLIPBOARD_APP",
          atualizadoEm: new Date().toISOString(),
          motivo: "Fallback ativado pelo suporte.",
        });
        await this.renderizarSuporteIntegracoes(dia);
      } catch {
        await this.renderizarSuporteIntegracoes(
          dia,
          "Nao foi possivel ativar o fallback.",
        );
      }
    });
  }

  private async sair() {
    this.pararScannerAoVivo();
    this.pararSincronizacaoAutomatica?.();
    this.pararSincronizacaoAutomatica = null;
    this.pararAtualizacoesRemotas?.();
    this.pararAtualizacoesRemotas = null;
    if (this.timerAtualizacaoRemota !== null) {
      window.clearTimeout(this.timerAtualizacaoRemota);
      this.timerAtualizacaoRemota = null;
    }
    await this.dependencias.autenticacao.sair();
    this.usuarioAtual = null;
    this.importacaoAdmin = null;
    this.cargaEntregador = null;
    this.cargasEntregador = [];
    this.controladorFluxoEntrega = null;
    this.estadoUi.limpar();
    this.renderizarLogin();
  }

  private ligarSair() {
    document.querySelector("#sair")?.addEventListener("click", () => void this.sair());
  }

  private renderizarAdminImportar() {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    this.raiz.innerHTML = telaAdminImportar(this.usuarioAtual, this.compartilhamentoAtivo);
    this.ligarSair();

    document.querySelector("#gerenciar-cargas")?.addEventListener("click", () => void this.renderizarAdminCargas());
    document.querySelector("#gerenciar-perfis")?.addEventListener("click", () => void this.renderizarAdminPerfis());
    document.querySelector("#gerenciar-integracoes")?.addEventListener("click", () => this.renderizarAdminIntegracoes());

    document.querySelector<HTMLInputElement>("#arquivo-planilha")?.addEventListener("change", async (evento) => {
      const input = evento.currentTarget as HTMLInputElement;
      const arquivo = input.files?.[0];
      if (!arquivo) return;
      try {
        document.body.dataset.carregando = "true";
        this.importacaoAdmin = await this.dependencias.leitorPlanilha.ler(arquivo);
        await this.renderizarConciliacao();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Falha ao importar planilha.");
      } finally {
        document.body.dataset.carregando = "false";
      }
    });
  }


  private renderizarAdminIntegracoes() {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    this.raiz.innerHTML = telaAdminIntegracoes();
    document
      .querySelector("#voltar-integracoes")
      ?.addEventListener("click", () => this.renderizarAdminImportar());
  }


  private async renderizarAdminCargas() {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    await this.controladorAdminCargas.mostrarLista();
  }


  private async renderizarAdminPerfis() {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    const perfis = await this.dependencias.repositorioPerfis.listar();
    const resumos = await Promise.all(perfis.map(async (perfil) => ({
      perfil,
      conta: await this.dependencias.repositorioContas.obterPorEntregadorId(perfil.entregadorId),
      quantidadeCargas: (await this.dependencias.repositorioCargas.listarCargas(perfil.entregadorId)).length,
    })));

    this.raiz.innerHTML = telaAdminPerfis(resumos);

    document.querySelector("#voltar-admin")?.addEventListener("click", () => this.renderizarAdminImportar());
    document.querySelector("#novo-perfil")?.addEventListener("click", () => void this.renderizarFormularioPerfil());

    document.querySelectorAll<HTMLButtonElement>("[data-editar-perfil]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = botao.dataset.editarPerfil;
        if (!id) return;
        const perfil = await this.dependencias.repositorioPerfis.obter(id);
        if (perfil) await this.renderizarFormularioPerfil(perfil);
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-alternar-perfil]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = botao.dataset.alternarPerfil;
        if (!id) return;
        const perfil = await this.dependencias.repositorioPerfis.obter(id);
        if (!perfil) return;
        const conta = await this.dependencias.repositorioContas.obterPorEntregadorId(id);
        const novoAtivo = botao.dataset.ativo !== "true";

        if (novoAtivo && !conta) {
          alert("Este perfil ainda nao possui conta de acesso. Edite o perfil e cadastre email e senha antes de ativa-lo.");
          return;
        }

        const anterior = perfil.ativo;
        perfil.ativo = novoAtivo;
        try {
          await this.dependencias.repositorioPerfis.salvar(perfil);
          if (conta) {
            await this.dependencias.repositorioContas.salvar({
              entregadorId: id,
              email: conta.email,
              nome: perfil.nomeOficial,
              ativo: novoAtivo,
            });
          }
          await this.renderizarAdminPerfis();
        } catch (erro) {
          perfil.ativo = anterior;
          await this.dependencias.repositorioPerfis.salvar(perfil);
          alert(erro instanceof Error ? erro.message : "Nao foi possivel alterar o perfil.");
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-excluir-perfil]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = botao.dataset.excluirPerfil;
        if (!id) return;
        const perfil = await this.dependencias.repositorioPerfis.obter(id);
        if (!perfil) return;
        const cargas = await this.dependencias.repositorioCargas.listarCargas(id);
        if (cargas.length) {
          alert(`O perfil ${perfil.nomeOficial} possui ${cargas.length} carga(s) registrada(s). Para preservar o historico, desative o perfil em vez de exclui-lo.`);
          return;
        }
        if (!confirm(`Excluir definitivamente o perfil e a conta de acesso de ${perfil.nomeOficial}?`)) return;
        try {
          await this.dependencias.repositorioContas.excluirPorEntregadorId(id);
          await this.dependencias.repositorioVinculos.removerPorEntregador(id);
          await this.dependencias.repositorioPerfis.excluir(id);
          await this.ajustarAtualizacoesRemotas();
          await this.renderizarAdminPerfis();
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel excluir o perfil.");
        }
      });
    });
  }

  private async renderizarFormularioPerfil(
    perfil?: PerfilEntregador,
    aliasInicial = "",
    voltarParaConciliacao = false,
  ) {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    const conta = perfil
      ? await this.dependencias.repositorioContas.obterPorEntregadorId(perfil.entregadorId)
      : null;
    this.raiz.innerHTML = telaAdminPerfilForm(perfil, conta, aliasInicial);

    const voltar = () => {
      if (voltarParaConciliacao && this.importacaoAdmin) void this.renderizarConciliacao();
      else void this.renderizarAdminPerfis();
    };

    document.querySelector("#cancelar-perfil")?.addEventListener("click", voltar);
    document.querySelector("#enviar-redefinicao-senha")?.addEventListener("click", async () => {
      const email = conta?.email ?? document.querySelector<HTMLInputElement>("#perfil-email")?.value.trim() ?? "";
      if (!email) return alert("Informe o email de acesso.");
      if (!confirm(`Enviar um link de redefinicao de senha para ${email}?`)) return;
      try {
        await this.dependencias.autenticacao.solicitarRedefinicaoSenha(email);
        alert("Link de redefinicao enviado. O entregador deve conferir a caixa de entrada e o spam.");
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel enviar a redefinicao.");
      }
    });
    document.querySelector<HTMLFormElement>("#form-perfil")?.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const nome = document.querySelector<HTMLInputElement>("#perfil-nome")?.value.trim() ?? "";
      const email = document.querySelector<HTMLInputElement>("#perfil-email")?.value.trim() ?? "";
      const senha = document.querySelector<HTMLInputElement>("#perfil-senha")?.value ?? "";
      const textoAliases = document.querySelector<HTMLTextAreaElement>("#perfil-aliases")?.value ?? "";
      const aliases = textoAliases.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
      const ativo = document.querySelector<HTMLInputElement>("#perfil-ativo")?.checked ?? true;
      if (!nome) return alert("Informe o nome oficial.");
      if (!email) return alert("Informe o email de acesso.");
      if (!aliases.length) return alert("Informe pelo menos um alias do Excel.");

      const perfilSalvar = perfil
        ? { ...perfil, nomeOficial: nome, excelAliases: aliases, ativo, atualizadoEm: new Date().toISOString() }
        : (() => {
            const novo = criarPerfilEntregador(nome, aliases[0]);
            novo.excelAliases = aliases;
            novo.ativo = ativo;
            return novo;
          })();

      try {
        await salvarPerfilComAcesso(
          { perfil: perfilSalvar, email, senhaNova: senha || undefined },
          this.dependencias.repositorioPerfis,
          this.dependencias.repositorioContas,
        );
        await this.ajustarAtualizacoesRemotas();
        voltar();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar o perfil e o acesso.");
      }
    });
  }

  private async renderizarConciliacao() {
    if (!this.importacaoAdmin) return;
    const perfis = await this.dependencias.repositorioPerfis.listar();
    const resultado = conciliador.conciliar(this.importacaoAdmin.entregadores, perfis);
    let contasAtivas = new Set<string>();
    try {
      const contas = await this.dependencias.repositorioContas.listar();
      contasAtivas = new Set(contas.filter((conta) => conta.ativo).map((conta) => conta.entregadorId));
    } catch {
      // Sem servidor compartilhado, nao liberar distribuicao para um login que
      // nao pode ser validado em outro navegador/aparelho.
      contasAtivas = new Set<string>();
    }
    this.raiz.innerHTML = telaAdminConciliacao(this.importacaoAdmin, resultado, perfis, contasAtivas);

    document.querySelector("#cancelar-importacao")?.addEventListener("click", () => {
      this.importacaoAdmin = null;
      this.renderizarAdminImportar();
    });

    document.querySelectorAll<HTMLButtonElement>("[data-ignorar-coluna]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const coluna = botao.dataset.ignorarColuna;
        if (!coluna || !this.importacaoAdmin) return;
        const quantidade = this.importacaoAdmin.pacotes.filter((pacote) => pacote.entregador === coluna).length;
        if (!confirm(`Ignorar a coluna "${coluna}" e descartar ${quantidade} valor(es) desta importacao? O arquivo Excel original nao sera alterado.`)) return;
        try {
          this.importacaoAdmin = ignorarColunaImportacao(this.importacaoAdmin, coluna);
          void this.renderizarConciliacao();
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel ignorar a coluna.");
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-criar-perfil]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const coluna = botao.dataset.criarPerfil;
        if (!coluna) return;
        void this.renderizarFormularioPerfil(undefined, coluna, true);
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-editar-acesso]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const entregadorId = botao.dataset.editarAcesso;
        if (!entregadorId) return;
        const perfil = await this.dependencias.repositorioPerfis.obter(entregadorId);
        if (perfil) await this.renderizarFormularioPerfil(perfil, "", true);
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-vincular-coluna]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const coluna = botao.dataset.vincularColuna;
        if (!coluna || !this.usuarioAtual) return;
        const seletor = document.querySelector<HTMLSelectElement>(`[data-selecionar-perfil="${CSS.escape(coluna)}"]`);
        const entregadorId = seletor?.value;
        if (!entregadorId) return alert("Escolha um perfil para vincular.");
        try {
          await this.dependencias.repositorioPerfis.adicionarAlias(entregadorId, coluna);
          await this.dependencias.repositorioVinculos.salvar({
            id: crypto.randomUUID(),
            aliasOriginal: coluna,
            aliasNormalizado: normalizarNomeExcel(coluna),
            entregadorId,
            confirmadoEm: new Date().toISOString(),
            confirmadoPorUsuarioId: this.usuarioAtual.usuarioId,
          });
          await this.renderizarConciliacao();
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel vincular.");
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-resolver-conflito]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const coluna = botao.dataset.resolverConflito;
        if (!coluna) return;
        const seletor = document.querySelector<HTMLSelectElement>(`[data-selecionar-perfil="${CSS.escape(coluna)}"]`);
        const escolhido = seletor?.value;
        if (!escolhido || !this.usuarioAtual) return;
        const perfis = await this.dependencias.repositorioPerfis.listar();
        const envolvidos = perfis.filter((perfil) =>
          perfil.excelAliases.some((alias) => normalizarNomeExcel(alias) === normalizarNomeExcel(coluna)),
        );
        for (const perfil of envolvidos) {
          if (perfil.entregadorId !== escolhido) {
            await this.dependencias.repositorioPerfis.removerAlias(perfil.entregadorId, coluna);
          }
        }
        await this.dependencias.repositorioPerfis.adicionarAlias(escolhido, coluna);
        await this.dependencias.repositorioVinculos.salvar({
          id: crypto.randomUUID(),
          aliasOriginal: coluna,
          aliasNormalizado: normalizarNomeExcel(coluna),
          entregadorId: escolhido,
          confirmadoEm: new Date().toISOString(),
          confirmadoPorUsuarioId: this.usuarioAtual.usuarioId,
        });
        await this.renderizarConciliacao();
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-reativar-perfil]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const entregadorId = botao.dataset.reativarPerfil;
        if (!entregadorId) return;
        const perfil = await this.dependencias.repositorioPerfis.obter(entregadorId);
        const conta = await this.dependencias.repositorioContas.obterPorEntregadorId(entregadorId);
        if (!perfil || !conta) {
          alert("Este perfil nao possui conta de acesso. Abra Gerenciar Perfis e cadastre email e senha antes de reativar.");
          return;
        }
        await this.dependencias.repositorioPerfis.definirAtivo(entregadorId, true);
        await this.dependencias.repositorioContas.salvar({
          entregadorId,
          email: conta.email,
          nome: perfil.nomeOficial,
          ativo: true,
        });
        await this.renderizarConciliacao();
      });
    });

    document.querySelector<HTMLButtonElement>("#distribuir-cargas")?.addEventListener("click", async (evento) => {
      if (!this.importacaoAdmin) return;
      const botao = evento.currentTarget as HTMLButtonElement;
      botao.disabled = true;
      try {
        const perfisAtualizados = await this.dependencias.repositorioPerfis.listar();
        const conciliacaoAtual = conciliador.conciliar(this.importacaoAdmin.entregadores, perfisAtualizados);
        if (!conciliacaoAtual.podeDistribuir) throw new Error("Resolva todas as pendencias antes de distribuir.");

        const semConta = await listarPerfisSemContaAtiva(
          conciliacaoAtual.encontrados,
          this.dependencias.repositorioContas,
        );
        if (semConta.length) {
          const perfisSemConta = perfisAtualizados
            .filter((perfil) => semConta.includes(perfil.entregadorId))
            .map((perfil) => perfil.nomeOficial)
            .join(", ");
          throw new Error(`Nao foi possivel distribuir. Cadastre ou ative a conta de acesso de: ${perfisSemConta}.`);
        }

        const novas = particionarCargaPorPerfil(this.importacaoAdmin, conciliacaoAtual.encontrados);
        if (!novas.length) throw new Error("A planilha nao possui nenhum tracking para distribuir.");
        const existentes = (await Promise.all(
          perfisAtualizados.map((perfil) =>
            this.dependencias.repositorioCargas.listarCargas(perfil.entregadorId),
          ),
        )).flat();
        const cargas = consolidarCargasImportadas(novas, existentes);
        const contas = new Map<string, ContaAcessoEntregador>();
        for (const carga of cargas) {
          const conta = await this.dependencias.repositorioContas.obterPorEntregadorId(carga.entregadorId);
          if (!conta) throw new Error(`Conta de acesso ausente para ${carga.nomeEntregador}.`);
          contas.set(carga.entregadorId, conta);
        }
        await this.dependencias.repositorioCargas.salvarCargas(cargas);
        // A confirmacao exibe somente o lote que acabou de ser importado.
        // As cargas consolidadas anteriores permanecem na Gestao de cargas.
        this.raiz.innerHTML = telaAdminDistribuicao(novas, contas);
        this.ligarSair();
        document.querySelector("#nova-importacao-admin")?.addEventListener("click", () => {
          this.importacaoAdmin = null;
          this.renderizarAdminImportar();
        });
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel distribuir as cargas.");
        botao.disabled = false;
      }
    });
  }

  private renderizarPerfilSemVinculo() {
    if (!this.usuarioAtual) return;
    this.raiz.innerHTML = telaPerfilSemVinculo(this.usuarioAtual);
    this.ligarSair();
  }

  private async atualizarDadosEntregador(): Promise<boolean> {
    if (!this.usuarioAtual?.entregadorId) {
      this.renderizarPerfilSemVinculo();
      return false;
    }
    this.cargasEntregador = await this.dependencias.repositorioCargas
      .listarCargas(this.usuarioAtual.entregadorId);
    this.cargaEntregador = encontrarCargaAtual(this.cargasEntregador);
    this.operacoesScannerHoje = await this.dependencias.repositorioOperacoesScanner
      .listarDia(this.usuarioAtual.entregadorId, obterDataLocalIso())
      .catch(() => []);
    return true;
  }

  private async carregarHomeEntregador(): Promise<void> {
    if (!await this.atualizarDadosEntregador()) return;
    if (!this.usuarioAtual) return;
    this.pararScannerAoVivo();
    const resumo = resumirHomeEntregador(this.cargasEntregador, this.cargaEntregador);
    this.raiz.innerHTML = telaHome(this.usuarioAtual, resumo);
    this.ligarSair();

    selecionar(this.raiz, "#retomar-operacao")?.addEventListener("click", () => {
      if (!resumo.retomada) return;
      this.abrirFluxoEntrega(resumo.retomada.pacote, resumo.retomada.carga);
    });
    selecionar(this.raiz, "#acessar-operacao")?.addEventListener("click", () => {
      if (this.cargaEntregador) {
        this.renderizarEntregador();
        return;
      }
      this.renderizarScanner();
    });
  }

  private async carregarCargaEntregador(): Promise<void> {
    if (!await this.atualizarDadosEntregador()) return;
    const usuario = this.usuarioAtual;
    if (!usuario) return;
    if (!this.cargaEntregador) {
      this.raiz.innerHTML = telaSemCarga(usuario, this.operacoesScannerHoje.length);
      this.ligarSair();
      selecionar(this.raiz, "#abrir-scanner-livre")?.addEventListener("click", () => this.renderizarScanner());
      selecionar(this.raiz, "#voltar-inicio")?.addEventListener("click", () => void this.carregarHomeEntregador());
      return;
    }
    this.renderizarEntregador();
  }

  private renderizarEntregador() {
    this.pararScannerAoVivo();
    if (!this.cargaEntregador) return;
    this.raiz.innerHTML = telaEntregador(
      this.cargaEntregador,
      this.operacoesScannerHoje,
    );
    this.ligarSair();

    selecionar(this.raiz, "#voltar-inicio")?.addEventListener("click", () => void this.carregarHomeEntregador());
    selecionar(this.raiz, "#abrir-scanner")?.addEventListener("click", () => this.renderizarScanner());
    selecionar(this.raiz, "#atualizar-carga")?.addEventListener("click", () => void this.carregarCargaEntregador());
    selecionar(this.raiz, "#ver-regioes-entregador")?.addEventListener("click", () => {
      const primeira = this.cargaEntregador?.pacotes.find((pacote) => pacote.regiaoEntrega)?.regiaoEntrega?.regiaoId;
      if (primeira) this.renderizarEntregadorRegiao(primeira);
    });
    selecionar<HTMLButtonElement>(this.raiz, "#sincronizar-agora")?.addEventListener("click", async (evento) => {
      if (!this.cargaEntregador) return;
      const botao = evento.currentTarget as HTMLButtonElement;
      const status = selecionar<HTMLElement>(this.raiz, "#status-sincronizacao");
      botao.disabled = true;
      botao.setAttribute("aria-busy", "true");
      if (status) status.textContent = "Sincronizando operacoes locais...";
      try {
        const resultado = await this.dependencias.sincronizacaoEntregas.sincronizarAgora(
          this.cargaEntregador.entregadorId,
          { forcarTentativa: true },
        );
        if (!resultado.online) {
          if (status) status.textContent = `${resultado.restantes} operacao(oes) salva(s) no aparelho. Sem internet.`;
          return;
        }

        await this.carregarCargaEntregador();
        const statusAtualizado = selecionar<HTMLElement>(this.raiz, "#status-sincronizacao");
        if (statusAtualizado) {
          statusAtualizado.textContent = resultado.restantes === 0
            ? `${resultado.processadas} operacao(oes) enviada(s). Fila local vazia.`
            : `${resultado.processadas} enviada(s). ${resultado.restantes} permanece(m) salva(s); nova tentativa sera automatica.`;
        }
      } catch (erro) {
        console.error(`${CODIGOS_ERRO.INTERFACE_SINCRONIZACAO}: sincronizacao manual nao concluida.`, erro);
        if (status) {
          status.textContent = "A operacao continua salva no aparelho e sera tentada novamente.";
        }
      } finally {
        if (botao.isConnected) {
          botao.disabled = false;
          botao.removeAttribute("aria-busy");
        }
      }
    });
    const copiarUltima = async () => {
      const codigo = this.operacoesScannerHoje[0]?.tracking;
      if (!codigo) return;
      try {
        await navigator.clipboard.writeText(codigo);
        const status = selecionar<HTMLElement>(this.raiz, "#status-sincronizacao");
        if (status) status.textContent = "Codigo copiado para a area de transferencia.";
      } catch {
        const status = selecionar<HTMLElement>(this.raiz, "#status-sincronizacao");
        if (status) status.textContent = "Nao foi possivel copiar agora. Toque e segure o codigo para seleciona-lo.";
      }
    };
    selecionar(this.raiz, "#copiar-ultima-operacao-botao")?.addEventListener("click", () => void copiarUltima());
    selecionar(this.raiz, "#copiar-ultima-operacao")?.addEventListener("contextmenu", (evento) => {
      evento.preventDefault();
      void copiarUltima();
    });
    selecionar(this.raiz, "#copiar-ultima-operacao")?.addEventListener("pointerdown", (evento) => {
      const inicio = window.setTimeout(() => void copiarUltima(), 650);
      const cancelar = () => window.clearTimeout(inicio);
      const alvo = evento.currentTarget as HTMLElement | null;
      alvo?.addEventListener("pointerup", cancelar, { once: true });
      alvo?.addEventListener("pointercancel", cancelar, { once: true });
    });
    selecionar(this.raiz, "#abrir-ultima-operacao")?.addEventListener("click", () => {
      const ultima = this.operacoesScannerHoje[0];
      if (!ultima) return;
      const resolucao = resolverScannerUniversal(ultima.tracking, this.cargaEntregador);
      if (!resolucao.sucesso) return;
      void this.abrirAplicativoParaLeitura(resolucao.resultado, ultima).then((mensagem) => {
        const status = selecionar<HTMLElement>(this.raiz, "#status-sincronizacao");
        if (status) status.textContent = mensagem;
      });
    });

    const conteudoEntregador = selecionar<HTMLElement>(this.raiz, "main");

    if (conteudoEntregador) delegarEvento(conteudoEntregador, "click", "[data-abrir-regiao]", (botao) => {
      const regiaoId = botao.dataset.abrirRegiao;
      if (regiaoId) this.renderizarEntregadorRegiao(regiaoId);
    });

    if (conteudoEntregador) delegarEvento(conteudoEntregador, "click", "[data-abrir-pacote]", (botao) => {
      const pacote = this.cargaEntregador?.pacotes.find((item) => item.id === botao.dataset.abrirPacote);
      if (pacote) this.abrirFluxoEntrega(pacote);
    });
  }


  private renderizarEntregadorRegiao(regiaoId: string) {
    this.pararScannerAoVivo();
    if (!this.cargaEntregador) return;
    this.raiz.innerHTML = telaEntregadorRegiao(this.cargaEntregador, regiaoId);
    selecionar(this.raiz, "#voltar-regioes-entregador")?.addEventListener("click", () => this.renderizarEntregador());
    const conteudoRegiao = selecionar<HTMLElement>(this.raiz, "main");
    if (conteudoRegiao) delegarEvento(conteudoRegiao, "click", "[data-abrir-pacote-regiao]", (botao) => {
      const pacote = this.cargaEntregador?.pacotes.find((item) => item.id === botao.dataset.abrirPacoteRegiao);
      if (pacote) this.abrirFluxoEntrega(pacote);
    });
  }


  private renderizarScanner(mensagem = "") {
    this.raiz.innerHTML = telaScanner(
      this.cargaEntregador?.nomeEntregador ?? this.usuarioAtual?.nome ?? "Entregador",
      mensagem,
    );

    const input = selecionar<HTMLInputElement>(this.raiz, "#codigo-scanner");
    const foto = selecionar<HTMLInputElement>(this.raiz, "#foto-scanner");
    const status = selecionar<HTMLElement>(this.raiz, "#status-scanner");

    const encaminhar = (leitura: ResultadoScannerUniversal) => {
      void this.encaminharLeituraScanner(leitura);
    };

    selecionar(this.raiz, "#scanner-confirmar-primeira")?.addEventListener("click", () => {
      if (!this.candidatoScanner) return;
      encaminhar(this.candidatoScanner);
    });

    selecionar(this.raiz, "#scanner-reiniciar")?.addEventListener("click", () => {
      void this.iniciarScannerAoVivo(encaminhar);
    });

    selecionar(this.raiz, "#scanner-lanterna")?.addEventListener("click", async () => {
      if (!this.scannerAoVivo) return;
      const ligada = await this.scannerAoVivo.alternarLanterna();
      const botao = selecionar<HTMLButtonElement>(this.raiz, "#scanner-lanterna");
      if (botao) botao.textContent = ligada ? "DESLIGAR LANTERNA" : "LANTERNA";
    });

    const procurarManual = () => {
      const resolucao = resolverScannerUniversal(input?.value ?? "", this.cargaEntregador);
      if (!resolucao.sucesso) {
        if (resolucao.falha.codigo === "TRANSPORTADORA_NAO_RECONHECIDA") {
          this.mostrarSelecaoTransportadoraManual(input?.value ?? "");
          return;
        }
        this.renderizarScanner(resolucao.falha.mensagem);
        return;
      }
      encaminhar(resolucao.resultado);
    };

    foto?.addEventListener("change", async () => {
      const arquivo = foto.files?.[0];
      if (!arquivo) return;

      try {
        if (status) {
          status.textContent = "Lendo codigo da foto...";
          status.dataset.estado = "processando";
        }

        const leitura = await lerCodigosDaFoto(arquivo);
        const resolvido = resolverCodigosScannerUniversal(leitura.codigos, this.cargaEntregador);
        if (!resolvido.sucesso) {
          if (resolvido.falha.codigo === "TRANSPORTADORA_NAO_RECONHECIDA") {
            const candidato = leitura.codigos
              .map((codigo) => normalizarCodigo(codigo).codigo)
              .filter(Boolean)
              .sort((a, b) => b.length - a.length)[0];
            if (candidato) {
              this.mostrarSelecaoTransportadoraManual(candidato);
              return;
            }
          }
          this.renderizarScanner(resolvido.falha.mensagem);
          return;
        }
        encaminhar(resolvido.resultado);
      } catch (erro) {
        this.renderizarScanner(
          erro instanceof Error
            ? erro.message
            : "Nao foi possivel ler o codigo da foto.",
        );
      } finally {
        if (foto) foto.value = "";
      }
    });

    selecionar(this.raiz, "#procurar-pacote")?.addEventListener("click", procurarManual);

    input?.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") procurarManual();
    });

    selecionar(this.raiz, "#voltar-entregador")?.addEventListener("click", () => void this.carregarCargaEntregador());

    void this.iniciarScannerAoVivo(encaminhar);
  }

  private mostrarSelecaoTransportadoraManual(valorLido: unknown): void {
    this.pararScannerAoVivo();
    const tracking = normalizarCodigo(valorLido).codigo;
    if (!tracking) {
      this.renderizarScanner("Nenhum tracking foi identificado.");
      return;
    }
    const nome = this.cargaEntregador?.nomeEntregador ?? this.usuarioAtual?.nome ?? "Entregador";
    this.raiz.innerHTML = telaSelecaoTransportadoraManual(nome, tracking);
    selecionar(this.raiz, "#voltar-scanner-manual")?.addEventListener("click", () => this.renderizarScanner());
    selecionarTodos<HTMLButtonElement>(this.raiz, "[data-transportadora-manual]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const transportadora = botao.dataset.transportadoraManual as Exclude<IdTransportadora, "OUTRA">;
        const resolucao = resolverTransportadoraManual(tracking, transportadora, this.cargaEntregador);
        if (!resolucao.sucesso) {
          this.renderizarScanner(resolucao.falha.mensagem);
          return;
        }
        void this.encaminharLeituraScanner(resolucao.resultado);
      });
    });
  }

  /** Para a camera ao sair da tela e evita leituras de um visor antigo. */
  private pararScannerAoVivo(): void {
    this.scannerToken += 1;
    this.scannerAoVivo?.parar();
    this.scannerAoVivo = null;
    this.candidatoScanner = null;
    this.leiturasScanner.clear();
    this.leiturasScannerDesconhecidas.clear();
  }

  private atualizarScannerAoVivo(
    mensagem: string,
    estado: "procurando" | "detectado" | "confirmado" | "erro" | "processando" = "procurando",
  ): void {
    const status = selecionar<HTMLElement>(this.raiz, "#status-scanner");
    const visor = selecionar<HTMLElement>(this.raiz, "#scanner-visor");
    if (status) {
      status.textContent = mensagem;
      status.dataset.estado = estado;
    }
    if (visor) visor.dataset.estado = estado;
  }

  private mostrarCandidatoScanner(leitura: ResultadoScannerUniversal | null): void {
    this.candidatoScanner = leitura;
    const painel = selecionar<HTMLElement>(this.raiz, "#scanner-candidato");
    const codigo = selecionar<HTMLElement>(this.raiz, "#scanner-candidato-codigo");
    const transportadora = selecionar<HTMLElement>(this.raiz, "#scanner-candidato-transportadora");
    const botao = selecionar<HTMLButtonElement>(this.raiz, "#scanner-confirmar-primeira");
    if (!painel || !codigo || !transportadora || !botao) return;

    if (!leitura) {
      painel.hidden = true;
      botao.disabled = true;
      return;
    }

    codigo.textContent = leitura.tracking;
    transportadora.textContent = `${leitura.transportadora.nome} • ${leitura.origem === "CARGA_IMPORTADA" ? "na carga" : "leitura livre"}`;
    painel.hidden = false;
    botao.disabled = false;
  }

  /**
   * Confirma o mesmo pacote em dois quadros em uma janela curta. A primeira
   * leitura continua acionavel para que o entregador nao precise esperar.
   */
  private async iniciarScannerAoVivo(
    encaminhar: (leitura: ResultadoScannerUniversal) => void,
  ): Promise<void> {
    this.pararScannerAoVivo();
    const token = ++this.scannerToken;
    const video = selecionar<HTMLVideoElement>(this.raiz, "#scanner-video");
    if (!video) return;

    this.atualizarScannerAoVivo("Preparando camera... Aponte o codigo para dentro da moldura.");

    try {
      const controle = await iniciarScannerCameraContinuo(video, {
        intervaloMs: 140,
        onLeitura: (leitura) => {
          if (token !== this.scannerToken) return;
          const agora = Date.now();
          for (const codigo of leitura.codigos) {
            const resolucao = resolverScannerUniversal(codigo, this.cargaEntregador);
            if (!resolucao.sucesso) {
              // A camera tambem precisa conduzir a selecao manual. Antes deste
              // ponto, ela ignorava a leitura desconhecida, apesar de o campo
              // digitado e a foto ja preservarem o mesmo tracking.
              if (resolucao.falha.codigo !== "TRANSPORTADORA_NAO_RECONHECIDA") continue;
              const tracking = normalizarCodigo(codigo).codigo;
              if (!tracking) continue;

              const anterior = this.leiturasScannerDesconhecidas.get(tracking);
              const quantidade = anterior && agora - anterior.em <= 1_800
                ? anterior.quantidade + 1
                : 1;
              this.leiturasScannerDesconhecidas.set(tracking, { quantidade, em: agora });

              if (quantidade < 2) {
                this.atualizarScannerAoVivo(
                  `Codigo lido: ${tracking}. Mantenha enquadrado para escolher a transportadora.`,
                  "detectado",
                );
                navigator.vibrate?.(25);
                continue;
              }

              this.atualizarScannerAoVivo(
                `Codigo confirmado: ${tracking}. Escolha a transportadora para continuar.`,
                "confirmado",
              );
              navigator.vibrate?.(90);
              this.scannerAoVivo?.parar();
              this.scannerAoVivo = null;
              window.setTimeout(() => {
                if (token === this.scannerToken) this.mostrarSelecaoTransportadoraManual(tracking);
              }, 120);
              return;
            }
            const resultado = resolucao.resultado;

            const anterior = this.leiturasScanner.get(resultado.tracking);
            const quantidade = anterior && agora - anterior.em <= 1_800
              ? anterior.quantidade + 1
              : 1;
            this.leiturasScanner.set(resultado.tracking, { leitura: resultado, quantidade, em: agora });

            if (this.candidatoScanner?.tracking !== resultado.tracking) {
              this.mostrarCandidatoScanner(resultado);
              navigator.vibrate?.(25);
            }

            if (quantidade < 2) {
              this.atualizarScannerAoVivo(
                `${resultado.transportadora.nome} reconhecida: ${resultado.tracking}. Confirme ou mantenha enquadrado.`,
                "detectado",
              );
              continue;
            }

            this.atualizarScannerAoVivo(
              `Codigo confirmado: ${resultado.tracking}. Preparando ${resultado.transportadora.nome}...`,
              "confirmado",
            );
            navigator.vibrate?.(90);
            this.scannerAoVivo?.parar();
            this.scannerAoVivo = null;
            window.setTimeout(() => {
              if (token === this.scannerToken) encaminhar(resultado);
            }, 120);
            return;
          }
        },
        onErro: (erro) => {
          if (token === this.scannerToken) this.atualizarScannerAoVivo(erro.message, "erro");
        },
      });

      if (token !== this.scannerToken) {
        controle.parar();
        return;
      }

      this.scannerAoVivo = controle;
      const botaoLanterna = selecionar<HTMLButtonElement>(this.raiz, "#scanner-lanterna");
      if (botaoLanterna) {
        botaoLanterna.disabled = !controle.possuiLanterna();
        botaoLanterna.title = controle.possuiLanterna()
          ? "Ligar ou desligar a lanterna"
          : "Lanterna nao disponivel nesta camera";
      }
      this.atualizarScannerAoVivo("Scanner ativo. A primeira leitura aparecera para conferencia.");
    } catch (erro) {
      if (token === this.scannerToken) {
        this.atualizarScannerAoVivo(
          erro instanceof Error ? erro.message : "Falha ao iniciar a camera.",
          "erro",
        );
      }
    }
  }

  private async abrirAplicativoParaLeitura(
    leitura: ResultadoScannerUniversal,
    registro: import("../dominio/scanner/tipos").RegistroOperacaoScanner | null,
  ): Promise<string> {
    const integracao = this.dependencias.integracoesTransportadoras[leitura.transportadora.id];
    if (!integracao) {
      if (registro) {
        await this.dependencias.repositorioOperacoesScanner
          .registrarResultado(registro.registroId, "SEM_INTEGRACAO", "ADAPTADOR_AUSENTE")
          .catch(() => undefined);
      }
      return `${leitura.transportadora.nome} foi reconhecida, mas a integracao ainda nao esta homologada.`;
    }

    try {
      const saida = await integracao.abrirPesquisaPorTracking({
        tracking: leitura.tracking,
        modo: "OPERACAO",
      });
      if (registro) {
        const estado = saida.estrategia === "CLIPBOARD_APP"
          ? "FALLBACK"
          : saida.despachado ? "DESPACHADO" : "FALHA";
        await this.dependencias.repositorioOperacoesScanner
          .registrarResultado(registro.registroId, estado, saida.codigo)
          .catch(() => undefined);
      }
      return saida.mensagem;
    } catch {
      if (registro) {
        await this.dependencias.repositorioOperacoesScanner
          .registrarResultado(registro.registroId, "FALHA", "ERRO_NAO_TRATADO")
          .catch(() => undefined);
      }
      return "Nao foi possivel abrir o aplicativo. A falha foi registrada para o suporte.";
    }
  }

  private async encaminharLeituraScanner(leitura: ResultadoScannerUniversal): Promise<void> {
    this.pararScannerAoVivo();
    const nome = this.cargaEntregador?.nomeEntregador ?? this.usuarioAtual?.nome ?? "Entregador";
    const integracao = this.dependencias.integracoesTransportadoras[leitura.transportadora.id];
    const entregadorId = this.usuarioAtual?.entregadorId;
    const registro = entregadorId
      ? await this.dependencias.repositorioOperacoesScanner
          .registrarLeitura(entregadorId, leitura)
          .catch(() => null)
      : null;
    this.raiz.innerHTML = telaResultadoScannerUniversal(nome, leitura, Boolean(integracao));

    const executar = async () => {
      const status = selecionar<HTMLElement>(this.raiz, "#resultado-scanner-integracao");
      const reabrir = selecionar<HTMLButtonElement>(this.raiz, "#reabrir-transportadora");
      if (reabrir) reabrir.disabled = true;
      if (status) status.textContent = `Abrindo ${leitura.transportadora.nome}...`;
      try {
        if (status) status.textContent = await this.abrirAplicativoParaLeitura(leitura, registro);
      } finally {
        if (reabrir?.isConnected) reabrir.disabled = false;
      }
    };

    selecionar(this.raiz, "#reabrir-transportadora")?.addEventListener("click", () => void executar());
    selecionar(this.raiz, "#abrir-sem-pod")?.addEventListener("click", () => void executar());
    selecionar(this.raiz, "#proxima-leitura-universal")?.addEventListener("click", () => this.renderizarScanner());
    selecionar(this.raiz, "#registrar-entrega-completa")?.addEventListener("click", async () => {
      try {
        const operacao = await this.materializarPodUniversal(leitura);
        this.abrirFluxoEntrega(operacao.pacote, operacao.carga);
      } catch (erro) {
        const status = selecionar<HTMLElement>(this.raiz, "#resultado-scanner-integracao");
        if (status) {
          status.textContent = erro instanceof Error
            ? erro.message
            : "Nao foi possivel preparar o registro no Delivery Hub.";
        }
      }
    });
  }

  private async materializarPodUniversal(
    leitura: ResultadoScannerUniversal,
  ): Promise<{ carga: CargaEntregador; pacote: PacoteDaCarga }> {
    const entregadorId = this.usuarioAtual?.entregadorId;
    if (!entregadorId) throw new Error("Perfil de entregador nao vinculado.");

    const cargaBase = leitura.pacote
      ? this.cargaEntregador
      : (await this.dependencias.repositorioCargas.listarCargas(entregadorId))
          .find((carga) =>
            carga.origemOperacional === "SCANNER_UNIVERSAL" &&
            carga.dataOperacao === obterDataLocalIso() &&
            (carga.status ?? "EM_OPERACAO") === "EM_OPERACAO",
          ) ?? null;

    const materializada = materializarPacoteScannerLivre(leitura, cargaBase, {
      entregadorId,
      nomeEntregador: this.usuarioAtual?.nome ?? "Entregador",
      dataOperacao: obterDataLocalIso(),
      agoraIso: new Date().toISOString(),
      novoId: () => crypto.randomUUID(),
    });

    if (materializada.cargaCriada || materializada.pacoteCriado) {
      await this.dependencias.repositorioCargas.salvarCarga(
        entregadorId,
        materializada.carga,
      );
    }
    return { carga: materializada.carga, pacote: materializada.pacote };
  }

  private abrirFluxoEntrega(
    pacote: PacoteDaCarga,
    carga: CargaEntregador | null = this.cargaEntregador,
  ) {
    this.pararScannerAoVivo();
    if (!carga) return;
    this.controladorFluxoEntrega = new ControladorFluxoEntrega(
      this.raiz,
      this.dependencias,
      carga,
      pacote,
      () => this.dependencias.repositorioCargas.salvarCarga(carga.entregadorId, carga),
      {
        voltarScanner: () => {
          this.controladorFluxoEntrega = null;
          this.renderizarScanner();
        },
        voltarEntregador: () => {
          this.controladorFluxoEntrega = null;
          void this.carregarCargaEntregador();
        },
      },
    );
    this.controladorFluxoEntrega.mostrarPacoteEncontrado();
  }

}

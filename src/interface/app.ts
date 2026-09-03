import { prepararDadosTeste } from "../infraestrutura/mock/preparar-dados-teste";
import type { DependenciasAplicacao } from "../configuracao/dependencias";
import type { CargaEntregador, CargaImportada, PacoteDaCarga } from "../dominio/carga/tipos";
import type { ContaAcessoEntregador, PerfilEntregador, UsuarioAtual } from "../dominio/identidade/tipos";
import { ConciliadorPerfisPlanilha } from "../aplicacao/identidade/conciliar-perfis-planilha";
import { ControladorAdminCargas } from "./controladores/controlador-admin-cargas";
import { ControladorFluxoEntrega } from "./controladores/controlador-fluxo-entrega";
import { EstadoUiSessao } from "./nucleo/estado-ui";
import { delegarEvento, selecionar } from "./nucleo/dom";
import { criarPerfilEntregador } from "../aplicacao/identidade/criar-perfil-entregador";
import { normalizarNomeExcel } from "../aplicacao/identidade/normalizar-nome-excel";
import { salvarPerfilComAcesso } from "../aplicacao/identidade/salvar-perfil-com-acesso";
import { listarPerfisSemContaAtiva } from "../aplicacao/identidade/validar-acesso-perfis";
import { particionarCargaPorPerfil } from "../aplicacao/carga/particionar-carga-por-perfil";
import { resolverTelaInicial } from "../aplicacao/navegacao/resolver-tela-inicial";
import { localizarPacote } from "../aplicacao/localizar-pacote";
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
import { resolverFotoNaCarga } from "../aplicacao/scanner/resolver-foto-na-carga";
import { telaAdminIntegracoes } from "./telas/tela-admin-integracoes";
import { telaEntregadorRegiao } from "./telas/tela-entregador-regiao";

const conciliador = new ConciliadorPerfisPlanilha();


export class AplicacaoDeliveryHub {
  private usuarioAtual: UsuarioAtual | null = null;
  private importacaoAdmin: CargaImportada | null = null;
  private cargaEntregador: CargaEntregador | null = null;
  private compartilhamentoAtivo = false;
  private readonly estadoUi = new EstadoUiSessao();
  private readonly controladorAdminCargas: ControladorAdminCargas;
  private controladorFluxoEntrega: ControladorFluxoEntrega | null = null;

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
    await prepararDadosTeste(this.dependencias.repositorioPerfis, this.dependencias.repositorioContas);
    this.usuarioAtual = await this.dependencias.autenticacao.obterUsuarioAtual();
    await this.rotear();
  }

  private async rotear() {
    const destino = resolverTelaInicial(this.usuarioAtual);
    if (destino === "LOGIN") return this.renderizarLogin();
    if (destino === "ADMIN_IMPORTAR") return this.renderizarAdminImportar();
    if (destino === "PERFIL_SEM_VINCULO") return this.renderizarPerfilSemVinculo();
    return this.carregarCargaEntregador();
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
        await this.rotear();
      } catch (erro) {
        this.renderizarLogin(erro instanceof Error ? erro.message : "Falha ao entrar.");
      }
    });
  }

  private async sair() {
    await this.dependencias.autenticacao.sair();
    this.usuarioAtual = null;
    this.importacaoAdmin = null;
    this.cargaEntregador = null;
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

    document.querySelector("#distribuir-cargas")?.addEventListener("click", async () => {
      if (!this.importacaoAdmin) return;
      const perfisAtualizados = await this.dependencias.repositorioPerfis.listar();
      const conciliacaoAtual = conciliador.conciliar(this.importacaoAdmin.entregadores, perfisAtualizados);
      if (!conciliacaoAtual.podeDistribuir) return alert("Resolva todas as pendencias antes de distribuir.");

      const semConta = await listarPerfisSemContaAtiva(
        conciliacaoAtual.encontrados,
        this.dependencias.repositorioContas,
      );
      if (semConta.length) {
        const perfisSemConta = perfisAtualizados
          .filter((perfil) => semConta.includes(perfil.entregadorId))
          .map((perfil) => perfil.nomeOficial)
          .join(", ");
        alert(`Nao foi possivel distribuir. Cadastre ou ative a conta de acesso de: ${perfisSemConta}.`);
        return;
      }

      const cargas = particionarCargaPorPerfil(this.importacaoAdmin, conciliacaoAtual.encontrados);
      const contas = new Map<string, ContaAcessoEntregador>();
      for (const carga of cargas) {
        const conta = await this.dependencias.repositorioContas.obterPorEntregadorId(carga.entregadorId);
        if (!conta) throw new Error(`Conta de acesso ausente para ${carga.nomeEntregador}.`);
        contas.set(carga.entregadorId, conta);
        await this.dependencias.repositorioCargas.salvarCarga(carga.entregadorId, carga);
      }
      this.raiz.innerHTML = telaAdminDistribuicao(cargas, contas);
      this.ligarSair();
      document.querySelector("#nova-importacao-admin")?.addEventListener("click", () => {
        this.importacaoAdmin = null;
        this.renderizarAdminImportar();
      });
    });
  }

  private renderizarPerfilSemVinculo() {
    if (!this.usuarioAtual) return;
    this.raiz.innerHTML = telaPerfilSemVinculo(this.usuarioAtual);
    this.ligarSair();
  }

  private async carregarCargaEntregador() {
    if (!this.usuarioAtual?.entregadorId) return this.renderizarPerfilSemVinculo();
    this.cargaEntregador = await this.dependencias.repositorioCargas.obterCargaAtual(this.usuarioAtual.entregadorId);
    if (!this.cargaEntregador) {
      this.raiz.innerHTML = telaSemCarga(this.usuarioAtual);
      this.ligarSair();
      return;
    }
    this.renderizarEntregador();
  }

  private renderizarEntregador() {
    if (!this.cargaEntregador) return;
    this.raiz.innerHTML = telaEntregador(this.cargaEntregador);
    this.ligarSair();

    selecionar(this.raiz, "#abrir-scanner")?.addEventListener("click", () => this.renderizarScanner());
    selecionar(this.raiz, "#atualizar-carga")?.addEventListener("click", () => void this.carregarCargaEntregador());
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
    if (!this.cargaEntregador) return;
    this.raiz.innerHTML = telaEntregadorRegiao(this.cargaEntregador, regiaoId);
    selecionar(this.raiz, "#voltar-regioes-entregador")?.addEventListener("click", () => this.renderizarEntregador());
    const conteudoRegiao = selecionar<HTMLElement>(this.raiz, "main");
    if (conteudoRegiao) delegarEvento(conteudoRegiao, "click", "[data-abrir-pacote-regiao]", (botao) => {
      const pacote = this.cargaEntregador?.pacotes.find((item) => item.id === botao.dataset.abrirPacoteRegiao);
      if (pacote) this.abrirFluxoEntrega(pacote);
    });
  }


  private async salvarCargaEntregador() {
    if (!this.cargaEntregador) return;
    await this.dependencias.repositorioCargas.salvarCarga(this.cargaEntregador.entregadorId, this.cargaEntregador);
  }

  private renderizarScanner(mensagem = "") {
    if (!this.cargaEntregador) return;

    this.raiz.innerHTML = telaScanner(
      this.cargaEntregador.nomeEntregador,
      mensagem,
    );

    const input = selecionar<HTMLInputElement>(this.raiz, "#codigo-scanner");
    const foto = selecionar<HTMLInputElement>(this.raiz, "#foto-scanner");
    const status = selecionar<HTMLElement>(this.raiz, "#status-scanner-foto");

    const abrirPacote = (pacote: PacoteDaCarga) => {
      this.abrirFluxoEntrega(pacote);
    };

    const procurarManual = () => {
      if (!this.cargaEntregador) return;

      const resultado = localizarPacote(
        this.cargaEntregador.pacotes,
        input?.value ?? "",
      );

      if (resultado.erro || resultado.encontrados.length !== 1) {
        this.renderizarScanner(
          resultado.erro ?? "Nao foi possivel localizar o pacote.",
        );
        return;
      }

      abrirPacote(resultado.encontrados[0]);
    };

    foto?.addEventListener("change", async () => {
      const arquivo = foto.files?.[0];
      if (!arquivo || !this.cargaEntregador) return;

      try {
        if (status) {
          status.textContent = "Lendo codigo da foto...";
          status.dataset.estado = "processando";
        }

        const leitura = await lerCodigosDaFoto(arquivo);
        const resolvido = resolverFotoNaCarga(
          this.cargaEntregador.pacotes,
          leitura.codigos,
        );

        if (!resolvido.pacote) {
          this.renderizarScanner(
            resolvido.erro ?? "Nao foi possivel localizar o pacote pela foto.",
          );
          return;
        }

        abrirPacote(resolvido.pacote);
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

    selecionar(this.raiz, "#voltar-entregador")?.addEventListener("click", () => this.renderizarEntregador());
  }

  private abrirFluxoEntrega(pacote: PacoteDaCarga) {
    this.controladorFluxoEntrega = new ControladorFluxoEntrega(
      this.raiz,
      this.dependencias,
      pacote,
      () => this.salvarCargaEntregador(),
      {
        voltarScanner: () => {
          this.controladorFluxoEntrega = null;
          this.renderizarScanner();
        },
        voltarEntregador: () => {
          this.controladorFluxoEntrega = null;
          this.renderizarEntregador();
        },
      },
    );
    this.controladorFluxoEntrega.mostrarPacoteEncontrado();
  }

}

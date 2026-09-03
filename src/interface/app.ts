import { prepararDadosTeste } from "../infraestrutura/mock/preparar-dados-teste";
import type { DependenciasAplicacao } from "../configuracao/dependencias";
import type { CargaEntregador, CargaImportada, PacoteDaCarga } from "../dominio/carga/tipos";
import type { MotivoNaoEntrega, TipoEvidenciaFoto, TipoRecebedor } from "../dominio/entrega/tipos";
import type { ContaAcessoEntregador, PerfilEntregador, UsuarioAtual } from "../dominio/identidade/tipos";
import { ConciliadorPerfisPlanilha } from "../aplicacao/identidade/conciliar-perfis-planilha";
import { criarPerfilEntregador } from "../aplicacao/identidade/criar-perfil-entregador";
import { normalizarNomeExcel } from "../aplicacao/identidade/normalizar-nome-excel";
import { salvarPerfilComAcesso } from "../aplicacao/identidade/salvar-perfil-com-acesso";
import { listarPerfisSemContaAtiva } from "../aplicacao/identidade/validar-acesso-perfis";
import { particionarCargaPorPerfil } from "../aplicacao/carga/particionar-carga-por-perfil";
import { resolverTelaInicial } from "../aplicacao/navegacao/resolver-tela-inicial";
import {
  adicionarFoto,
  cancelarPreparacao,
  confirmarEntrega,
  definirRecebedor,
  desfazerUltimaConclusao,
  iniciarEntrega,
  marcarNaoEntregue,
  obterEstadoEntrega,
  pausarEntrega,
  removerFoto,
} from "../aplicacao/estado-entrega";
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
import { telaPacoteEncontrado } from "./telas/tela-pacote-encontrado";
import { telaFotosEntrega } from "./telas/tela-fotos-entrega";
import { telaRecebedor } from "./telas/tela-recebedor";
import { telaFinalizarEntrega } from "./telas/tela-finalizar-entrega";
import { telaNaoEntregue } from "./telas/tela-nao-entregue";
import { telaOpcoesEntrega } from "./telas/tela-opcoes-entrega";
import { telaResultadoEntrega } from "./telas/tela-resultado-entrega";
import { telaAdminCargas, telaNovaCargaManual } from "./telas/tela-admin-cargas";
import { telaAdminCargaDetalhe } from "./telas/tela-admin-carga-detalhe";
import { telaAdminLocalizacaoPacote } from "./telas/tela-admin-localizacao-pacote";
import { telaAdminIntegracoes } from "./telas/tela-admin-integracoes";
import { telaEntregadorRegiao } from "./telas/tela-entregador-regiao";
import { definirLocalizacaoPacote, definirRegiaoEmLote } from "../aplicacao/regiao/atribuir-localizacao-pacote";
import { associarEnderecosNaCarga } from "../aplicacao/regiao/associar-enderecos-na-carga";
import {
  adicionarPacoteNaCarga,
  criarCargaManual,
  criarPacoteManual,
  encerrarCarga,
  excluirPacoteDaCarga,
  publicarCarga,
  transferirPacote,
  transferirPacotesSelecionados,
  transferirPendentes,
} from "../aplicacao/carga/gestao-manual-carga";

const conciliador = new ConciliadorPerfisPlanilha();

type TelaEntrega = "FOTOS" | "RECEBEDOR" | "FINALIZAR";

export class AplicacaoDeliveryHub {
  private usuarioAtual: UsuarioAtual | null = null;
  private importacaoAdmin: CargaImportada | null = null;
  private cargaEntregador: CargaEntregador | null = null;
  private pacoteAtual: PacoteDaCarga | null = null;
  private telaEntregaAtual: TelaEntrega = "FOTOS";
  private compartilhamentoAtivo = false;

  constructor(
    private readonly raiz: HTMLElement,
    private readonly dependencias: DependenciasAplicacao,
  ) {}

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
    this.pacoteAtual = null;
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


  private dataHojeLocal(): string {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  private async obterTodasCargasAdmin() {
    const perfis = await this.dependencias.repositorioPerfis.listar();
    const itens: Array<{ carga: CargaEntregador; perfil: PerfilEntregador }> = [];

    for (const perfil of perfis) {
      const cargas = await this.dependencias.repositorioCargas.listarCargas(perfil.entregadorId);
      for (const carga of cargas) {
        itens.push({ carga, perfil });
      }
    }

    itens.sort((a, b) => b.carga.criadaEm.localeCompare(a.carga.criadaEm));
    return { perfis, itens };
  }

  private async renderizarAdminCargas() {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    const { itens } = await this.obterTodasCargasAdmin();
    this.raiz.innerHTML = telaAdminCargas(itens);

    document.querySelector("#voltar-admin-cargas")?.addEventListener("click", () => this.renderizarAdminImportar());
    document.querySelector("#nova-carga-manual")?.addEventListener("click", () => void this.renderizarNovaCargaManual());

    document.querySelector<HTMLInputElement>("#buscar-pacote-admin")?.addEventListener("input", (evento) => {
      const termo = (evento.currentTarget as HTMLInputElement).value.trim().toUpperCase();
      document.querySelectorAll<HTMLElement>("[data-carga-busca]").forEach((card) => {
        const conteudo = (card.dataset.cargaBusca ?? "").toUpperCase();
        card.hidden = Boolean(termo) && !conteudo.includes(termo);
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-abrir-carga]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const cargaId = botao.dataset.abrirCarga;
        const entregadorId = botao.dataset.entregador;
        if (!cargaId || !entregadorId) return;
        void this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
      });
    });
  }

  private async renderizarNovaCargaManual() {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    const perfis = await this.dependencias.repositorioPerfis.listar();
    this.raiz.innerHTML = telaNovaCargaManual(perfis, this.dataHojeLocal());

    document.querySelector("#cancelar-nova-carga")?.addEventListener("click", () => void this.renderizarAdminCargas());
    document.querySelector("#salvar-nova-carga")?.addEventListener("click", async () => {
      const entregadorId = document.querySelector<HTMLSelectElement>("#nova-carga-entregador")?.value ?? "";
      const data = document.querySelector<HTMLInputElement>("#nova-carga-data")?.value ?? "";
      if (!entregadorId || !data) {
        alert("Escolha o entregador e a data.");
        return;
      }

      const perfil = await this.dependencias.repositorioPerfis.obter(entregadorId);
      if (!perfil) return alert("Perfil nao encontrado.");

      try {
        const carga = criarCargaManual(perfil, data);
        await this.dependencias.repositorioCargas.salvarCarga(entregadorId, carga);
        await this.renderizarAdminCargaDetalhe(entregadorId, carga.cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel criar a carga.");
      }
    });
  }

  private async renderizarAdminCargaDetalhe(entregadorId: string, cargaId: string) {
    if (!this.usuarioAtual || this.usuarioAtual.tipo !== "ADMIN") return;
    const cargas = await this.dependencias.repositorioCargas.listarCargas(entregadorId);
    const carga = cargas.find((item) => item.cargaId === cargaId);
    if (!carga) {
      alert("Carga nao encontrada.");
      return this.renderizarAdminCargas();
    }

    const perfis = await this.dependencias.repositorioPerfis.listar();
    this.raiz.innerHTML = telaAdminCargaDetalhe(carga, perfis);

    document.querySelector("#voltar-lista-cargas")?.addEventListener("click", () => void this.renderizarAdminCargas());

    const salvar = async (item: CargaEntregador) => {
      await this.dependencias.repositorioCargas.salvarCarga(item.entregadorId, item);
    };

    document.querySelector("#adicionar-pacote-manual")?.addEventListener("click", async () => {
      const input = document.querySelector<HTMLInputElement>("#codigo-pacote-manual");
      const codigo = input?.value ?? "";
      const endereco = document.querySelector<HTMLInputElement>("#endereco-pacote-manual")?.value ?? "";
      try {
        const todas = await this.obterTodasCargasAdmin();
        const normalizado = criarPacoteManual(codigo, carga.nomeEntregador, endereco);
        const duplicado = todas.itens.some(({ carga: outra }) =>
          (outra.status ?? "PUBLICADA") !== "ENCERRADA" &&
          outra.dataOperacao === carga.dataOperacao &&
          outra.pacotes.some((pacote) => pacote.codigoNormalizado === normalizado.codigoNormalizado)
        );

        if (duplicado) {
          throw new Error("Este codigo ja pertence a outra carga ativa nesta data. Use TRANSFERIR em vez de duplicar.");
        }

        adicionarPacoteNaCarga(carga, normalizado);
        await salvar(carga);
        await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel adicionar.");
      }
    });

    document.querySelector<HTMLInputElement>("#codigo-pacote-manual")?.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        (document.querySelector("#adicionar-pacote-manual") as HTMLButtonElement | null)?.click();
      }
    });


    document.querySelector<HTMLInputElement>("#arquivo-enderecos")?.addEventListener("change", async (evento) => {
      const arquivo = (evento.currentTarget as HTMLInputElement).files?.[0];
      if (!arquivo) return;
      try {
        document.body.dataset.carregando = "true";
        const registros = await this.dependencias.leitorEnderecos.ler(arquivo);
        const resultado = associarEnderecosNaCarga(carga, registros);
        await salvar(carga);
        alert(`Enderecos atualizados: ${resultado.atualizados}. Nao encontrados: ${resultado.naoEncontrados.length}. Duplicados: ${resultado.duplicadosNaCarga.length}.`);
        await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel importar os enderecos.");
      } finally {
        document.body.dataset.carregando = "false";
      }
    });

    document.querySelectorAll<HTMLButtonElement>("[data-editar-localizacao]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const pacoteId = botao.dataset.editarLocalizacao;
        const pacote = carga.pacotes.find((item) => item.id === pacoteId);
        if (!pacote) return;
        this.raiz.innerHTML = telaAdminLocalizacaoPacote(pacote);

        const select = document.querySelector<HTMLSelectElement>("#localizacao-regiao");
        const campoPersonalizado = document.querySelector<HTMLElement>("#campo-regiao-personalizada");
        select?.addEventListener("change", () => {
          campoPersonalizado?.classList.toggle("campo-grande--oculto", select.value !== "OUTRA");
        });

        document.querySelector("#cancelar-localizacao")?.addEventListener("click", () => void this.renderizarAdminCargaDetalhe(entregadorId, cargaId));
        document.querySelector("#salvar-localizacao")?.addEventListener("click", async () => {
          const endereco = document.querySelector<HTMLTextAreaElement>("#localizacao-endereco")?.value ?? "";
          const escolha = select?.value ?? "AUTO";
          const personalizada = document.querySelector<HTMLInputElement>("#localizacao-regiao-personalizada")?.value ?? "";
          try {
            definirLocalizacaoPacote(pacote, {
              endereco,
              regiaoId: escolha !== "AUTO" && escolha !== "OUTRA" ? escolha : undefined,
              regiaoPersonalizada: escolha === "OUTRA" ? personalizada : undefined,
              origemRegiao: "MANUAL",
            });
            await salvar(carga);
            await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
          } catch (erro) {
            alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar a localizacao.");
          }
        });
      });
    });

    const atualizarQuantidadeSelecionados = () => {
      const quantidade = document.querySelectorAll<HTMLInputElement>("[data-selecionar-pacote]:checked").length;
      const elemento = document.querySelector("#quantidade-selecionados");
      if (elemento) elemento.textContent = String(quantidade);
    };

    document.querySelectorAll<HTMLInputElement>("[data-selecionar-pacote]").forEach((checkbox) => {
      checkbox.addEventListener("change", atualizarQuantidadeSelecionados);
    });

    const aplicarFiltrosPacotes = () => {
      const termo = document.querySelector<HTMLInputElement>("#filtro-pacotes-carga")?.value.trim().toUpperCase() ?? "";
      const regiao = document.querySelector<HTMLSelectElement>("#filtro-regiao-carga")?.value ?? "TODAS";
      document.querySelectorAll<HTMLElement>("[data-pacote-codigo]").forEach((card) => {
        const bateCodigo = !termo || (card.dataset.pacoteCodigo ?? "").toUpperCase().includes(termo);
        const bateRegiao = regiao === "TODAS" || card.dataset.pacoteRegiao === regiao;
        card.hidden = !(bateCodigo && bateRegiao);
      });
    };

    document.querySelector<HTMLInputElement>("#filtro-pacotes-carga")?.addEventListener("input", aplicarFiltrosPacotes);
    document.querySelector<HTMLSelectElement>("#filtro-regiao-carga")?.addEventListener("change", aplicarFiltrosPacotes);

    document.querySelectorAll<HTMLButtonElement>("[data-filtrar-regiao-card]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const regiao = botao.dataset.filtrarRegiaoCard ?? "TODAS";
        const selectRegiao = document.querySelector<HTMLSelectElement>("#filtro-regiao-carga");
        if (selectRegiao) selectRegiao.value = regiao;
        aplicarFiltrosPacotes();
        document.querySelector("#lista-pacotes-admin")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelector("#selecionar-regiao-visivel")?.addEventListener("click", () => {
      document.querySelectorAll<HTMLElement>("[data-pacote-codigo]").forEach((card) => {
        if (card.hidden) return;
        const checkbox = card.querySelector<HTMLInputElement>("[data-selecionar-pacote]");
        if (checkbox) checkbox.checked = true;
      });
      atualizarQuantidadeSelecionados();
    });

    document.querySelector("#limpar-selecao")?.addEventListener("click", () => {
      document.querySelectorAll<HTMLInputElement>("[data-selecionar-pacote]").forEach((checkbox) => { checkbox.checked = false; });
      atualizarQuantidadeSelecionados();
    });

    document.querySelector<HTMLSelectElement>("#regiao-lote")?.addEventListener("change", (evento) => {
      const valor = (evento.currentTarget as HTMLSelectElement).value;
      document.querySelector<HTMLInputElement>("#regiao-lote-personalizada")?.classList.toggle("input-mini--oculto", valor !== "OUTRA");
    });

    document.querySelector("#aplicar-regiao-lote")?.addEventListener("click", async () => {
      const ids = [...document.querySelectorAll<HTMLInputElement>("[data-selecionar-pacote]:checked")].map((item) => item.dataset.selecionarPacote ?? "").filter(Boolean);
      if (!ids.length) return alert("Selecione pelo menos uma encomenda.");
      const escolha = document.querySelector<HTMLSelectElement>("#regiao-lote")?.value ?? "";
      if (!escolha) return alert("Escolha a regiao que sera aplicada.");
      const personalizada = document.querySelector<HTMLInputElement>("#regiao-lote-personalizada")?.value ?? "";
      if (escolha === "OUTRA" && !personalizada.trim()) return alert("Informe o nome da regiao.");

      const alterados = definirRegiaoEmLote(
        carga.pacotes,
        ids,
        escolha === "OUTRA" ? undefined : escolha,
        escolha === "OUTRA" ? personalizada : undefined,
      );
      await salvar(carga);
      alert(`${alterados} encomenda(s) atualizada(s).`);
      await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
    });

    document.querySelector("#transferir-selecionados")?.addEventListener("click", async () => {
      const ids = [...document.querySelectorAll<HTMLInputElement>("[data-selecionar-pacote]:checked")].map((item) => item.dataset.selecionarPacote ?? "").filter(Boolean);
      const destinoId = document.querySelector<HTMLSelectElement>("#destino-transferencia-selecao")?.value ?? "";
      if (!ids.length) return alert("Selecione pelo menos uma encomenda.");
      if (!destinoId) return alert("Escolha o entregador de destino.");

      try {
        const perfilDestino = await this.dependencias.repositorioPerfis.obter(destinoId);
        if (!perfilDestino) throw new Error("Perfil de destino nao encontrado.");
        const cargasDestino = await this.dependencias.repositorioCargas.listarCargas(destinoId);
        let destino = cargasDestino.find((item) => item.dataOperacao === carga.dataOperacao && (item.status ?? "PUBLICADA") !== "ENCERRADA");
        if (!destino) {
          destino = criarCargaManual(perfilDestino, carga.dataOperacao);
          destino.status = "PUBLICADA";
          destino.publicadaEm = new Date().toISOString();
        }

        if (!confirm(`Transferir ${ids.length} encomenda(s) selecionada(s) para ${perfilDestino.nomeOficial}?`)) return;
        const resultado = transferirPacotesSelecionados(carga, destino, ids);
        await salvar(carga);
        await salvar(destino);
        alert(`Transferidos: ${resultado.movidos}. Bloqueados: ${resultado.bloqueados}. Duplicados no destino: ${resultado.duplicadosDestino}.`);
        await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel transferir a selecao.");
      }
    });

    document.querySelectorAll<HTMLButtonElement>("[data-excluir-pacote]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const pacoteId = botao.dataset.excluirPacote;
        if (!pacoteId) return;
        if (!confirm("Excluir esta encomenda da carga?")) return;
        try {
          excluirPacoteDaCarga(carga, pacoteId);
          await salvar(carga);
          await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel excluir.");
        }
      });
    });

    document.querySelectorAll<HTMLButtonElement>("[data-transferir-pacote]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const pacoteId = botao.dataset.transferirPacote;
        if (!pacoteId) return;
        const seletor = document.querySelector<HTMLSelectElement>(`[data-destino-pacote="${CSS.escape(pacoteId)}"]`);
        const destinoId = seletor?.value;
        if (!destinoId) return alert("Escolha o entregador de destino.");

        try {
          const perfilDestino = await this.dependencias.repositorioPerfis.obter(destinoId);
          if (!perfilDestino) throw new Error("Perfil de destino nao encontrado.");

          let cargasDestino = await this.dependencias.repositorioCargas.listarCargas(destinoId);
          let destino = cargasDestino.find((item) =>
            item.dataOperacao === carga.dataOperacao &&
            (item.status ?? "PUBLICADA") !== "ENCERRADA"
          );

          if (!destino) {
            destino = criarCargaManual(perfilDestino, carga.dataOperacao);
            destino.status = "PUBLICADA";
            destino.publicadaEm = new Date().toISOString();
          }

          transferirPacote(carga, destino, pacoteId);
          await salvar(carga);
          await salvar(destino);
          await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel transferir.");
        }
      });
    });

    document.querySelector("#transferir-pendentes")?.addEventListener("click", async () => {
      const destinoId = document.querySelector<HTMLSelectElement>("#destino-transferencia-total")?.value;
      if (!destinoId) return alert("Escolha o novo entregador.");

      try {
        const perfilDestino = await this.dependencias.repositorioPerfis.obter(destinoId);
        if (!perfilDestino) throw new Error("Perfil de destino nao encontrado.");

        const cargasDestino = await this.dependencias.repositorioCargas.listarCargas(destinoId);
        let destino = cargasDestino.find((item) =>
          item.dataOperacao === carga.dataOperacao &&
          (item.status ?? "PUBLICADA") !== "ENCERRADA"
        );

        if (!destino) {
          destino = criarCargaManual(perfilDestino, carga.dataOperacao);
          destino.status = "PUBLICADA";
          destino.publicadaEm = new Date().toISOString();
        }

        const pendentes = carga.pacotes.filter((pacote) => obterEstadoEntrega(pacote).estadoFisico === "PENDENTE").length;
        if (!pendentes) throw new Error("Nao existem pacotes pendentes para transferir.");

        if (!confirm(`Transferir ate ${pendentes} pacote(s) pendente(s) para ${perfilDestino.nomeOficial}?`)) return;

        const movidos = transferirPendentes(carga, destino);
        await salvar(carga);
        await salvar(destino);
        alert(`${movidos} pacote(s) transferido(s).`);
        await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel transferir a carga.");
      }
    });

    document.querySelector("#publicar-carga")?.addEventListener("click", async () => {
      try {
        publicarCarga(carga);
        await salvar(carga);
        await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel publicar.");
      }
    });

    document.querySelector("#encerrar-carga")?.addEventListener("click", async () => {
      if (!confirm("Encerrar esta carga? Depois disso ela nao podera ser alterada.")) return;
      try {
        encerrarCarga(carga);
        await salvar(carga);
        await this.renderizarAdminCargaDetalhe(entregadorId, cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel encerrar.");
      }
    });
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

    document.querySelector("#abrir-scanner")?.addEventListener("click", () => this.renderizarScanner());

    document.querySelector("#atualizar-carga")?.addEventListener("click", () => void this.carregarCargaEntregador());
    document.querySelectorAll<HTMLButtonElement>("[data-abrir-regiao]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const regiaoId = botao.dataset.abrirRegiao;
        if (regiaoId) this.renderizarEntregadorRegiao(regiaoId);
      });
    });
    document.querySelectorAll<HTMLButtonElement>("[data-abrir-pacote]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const pacote = this.cargaEntregador?.pacotes.find((item) => item.id === botao.dataset.abrirPacote);
        if (!pacote) return;
        this.pacoteAtual = pacote;
        this.renderizarPacoteEncontrado();
      });
    });
  }


  private renderizarEntregadorRegiao(regiaoId: string) {
    if (!this.cargaEntregador) return;
    this.raiz.innerHTML = telaEntregadorRegiao(this.cargaEntregador, regiaoId);
    document.querySelector("#voltar-regioes-entregador")?.addEventListener("click", () => this.renderizarEntregador());
    document.querySelectorAll<HTMLButtonElement>("[data-abrir-pacote-regiao]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const pacote = this.cargaEntregador?.pacotes.find((item) => item.id === botao.dataset.abrirPacoteRegiao);
        if (!pacote) return;
        this.pacoteAtual = pacote;
        this.renderizarPacoteEncontrado();
      });
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

    const input = document.querySelector<HTMLInputElement>("#codigo-scanner");
    const foto = document.querySelector<HTMLInputElement>("#foto-scanner");
    const status = document.querySelector<HTMLElement>("#status-scanner-foto");

    const abrirPacote = (pacote: PacoteDaCarga) => {
      this.pacoteAtual = pacote;
      this.renderizarPacoteEncontrado();
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

    document
      .querySelector("#procurar-pacote")
      ?.addEventListener("click", procurarManual);

    input?.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") procurarManual();
    });

    document
      .querySelector("#voltar-entregador")
      ?.addEventListener("click", () => this.renderizarEntregador());
  }

  private renderizarPacoteEncontrado() {
    if (!this.pacoteAtual) return;
    this.raiz.innerHTML = telaPacoteEncontrado(this.pacoteAtual);
    document.querySelector("#voltar-scanner")?.addEventListener("click", () => { this.pacoteAtual = null; this.renderizarScanner(); });
    document.querySelector("#iniciar-entrega")?.addEventListener("click", async () => {
      if (!this.pacoteAtual) return;
      iniciarEntrega(this.pacoteAtual);
      await this.salvarCargaEntregador();
      this.telaEntregaAtual = "FOTOS";
      this.renderizarFluxoEntrega();
    });
    document.querySelector("#desfazer-conclusao")?.addEventListener("click", async () => {
      if (!this.pacoteAtual) return;
      try { desfazerUltimaConclusao(this.pacoteAtual); await this.salvarCargaEntregador(); this.renderizarPacoteEncontrado(); }
      catch (erro) { alert(erro instanceof Error ? erro.message : "Nao foi possivel desfazer."); }
    });
  }

  private renderizarFluxoEntrega() {
    if (!this.pacoteAtual) return;
    if (this.telaEntregaAtual === "FOTOS") { this.raiz.innerHTML = telaFotosEntrega(this.pacoteAtual); this.ligarTelaFotos(); return; }
    if (this.telaEntregaAtual === "RECEBEDOR") { this.raiz.innerHTML = telaRecebedor(this.pacoteAtual); this.ligarTelaRecebedor(); return; }
    this.raiz.innerHTML = telaFinalizarEntrega(this.pacoteAtual); this.ligarTelaFinalizar();
  }

  private ligarTelaFotos() {
    document.querySelectorAll<HTMLInputElement>("[data-foto-tipo]").forEach((input) => {
      input.addEventListener("change", async () => {
        const arquivo = input.files?.[0];
        const tipo = input.dataset.fotoTipo as TipoEvidenciaFoto | undefined;
        if (!arquivo || !tipo || !this.pacoteAtual) return;
        try {
          document.body.dataset.carregando = "true";
          const salvo = await this.dependencias.repositorioFotos.salvar(arquivo);
          const anterior = adicionarFoto(this.pacoteAtual, { id: crypto.randomUUID(), tipo, chaveArquivo: salvo.chave, capturadaEm: new Date().toISOString(), tamanhoBytes: salvo.tamanhoBytes });
          if (anterior) await this.dependencias.repositorioFotos.remover(anterior);
          await this.salvarCargaEntregador();
          this.renderizarFluxoEntrega();
        } catch (erro) { alert(erro instanceof Error ? erro.message : "Falha ao salvar foto."); }
        finally { document.body.dataset.carregando = "false"; }
      });
    });
    document.querySelectorAll<HTMLButtonElement>("[data-remover-foto]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        if (!this.pacoteAtual) return;
        const chave = removerFoto(this.pacoteAtual, botao.dataset.removerFoto as TipoEvidenciaFoto);
        if (chave) await this.dependencias.repositorioFotos.remover(chave);
        await this.salvarCargaEntregador();
        this.renderizarFluxoEntrega();
      });
    });
    document.querySelector("#ir-recebedor")?.addEventListener("click", () => { this.telaEntregaAtual = "RECEBEDOR"; this.renderizarFluxoEntrega(); });
    document.querySelector("#opcoes-entrega")?.addEventListener("click", () => this.renderizarOpcoesEntrega());
  }

  private ligarTelaRecebedor() {
    const campoNome = document.querySelector<HTMLElement>("#campo-nome-recebedor");
    const inputNome = document.querySelector<HTMLInputElement>("#nome-recebedor");
    let tipoSelecionado = obterEstadoEntrega(this.pacoteAtual!).recebedor?.tipo;
    document.querySelectorAll<HTMLButtonElement>("[data-recebedor]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        if (!this.pacoteAtual) return;
        tipoSelecionado = botao.dataset.recebedor as TipoRecebedor;
        document.querySelectorAll<HTMLButtonElement>("[data-recebedor]").forEach((item) => { item.dataset.selecionado = String(item === botao); });
        campoNome?.classList.toggle("campo-grande--oculto", tipoSelecionado === "PROPRIO");
        definirRecebedor(this.pacoteAtual, { tipo: tipoSelecionado, nome: tipoSelecionado === "PROPRIO" ? undefined : inputNome?.value.trim() || undefined });
        await this.salvarCargaEntregador();
        const proximo = document.querySelector<HTMLButtonElement>("#ir-finalizar"); if (proximo) proximo.disabled = false;
      });
    });
    inputNome?.addEventListener("input", async () => {
      if (!this.pacoteAtual || !tipoSelecionado || tipoSelecionado === "PROPRIO") return;
      definirRecebedor(this.pacoteAtual, { tipo: tipoSelecionado, nome: inputNome.value.trim() || undefined });
      await this.salvarCargaEntregador();
    });
    document.querySelector("#voltar-fotos")?.addEventListener("click", () => { this.telaEntregaAtual = "FOTOS"; this.renderizarFluxoEntrega(); });
    document.querySelector("#ir-finalizar")?.addEventListener("click", () => { if (!this.pacoteAtual || !obterEstadoEntrega(this.pacoteAtual).recebedor) return; this.telaEntregaAtual = "FINALIZAR"; this.renderizarFluxoEntrega(); });
  }

  private ligarTelaFinalizar() {
    document.querySelector("#voltar-recebedor")?.addEventListener("click", () => { this.telaEntregaAtual = "RECEBEDOR"; this.renderizarFluxoEntrega(); });
    document.querySelector("#confirmar-entrega")?.addEventListener("click", async () => {
      if (!this.pacoteAtual) return;
      try { confirmarEntrega(this.pacoteAtual); await this.salvarCargaEntregador(); this.renderizarResultadoEntrega(); }
      catch (erro) { alert(erro instanceof Error ? erro.message : "Nao foi possivel concluir."); }
    });
    document.querySelector("#abrir-nao-entregue")?.addEventListener("click", () => { if (!this.pacoteAtual) return; this.raiz.innerHTML = telaNaoEntregue(this.pacoteAtual); this.ligarTelaNaoEntregue(); });
    document.querySelector("#opcoes-entrega")?.addEventListener("click", () => this.renderizarOpcoesEntrega());
  }

  private ligarTelaNaoEntregue() {
    document.querySelectorAll<HTMLButtonElement>("[data-motivo]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        if (!this.pacoteAtual) return;
        marcarNaoEntregue(this.pacoteAtual, botao.dataset.motivo as MotivoNaoEntrega);
        await this.salvarCargaEntregador();
        this.renderizarResultadoEntrega();
      });
    });
    document.querySelector("#voltar-finalizar")?.addEventListener("click", () => { this.telaEntregaAtual = "FINALIZAR"; this.renderizarFluxoEntrega(); });
  }

  private renderizarOpcoesEntrega() {
    if (!this.pacoteAtual) return;
    this.raiz.innerHTML = telaOpcoesEntrega(this.pacoteAtual);
    document.querySelector("#pausar-entrega")?.addEventListener("click", async () => { if (!this.pacoteAtual) return; pausarEntrega(this.pacoteAtual); await this.salvarCargaEntregador(); this.pacoteAtual = null; this.renderizarEntregador(); });
    document.querySelector("#cancelar-preparacao")?.addEventListener("click", async () => {
      if (!this.pacoteAtual || !confirm("Cancelar a preparacao e apagar as fotos registradas deste pacote?")) return;
      try {
        const arquivos = cancelarPreparacao(this.pacoteAtual); for (const chave of arquivos) await this.dependencias.repositorioFotos.remover(chave);
        await this.salvarCargaEntregador(); this.pacoteAtual = null; this.renderizarScanner();
      } catch (erro) { alert(erro instanceof Error ? erro.message : "Nao foi possivel cancelar."); }
    });
    document.querySelector("#voltar-operacao")?.addEventListener("click", () => this.renderizarFluxoEntrega());
  }

  private renderizarResultadoEntrega() {
    if (!this.pacoteAtual) return;
    this.raiz.innerHTML = telaResultadoEntrega(this.pacoteAtual);
    document.querySelector("#desfazer-conclusao")?.addEventListener("click", async () => {
      if (!this.pacoteAtual) return;
      try { desfazerUltimaConclusao(this.pacoteAtual); await this.salvarCargaEntregador(); this.telaEntregaAtual = "FINALIZAR"; this.renderizarFluxoEntrega(); }
      catch (erro) { alert(erro instanceof Error ? erro.message : "Nao foi possivel desfazer."); }
    });
    document.querySelector("#proximo-pacote")?.addEventListener("click", () => { this.pacoteAtual = null; this.renderizarScanner(); });
  }
}

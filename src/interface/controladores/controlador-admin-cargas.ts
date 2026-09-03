import type { DependenciasAplicacao } from "../../configuracao/dependencias";
import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
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
} from "../../aplicacao/carga/gestao-manual-carga";
import { associarEnderecosNaCarga } from "../../aplicacao/regiao/associar-enderecos-na-carga";
import { definirLocalizacaoPacote, definirRegiaoEmLote } from "../../aplicacao/regiao/atribuir-localizacao-pacote";
import { resumirCargaPorRegiao } from "../../aplicacao/regiao/resumir-carga-por-regiao";
import { telaAdminCargas, telaNovaCargaManual } from "../telas/tela-admin-cargas";
import {
  htmlPacoteAdminCard,
  htmlResumoRegioesAdmin,
  telaAdminCargaDetalhe,
} from "../telas/tela-admin-carga-detalhe";
import { conteudoAdminLocalizacaoPacote } from "../telas/tela-admin-localizacao-pacote";
import { abrirBottomSheet } from "../componentes/bottom-sheet";
import {
  criarEstadoDetalheCargaAdmin,
  criarEstadoListaCargasAdmin,
  type EstadoDetalheCargaAdmin,
  EstadoUiSessao,
} from "../nucleo/estado-ui";
import {
  delegarEvento,
  obterScrollPrincipal,
  restaurarScrollPrincipal,
  selecionar,
  selecionarTodos,
} from "../nucleo/dom";

interface NavegacaoAdminCargas {
  voltarInicio: () => void;
}

export class ControladorAdminCargas {
  constructor(
    private readonly raiz: HTMLElement,
    private readonly dependencias: DependenciasAplicacao,
    private readonly estadoUi: EstadoUiSessao,
    private readonly navegacao: NavegacaoAdminCargas,
  ) {}

  private dataHojeLocal(): string {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  private async obterTodasCargas() {
    const perfis = await this.dependencias.repositorioPerfis.listar();
    const itens: Array<{ carga: CargaEntregador; perfil: PerfilEntregador }> = [];

    for (const perfil of perfis) {
      const cargas = await this.dependencias.repositorioCargas.listarCargas(perfil.entregadorId);
      for (const carga of cargas) itens.push({ carga, perfil });
    }

    itens.sort((a, b) => b.carga.criadaEm.localeCompare(a.carga.criadaEm));
    return { perfis, itens };
  }

  async mostrarLista(): Promise<void> {
    const { itens } = await this.obterTodasCargas();
    const chaveEstado = "admin:cargas";
    const estado = this.estadoUi.obter(chaveEstado, criarEstadoListaCargasAdmin);

    this.raiz.innerHTML = telaAdminCargas(itens);

    const busca = selecionar<HTMLInputElement>(this.raiz, "#buscar-pacote-admin");
    if (busca) busca.value = estado.busca;

    const aplicarBusca = () => {
      const termo = busca?.value.trim().toUpperCase() ?? "";
      estado.busca = busca?.value ?? "";
      selecionarTodos<HTMLElement>(this.raiz, "[data-carga-busca]").forEach((card) => {
        const conteudo = (card.dataset.cargaBusca ?? "").toUpperCase();
        card.hidden = Boolean(termo) && !conteudo.includes(termo);
      });
    };

    aplicarBusca();
    restaurarScrollPrincipal(estado.scrollTop);

    selecionar(this.raiz, "#voltar-admin-cargas")?.addEventListener("click", () => {
      estado.scrollTop = obterScrollPrincipal();
      this.navegacao.voltarInicio();
    });
    selecionar(this.raiz, "#nova-carga-manual")?.addEventListener("click", () => void this.mostrarNovaCargaManual());
    busca?.addEventListener("input", aplicarBusca);

    const listaCargas = selecionar<HTMLElement>(this.raiz, "#lista-cargas-admin");
    if (listaCargas) delegarEvento(listaCargas, "click", "[data-abrir-carga]", (botao) => {
      const cargaId = botao.dataset.abrirCarga;
      const entregadorId = botao.dataset.entregador;
      if (!cargaId || !entregadorId) return;
      estado.scrollTop = obterScrollPrincipal();
      void this.mostrarDetalhe(entregadorId, cargaId);
    });
  }

  private async mostrarNovaCargaManual(): Promise<void> {
    const perfis = await this.dependencias.repositorioPerfis.listar();
    this.raiz.innerHTML = telaNovaCargaManual(perfis, this.dataHojeLocal());

    selecionar(this.raiz, "#cancelar-nova-carga")?.addEventListener("click", () => void this.mostrarLista());
    selecionar(this.raiz, "#salvar-nova-carga")?.addEventListener("click", async () => {
      const entregadorId = selecionar<HTMLSelectElement>(this.raiz, "#nova-carga-entregador")?.value ?? "";
      const data = selecionar<HTMLInputElement>(this.raiz, "#nova-carga-data")?.value ?? "";
      if (!entregadorId || !data) return alert("Escolha o entregador e a data.");

      const perfil = await this.dependencias.repositorioPerfis.obter(entregadorId);
      if (!perfil) return alert("Perfil nao encontrado.");

      try {
        const carga = criarCargaManual(perfil, data);
        await this.dependencias.repositorioCargas.salvarCarga(entregadorId, carga);
        await this.mostrarDetalhe(entregadorId, carga.cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel criar a carga.");
      }
    });
  }

  async mostrarDetalhe(entregadorId: string, cargaId: string): Promise<void> {
    const cargas = await this.dependencias.repositorioCargas.listarCargas(entregadorId);
    const carga = cargas.find((item) => item.cargaId === cargaId);
    if (!carga) {
      alert("Carga nao encontrada.");
      await this.mostrarLista();
      return;
    }

    const perfis = await this.dependencias.repositorioPerfis.listar();
    const chaveEstado = `admin:carga:${entregadorId}:${cargaId}`;
    const estado = this.estadoUi.obter(chaveEstado, criarEstadoDetalheCargaAdmin);
    this.raiz.innerHTML = telaAdminCargaDetalhe(carga, perfis);
    const telaDetalhe = selecionar<HTMLElement>(this.raiz, "[data-tela=\"admin-carga-detalhe\"]");

    const filtroCodigo = selecionar<HTMLInputElement>(this.raiz, "#filtro-pacotes-carga");
    const filtroRegiao = selecionar<HTMLSelectElement>(this.raiz, "#filtro-regiao-carga");
    if (filtroCodigo) filtroCodigo.value = estado.filtroCodigo;
    if (filtroRegiao && Array.from(filtroRegiao.options).some((opcao) => opcao.value === estado.filtroRegiao)) {
      filtroRegiao.value = estado.filtroRegiao;
    }

    const salvar = async (item: CargaEntregador) => {
      await this.dependencias.repositorioCargas.salvarCarga(item.entregadorId, item);
    };

    const capturarEstadoAntesDeRenderizar = () => {
      estado.filtroCodigo = filtroCodigo?.value ?? estado.filtroCodigo;
      estado.filtroRegiao = filtroRegiao?.value ?? estado.filtroRegiao;
      estado.selecionados = this.idsSelecionados();
      estado.scrollTop = obterScrollPrincipal();
    };

    const renderizarNovamente = async (selecionadosForcados?: string[]) => {
      capturarEstadoAntesDeRenderizar();
      if (selecionadosForcados) estado.selecionados = selecionadosForcados;
      await this.mostrarDetalhe(entregadorId, cargaId);
    };

    const aplicarFiltros = () => {
      const termo = filtroCodigo?.value.trim().toUpperCase() ?? "";
      const regiao = filtroRegiao?.value ?? "TODAS";
      estado.filtroCodigo = filtroCodigo?.value ?? "";
      estado.filtroRegiao = regiao;
      selecionarTodos<HTMLElement>(this.raiz, "[data-pacote-codigo]").forEach((card) => {
        const bateCodigo = !termo || (card.dataset.pacoteCodigo ?? "").toUpperCase().includes(termo);
        const bateRegiao = regiao === "TODAS" || card.dataset.pacoteRegiao === regiao;
        card.hidden = !(bateCodigo && bateRegiao);
      });
    };

    const atualizarQuantidadeSelecionados = () => {
      estado.selecionados = this.idsSelecionados();
      const elemento = selecionar<HTMLElement>(this.raiz, "#quantidade-selecionados");
      if (elemento) elemento.textContent = String(estado.selecionados.length);
    };

    this.restaurarSelecionados(estado);
    aplicarFiltros();
    atualizarQuantidadeSelecionados();
    restaurarScrollPrincipal(estado.scrollTop);

    selecionar(this.raiz, "#voltar-lista-cargas")?.addEventListener("click", () => {
      capturarEstadoAntesDeRenderizar();
      void this.mostrarLista();
    });

    selecionar(this.raiz, "#adicionar-pacote-manual")?.addEventListener("click", async () => {
      const codigo = selecionar<HTMLInputElement>(this.raiz, "#codigo-pacote-manual")?.value ?? "";
      const endereco = selecionar<HTMLInputElement>(this.raiz, "#endereco-pacote-manual")?.value ?? "";
      try {
        const todas = await this.obterTodasCargas();
        const normalizado = criarPacoteManual(codigo, carga.nomeEntregador, endereco);
        const duplicado = todas.itens.some(({ carga: outra }) =>
          (outra.status ?? "PUBLICADA") !== "ENCERRADA" &&
          outra.dataOperacao === carga.dataOperacao &&
          outra.pacotes.some((pacote) => pacote.codigoNormalizado === normalizado.codigoNormalizado),
        );
        if (duplicado) throw new Error("Este codigo ja pertence a outra carga ativa nesta data. Use TRANSFERIR em vez de duplicar.");
        adicionarPacoteNaCarga(carga, normalizado);
        await salvar(carga);
        await renderizarNovamente();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel adicionar.");
      }
    });

    selecionar<HTMLInputElement>(this.raiz, "#codigo-pacote-manual")?.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter") return;
      evento.preventDefault();
      selecionar<HTMLButtonElement>(this.raiz, "#adicionar-pacote-manual")?.click();
    });

    selecionar<HTMLInputElement>(this.raiz, "#arquivo-enderecos")?.addEventListener("change", async (evento) => {
      const arquivo = (evento.currentTarget as HTMLInputElement).files?.[0];
      if (!arquivo) return;
      try {
        document.body.dataset.carregando = "true";
        const registros = await this.dependencias.leitorEnderecos.ler(arquivo);
        const resultado = associarEnderecosNaCarga(carga, registros);
        await salvar(carga);
        alert(`Enderecos atualizados: ${resultado.atualizados}. Nao encontrados: ${resultado.naoEncontrados.length}. Duplicados: ${resultado.duplicadosNaCarga.length}.`);
        await renderizarNovamente();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel importar os enderecos.");
      } finally {
        document.body.dataset.carregando = "false";
      }
    });

    filtroCodigo?.addEventListener("input", aplicarFiltros);
    filtroRegiao?.addEventListener("change", aplicarFiltros);

    telaDetalhe && delegarEvento(telaDetalhe, "click", "[data-filtrar-regiao-card]", (botao) => {
      const regiao = botao.dataset.filtrarRegiaoCard ?? "TODAS";
      if (filtroRegiao && Array.from(filtroRegiao.options).some((opcao) => opcao.value === regiao)) {
        filtroRegiao.value = regiao;
      }
      aplicarFiltros();
      selecionar(this.raiz, "#lista-pacotes-admin")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    telaDetalhe && delegarEvento(telaDetalhe, "change", "[data-selecionar-pacote]", () => atualizarQuantidadeSelecionados());

    selecionar(this.raiz, "#selecionar-regiao-visivel")?.addEventListener("click", () => {
      selecionarTodos<HTMLElement>(this.raiz, "[data-pacote-codigo]").forEach((card) => {
        if (card.hidden) return;
        const checkbox = selecionar<HTMLInputElement>(card, "[data-selecionar-pacote]");
        if (checkbox) checkbox.checked = true;
      });
      atualizarQuantidadeSelecionados();
    });

    selecionar(this.raiz, "#limpar-selecao")?.addEventListener("click", () => {
      selecionarTodos<HTMLInputElement>(this.raiz, "[data-selecionar-pacote]").forEach((checkbox) => { checkbox.checked = false; });
      atualizarQuantidadeSelecionados();
    });

    selecionar<HTMLSelectElement>(this.raiz, "#regiao-lote")?.addEventListener("change", (evento) => {
      const valor = (evento.currentTarget as HTMLSelectElement).value;
      selecionar<HTMLInputElement>(this.raiz, "#regiao-lote-personalizada")?.classList.toggle("input-mini--oculto", valor !== "OUTRA");
    });

    selecionar(this.raiz, "#aplicar-regiao-lote")?.addEventListener("click", async () => {
      const ids = this.idsSelecionados();
      if (!ids.length) return alert("Selecione pelo menos uma encomenda.");
      const escolha = selecionar<HTMLSelectElement>(this.raiz, "#regiao-lote")?.value ?? "";
      if (!escolha) return alert("Escolha a regiao que sera aplicada.");
      const personalizada = selecionar<HTMLInputElement>(this.raiz, "#regiao-lote-personalizada")?.value ?? "";
      if (escolha === "OUTRA" && !personalizada.trim()) return alert("Informe o nome da regiao.");

      const alterados = definirRegiaoEmLote(
        carga.pacotes,
        ids,
        escolha === "OUTRA" ? undefined : escolha,
        escolha === "OUTRA" ? personalizada : undefined,
      );
      await salvar(carga);
      alert(`${alterados} encomenda(s) atualizada(s).`);
      await renderizarNovamente();
    });

    selecionar(this.raiz, "#transferir-selecionados")?.addEventListener("click", async () => {
      const ids = this.idsSelecionados();
      const destinoId = selecionar<HTMLSelectElement>(this.raiz, "#destino-transferencia-selecao")?.value ?? "";
      if (!ids.length) return alert("Selecione pelo menos uma encomenda.");
      if (!destinoId) return alert("Escolha o entregador de destino.");
      try {
        const { destino, perfilDestino } = await this.obterOuCriarCargaDestino(carga, destinoId);
        if (!confirm(`Transferir ${ids.length} encomenda(s) selecionada(s) para ${perfilDestino.nomeOficial}?`)) return;
        const resultado = transferirPacotesSelecionados(carga, destino, ids);
        await salvar(carga);
        await salvar(destino);
        alert(`Transferidos: ${resultado.movidos}. Bloqueados: ${resultado.bloqueados}. Duplicados no destino: ${resultado.duplicadosDestino}.`);
        await renderizarNovamente([]);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel transferir a selecao.");
      }
    });

    telaDetalhe && delegarEvento(telaDetalhe, "click", "[data-editar-localizacao]", (botao) => {
      const pacoteId = botao.dataset.editarLocalizacao;
      const pacote = carga.pacotes.find((item) => item.id === pacoteId);
      if (!pacote) return;
      this.abrirEdicaoLocalizacao(carga, pacote, perfis, salvar, aplicarFiltros);
    });

    telaDetalhe && delegarEvento(telaDetalhe, "click", "[data-excluir-pacote]", (botao) => {
      const pacoteId = botao.dataset.excluirPacote;
      if (!pacoteId || !confirm("Excluir esta encomenda da carga?")) return;
      void (async () => {
        try {
          excluirPacoteDaCarga(carga, pacoteId);
          await salvar(carga);
          const restantesSelecionados = this.idsSelecionados().filter((id) => id !== pacoteId);
          await renderizarNovamente(restantesSelecionados);
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel excluir.");
        }
      })();
    });

    telaDetalhe && delegarEvento(telaDetalhe, "click", "[data-transferir-pacote]", (botao) => {
      const pacoteId = botao.dataset.transferirPacote;
      if (!pacoteId) return;
      const seletor = selecionar<HTMLSelectElement>(this.raiz, `[data-destino-pacote="${CSS.escape(pacoteId)}"]`);
      const destinoId = seletor?.value;
      if (!destinoId) return alert("Escolha o entregador de destino.");
      void (async () => {
        try {
          const { destino } = await this.obterOuCriarCargaDestino(carga, destinoId);
          transferirPacote(carga, destino, pacoteId);
          await salvar(carga);
          await salvar(destino);
          const restantesSelecionados = this.idsSelecionados().filter((id) => id !== pacoteId);
          await renderizarNovamente(restantesSelecionados);
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel transferir.");
        }
      })();
    });

    selecionar(this.raiz, "#transferir-pendentes")?.addEventListener("click", async () => {
      const destinoId = selecionar<HTMLSelectElement>(this.raiz, "#destino-transferencia-total")?.value;
      if (!destinoId) return alert("Escolha o novo entregador.");
      try {
        const { destino, perfilDestino } = await this.obterOuCriarCargaDestino(carga, destinoId);
        const pendentes = carga.pacotes.filter((pacote) => obterEstadoEntrega(pacote).estadoFisico === "PENDENTE").length;
        if (!pendentes) throw new Error("Nao existem pacotes pendentes para transferir.");
        if (!confirm(`Transferir ate ${pendentes} pacote(s) pendente(s) para ${perfilDestino.nomeOficial}?`)) return;
        const movidos = transferirPendentes(carga, destino);
        await salvar(carga);
        await salvar(destino);
        alert(`${movidos} pacote(s) transferido(s).`);
        await renderizarNovamente([]);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel transferir a carga.");
      }
    });

    selecionar(this.raiz, "#publicar-carga")?.addEventListener("click", async () => {
      try {
        publicarCarga(carga);
        await salvar(carga);
        await renderizarNovamente();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel publicar.");
      }
    });

    selecionar(this.raiz, "#encerrar-carga")?.addEventListener("click", async () => {
      if (!confirm("Encerrar esta carga? Depois disso ela nao podera ser alterada.")) return;
      try {
        encerrarCarga(carga);
        await salvar(carga);
        await renderizarNovamente();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel encerrar.");
      }
    });
  }

  private idsSelecionados(): string[] {
    return selecionarTodos<HTMLInputElement>(this.raiz, "[data-selecionar-pacote]:checked")
      .map((item) => item.dataset.selecionarPacote ?? "")
      .filter(Boolean);
  }

  private restaurarSelecionados(estado: EstadoDetalheCargaAdmin): void {
    const conjunto = new Set(estado.selecionados);
    selecionarTodos<HTMLInputElement>(this.raiz, "[data-selecionar-pacote]").forEach((checkbox) => {
      checkbox.checked = conjunto.has(checkbox.dataset.selecionarPacote ?? "");
    });
  }

  private async obterOuCriarCargaDestino(carga: CargaEntregador, destinoId: string) {
    const perfilDestino = await this.dependencias.repositorioPerfis.obter(destinoId);
    if (!perfilDestino) throw new Error("Perfil de destino nao encontrado.");

    const cargasDestino = await this.dependencias.repositorioCargas.listarCargas(destinoId);
    let destino = cargasDestino.find((item) =>
      item.dataOperacao === carga.dataOperacao && (item.status ?? "PUBLICADA") !== "ENCERRADA",
    );

    if (!destino) {
      destino = criarCargaManual(perfilDestino, carga.dataOperacao);
      destino.status = "PUBLICADA";
      destino.publicadaEm = new Date().toISOString();
    }

    return { destino, perfilDestino };
  }

  private abrirEdicaoLocalizacao(
    carga: CargaEntregador,
    pacote: CargaEntregador["pacotes"][number],
    perfis: PerfilEntregador[],
    salvar: (carga: CargaEntregador) => Promise<void>,
    reaplicarFiltros: () => void,
  ): void {
    let alterado = false;
    const sheet = abrirBottomSheet({
      id: "editar-localizacao-pacote",
      titulo: "Endereco e regiao",
      subtitulo: pacote.codigoNormalizado,
      conteudoHtml: conteudoAdminLocalizacaoPacote(pacote),
      textoConfirmar: "SALVAR",
      podeFechar: () => !alterado || confirm("Descartar as alteracoes deste pacote?"),
      aoConfirmar: async (conteudo) => {
        const endereco = selecionar<HTMLTextAreaElement>(conteudo, "#localizacao-endereco")?.value ?? "";
        const select = selecionar<HTMLSelectElement>(conteudo, "#localizacao-regiao");
        const escolha = select?.value ?? "AUTO";
        const personalizada = selecionar<HTMLInputElement>(conteudo, "#localizacao-regiao-personalizada")?.value ?? "";
        try {
          definirLocalizacaoPacote(pacote, {
            endereco,
            regiaoId: escolha !== "AUTO" && escolha !== "OUTRA" ? escolha : undefined,
            regiaoPersonalizada: escolha === "OUTRA" ? personalizada : undefined,
            origemRegiao: "MANUAL",
          });
          await salvar(carga);
          this.atualizarPacoteNoDom(carga, pacote, perfis);
          reaplicarFiltros();
          alterado = false;
          return true;
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar a localizacao.");
          return false;
        }
      },
    });

    const select = selecionar<HTMLSelectElement>(sheet.conteudo, "#localizacao-regiao");
    const campoPersonalizado = selecionar<HTMLElement>(sheet.conteudo, "#campo-regiao-personalizada");
    select?.addEventListener("change", () => {
      alterado = true;
      campoPersonalizado?.classList.toggle("campo-grande--oculto", select.value !== "OUTRA");
    });
    sheet.conteudo.addEventListener("input", () => { alterado = true; });
  }

  private atualizarPacoteNoDom(carga: CargaEntregador, pacote: CargaEntregador["pacotes"][number], perfis: PerfilEntregador[]): void {
    const cardAtual = selecionar<HTMLElement>(this.raiz, `[data-pacote-id="${CSS.escape(pacote.id)}"]`);
    if (cardAtual) {
      const molde = document.createElement("template");
      molde.innerHTML = htmlPacoteAdminCard(carga, pacote, perfis).trim();
      const novo = molde.content.firstElementChild;
      if (novo) cardAtual.replaceWith(novo);
    }

    const resumo = selecionar<HTMLElement>(this.raiz, "#resumo-regioes-admin");
    if (resumo) resumo.innerHTML = htmlResumoRegioesAdmin(carga);
    const totalRegioes = selecionar<HTMLElement>(this.raiz, "#total-regioes-carga");
    if (totalRegioes) totalRegioes.textContent = String(resumirCargaPorRegiao(carga.pacotes).length);
  }
}

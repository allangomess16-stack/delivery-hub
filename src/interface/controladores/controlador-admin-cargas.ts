import type { DependenciasAplicacao } from "../../configuracao/dependencias";
import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { obterEstadoEntrega } from "../../aplicacao/estado-entrega";
import {
  adicionarPacoteNaCarga,
  criarCargaManual,
  criarPacoteManual,
  encerrarCarga,
  excluirCargaDeTeste,
  excluirPacoteDaCarga,
  publicarCarga,
  transferirPacote,
  transferirPacotesSelecionados,
  transferirPendentes,
} from "../../aplicacao/carga/gestao-manual-carga";
import { associarEnderecosNaCarga } from "../../aplicacao/regiao/associar-enderecos-na-carga";
import { definirLocalizacaoPacote, definirRegiaoEmLote } from "../../aplicacao/regiao/atribuir-localizacao-pacote";
import { resumirCargaPorRegiao } from "../../aplicacao/regiao/resumir-carga-por-regiao";
import { localizarPacotesGlobais } from "../../aplicacao/carga/localizar-pacote-global";
import { lerCodigosDaFoto } from "../../infraestrutura/scanner/leitor-codigo-foto";
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
import { obterReferenciaCarga } from "../../aplicacao/carga/referencias-carga";

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
    const filtroStatus = selecionar<HTMLSelectElement>(this.raiz, "#filtro-status-cargas");
    if (busca) busca.value = estado.busca;
    if (filtroStatus) filtroStatus.value = estado.filtroStatus ?? "ATIVA";

    const aplicarBusca = () => {
      const termo = busca?.value.trim().toUpperCase() ?? "";
      estado.busca = busca?.value ?? "";
      const statusEscolhido = filtroStatus?.value;
      estado.filtroStatus = statusEscolhido === "ARQUIVADA" || statusEscolhido === "TODAS"
        ? statusEscolhido
        : "ATIVA";
      let visiveis = 0;
      selecionarTodos<HTMLElement>(this.raiz, "[data-carga-busca]").forEach((card) => {
        const conteudo = (card.dataset.cargaBusca ?? "").toUpperCase();
        const status = card.dataset.cargaStatus ?? "ATIVA";
        const bateStatus = estado.filtroStatus === "TODAS" || status === estado.filtroStatus;
        const bateBusca = !termo || conteudo.includes(termo);
        card.hidden = !(bateStatus && bateBusca);
        if (!card.hidden) visiveis += 1;
      });
      const vazio = selecionar<HTMLElement>(this.raiz, "#nenhuma-carga-filtro");
      if (vazio) vazio.hidden = visiveis > 0;
      const contador = selecionar<HTMLElement>(this.raiz, "#total-cargas-filtradas");
      if (contador) contador.textContent = String(visiveis);
    };

    aplicarBusca();
    restaurarScrollPrincipal(estado.scrollTop);

    selecionar(this.raiz, "#voltar-admin-cargas")?.addEventListener("click", () => {
      estado.scrollTop = obterScrollPrincipal();
      this.navegacao.voltarInicio();
    });
    selecionar(this.raiz, "#nova-carga-manual")?.addEventListener("click", () => void this.mostrarNovaCargaManual());
    busca?.addEventListener("input", aplicarBusca);
    filtroStatus?.addEventListener("change", aplicarBusca);

    const localizar = async (codigos: string[]) => {
      const status = selecionar<HTMLElement>(this.raiz, "#status-scanner-admin");
      const ocorrencias = localizarPacotesGlobais(itens.map((item) => item.carga), codigos);
      if (!ocorrencias.length) {
        if (status) status.textContent = "Codigo nao encontrado em nenhuma carga.";
        return alert("Esta encomenda nao foi encontrada nas cargas registradas.");
      }
      if (ocorrencias.length > 1) {
        const resumo = ocorrencias.slice(0, 8)
          .map(({ carga }) => `${carga.nomeEntregador} — ${carga.dataOperacao} — ${carga.status ?? "PUBLICADA"}`)
          .join("\n");
        if (busca) busca.value = ocorrencias[0].pacote.codigoNormalizado;
        aplicarBusca();
        if (status) status.textContent = `${ocorrencias.length} registros encontrados; revise as cargas exibidas.`;
        return alert(`O codigo aparece em ${ocorrencias.length} cargas:\n${resumo}`);
      }

      const { carga, pacote } = ocorrencias[0];
      estado.scrollTop = obterScrollPrincipal();
      await this.mostrarDetalhe(carga.entregadorId, carga.cargaId, pacote.codigoNormalizado);
    };

    selecionar(this.raiz, "#localizar-pacote-admin")?.addEventListener("click", () => {
      const codigo = busca?.value ?? "";
      if (!codigo.trim()) return alert("Digite ou fotografe o codigo da encomenda.");
      void localizar([codigo]);
    });
    busca?.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter") return;
      evento.preventDefault();
      selecionar<HTMLButtonElement>(this.raiz, "#localizar-pacote-admin")?.click();
    });
    selecionar<HTMLInputElement>(this.raiz, "#foto-scanner-admin")?.addEventListener("change", async (evento) => {
      const entrada = evento.currentTarget as HTMLInputElement;
      const arquivo = entrada.files?.[0];
      if (!arquivo) return;
      try {
        document.body.dataset.carregando = "true";
        const status = selecionar<HTMLElement>(this.raiz, "#status-scanner-admin");
        if (status) status.textContent = "Lendo a etiqueta...";
        const resultado = await lerCodigosDaFoto(arquivo);
        await localizar(resultado.codigos);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel ler a etiqueta.");
      } finally {
        entrada.value = "";
        document.body.dataset.carregando = "false";
      }
    });

    const listaCargas = selecionar<HTMLElement>(this.raiz, "#lista-cargas-admin");
    if (listaCargas) delegarEvento(listaCargas, "click", "[data-abrir-carga]", (botao) => {
      const cargaId = botao.dataset.abrirCarga;
      const entregadorId = botao.dataset.entregador;
      if (!cargaId || !entregadorId) return;
      estado.scrollTop = obterScrollPrincipal();
      void this.mostrarDetalhe(entregadorId, cargaId);
    });

    const alertas = selecionar<HTMLElement>(this.raiz, ".alertas-extra-rota");
    if (alertas) delegarEvento(alertas, "click", "[data-abrir-alerta-extra]", (botao) => {
      const cargaId = botao.dataset.cargaAlerta;
      const entregadorId = botao.dataset.entregadorAlerta;
      const codigo = botao.dataset.abrirAlertaExtra;
      if (!cargaId || !entregadorId || !codigo) return;
      estado.scrollTop = obterScrollPrincipal();
      void this.mostrarDetalhe(entregadorId, cargaId, codigo);
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
        const cargasExistentes = await this.dependencias.repositorioCargas.listarCargas(entregadorId);
        const ativaNaData = cargasExistentes.find((item) =>
          item.dataOperacao === data &&
          ((item.status ?? "PUBLICADA") === "PUBLICADA" || item.status === "EM_OPERACAO"),
        );
        if (ativaNaData) {
          throw new Error("Ja existe uma carga ativa para este entregador nesta data. Abra a carga existente.");
        }
        const carga = criarCargaManual(perfil, data);
        await this.dependencias.repositorioCargas.salvarCarga(entregadorId, carga);
        await this.mostrarDetalhe(entregadorId, carga.cargaId);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel criar a carga.");
      }
    });
  }

  async mostrarDetalhe(entregadorId: string, cargaId: string, codigoInicial = ""): Promise<void> {
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
    if (codigoInicial) estado.filtroCodigo = codigoInicial;
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
    if (codigoInicial) {
      selecionar<HTMLElement>(this.raiz, "[data-pacote-codigo]:not([hidden])")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

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
        const atualizada = structuredClone(carga);
        adicionarPacoteNaCarga(atualizada, normalizado);
        await salvar(atualizada);
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
        const atualizada = structuredClone(carga);
        const resultado = associarEnderecosNaCarga(atualizada, registros);
        await salvar(atualizada);
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

      const atualizada = structuredClone(carga);
      const alterados = definirRegiaoEmLote(
        atualizada.pacotes,
        ids,
        escolha === "OUTRA" ? undefined : escolha,
        escolha === "OUTRA" ? personalizada : undefined,
      );
      await salvar(atualizada);
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
        const origemAtualizada = structuredClone(carga);
        const destinoAtualizado = structuredClone(destino);
        const resultado = transferirPacotesSelecionados(origemAtualizada, destinoAtualizado, ids);
        await this.dependencias.repositorioCargas.salvarCargas([origemAtualizada, destinoAtualizado]);
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

    telaDetalhe && delegarEvento(telaDetalhe, "click", "[data-resolver-extra-rota]", (botao) => {
      const pacoteId = botao.dataset.resolverExtraRota;
      if (!pacoteId || !confirm("Marcar este alerta como resolvido? A baixa da transportadora continua independente.")) return;
      void (async () => {
        try {
          const pacoteOriginal = carga.pacotes.find((item) => item.id === pacoteId);
          if (
            carga.origemOperacional === "SCANNER_UNIVERSAL" &&
            pacoteOriginal?.operacaoExtraRotaId &&
            this.dependencias.repositorioCargas.resolverAlertaExtraRota
          ) {
            await this.dependencias.repositorioCargas.resolverAlertaExtraRota(
              carga.entregadorId, carga.cargaId, pacoteId, pacoteOriginal.operacaoExtraRotaId,
            );
            await this.mostrarLista();
            return;
          }
          const atualizada = structuredClone(carga);
          const pacote = atualizada.pacotes.find((item) => item.id === pacoteId);
          if (!pacote) throw new Error("Pacote nao encontrado.");
          pacote.alertaAdmin = false;
          pacote.conciliacaoExtraRota = {
            status: "RESOLVIDA",
            resolvidaEm: new Date().toISOString(),
          };
          pacote.atualizadoEm = new Date().toISOString();
          await salvar(atualizada);
          await renderizarNovamente();
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel resolver o alerta.");
        }
      })();
    });

    telaDetalhe && delegarEvento(telaDetalhe, "click", "[data-excluir-pacote]", (botao) => {
      const pacoteId = botao.dataset.excluirPacote;
      if (!pacoteId || !confirm("Excluir esta encomenda da carga?")) return;
      void (async () => {
        try {
          const atualizada = structuredClone(carga);
          excluirPacoteDaCarga(atualizada, pacoteId);
          await salvar(atualizada);
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
          const origemAtualizada = structuredClone(carga);
          const destinoAtualizado = structuredClone(destino);
          transferirPacote(origemAtualizada, destinoAtualizado, pacoteId);
          await this.dependencias.repositorioCargas.salvarCargas([origemAtualizada, destinoAtualizado]);
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
        const origemAtualizada = structuredClone(carga);
        const destinoAtualizado = structuredClone(destino);
        const movidos = transferirPendentes(origemAtualizada, destinoAtualizado);
        await this.dependencias.repositorioCargas.salvarCargas([origemAtualizada, destinoAtualizado]);
        alert(`${movidos} pacote(s) transferido(s).`);
        await renderizarNovamente([]);
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel transferir a carga.");
      }
    });

    selecionar(this.raiz, "#publicar-carga")?.addEventListener("click", async () => {
      try {
        const cargas = await this.dependencias.repositorioCargas.listarCargas(carga.entregadorId);
        const outraAtiva = cargas.find((item) =>
          item.cargaId !== carga.cargaId &&
          item.dataOperacao === carga.dataOperacao &&
          ((item.status ?? "PUBLICADA") === "PUBLICADA" || item.status === "EM_OPERACAO"),
        );
        if (outraAtiva) throw new Error("Ja existe outra carga ativa para este entregador nesta data.");
        const atualizada = structuredClone(carga);
        publicarCarga(atualizada);
        await salvar(atualizada);
        await renderizarNovamente();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel publicar.");
      }
    });

    selecionar(this.raiz, "#encerrar-carga")?.addEventListener("click", async () => {
      if (!confirm("Encerrar esta carga? Depois disso ela nao podera ser alterada.")) return;
      try {
        const atualizada = structuredClone(carga);
        encerrarCarga(atualizada);
        await salvar(atualizada);
        await renderizarNovamente();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel encerrar.");
      }
    });

    selecionar(this.raiz, "#excluir-carga-teste")?.addEventListener("click", async () => {
      const referencia = obterReferenciaCarga(carga);
      if (!confirm(`Remover ${referencia} da operacao? Esta acao e permitida somente sem entregas iniciadas.`)) return;
      try {
        const atualizada = structuredClone(carga);
        excluirCargaDeTeste(atualizada);
        await salvar(atualizada);
        await this.mostrarLista();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel remover a carga de teste.");
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
    const destinosAtivos = cargasDestino.filter((item) =>
      item.dataOperacao === carga.dataOperacao && (item.status ?? "PUBLICADA") !== "ENCERRADA",
    );
    if (destinosAtivos.length > 1) {
      throw new Error("O entregador de destino possui mais de uma carga ativa nesta data.");
    }
    let destino = destinosAtivos[0];

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

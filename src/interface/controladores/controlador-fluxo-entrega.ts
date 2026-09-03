import type { DependenciasAplicacao } from "../../configuracao/dependencias";
import type { PacoteDaCarga } from "../../dominio/carga/tipos";
import type { MotivoNaoEntrega, TipoEvidenciaFoto, TipoRecebedor } from "../../dominio/entrega/tipos";
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
} from "../../aplicacao/estado-entrega";
import { telaPacoteEncontrado } from "../telas/tela-pacote-encontrado";
import { telaFotosEntrega } from "../telas/tela-fotos-entrega";
import { telaRecebedor } from "../telas/tela-recebedor";
import { telaFinalizarEntrega } from "../telas/tela-finalizar-entrega";
import { telaNaoEntregue } from "../telas/tela-nao-entregue";
import { telaOpcoesEntrega } from "../telas/tela-opcoes-entrega";
import { telaResultadoEntrega } from "../telas/tela-resultado-entrega";
import { selecionar, selecionarTodos } from "../nucleo/dom";

type TelaEntrega = "FOTOS" | "RECEBEDOR" | "FINALIZAR";

interface NavegacaoFluxoEntrega {
  voltarScanner: () => void;
  voltarEntregador: () => void;
}

export class ControladorFluxoEntrega {
  private telaAtual: TelaEntrega = "FOTOS";

  constructor(
    private readonly raiz: HTMLElement,
    private readonly dependencias: DependenciasAplicacao,
    private readonly pacote: PacoteDaCarga,
    private readonly salvarCarga: () => Promise<void>,
    private readonly navegacao: NavegacaoFluxoEntrega,
  ) {}

  mostrarPacoteEncontrado(): void {
    this.raiz.innerHTML = telaPacoteEncontrado(this.pacote);
    selecionar(this.raiz, "#voltar-scanner")?.addEventListener("click", () => this.navegacao.voltarScanner());
    selecionar(this.raiz, "#iniciar-entrega")?.addEventListener("click", async () => {
      iniciarEntrega(this.pacote);
      await this.salvarCarga();
      this.telaAtual = "FOTOS";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#desfazer-conclusao")?.addEventListener("click", async () => {
      try {
        desfazerUltimaConclusao(this.pacote);
        await this.salvarCarga();
        this.mostrarPacoteEncontrado();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel desfazer.");
      }
    });
  }

  private mostrarFluxo(): void {
    if (this.telaAtual === "FOTOS") {
      this.raiz.innerHTML = telaFotosEntrega(this.pacote);
      this.ligarFotos();
      return;
    }
    if (this.telaAtual === "RECEBEDOR") {
      this.raiz.innerHTML = telaRecebedor(this.pacote);
      this.ligarRecebedor();
      return;
    }
    this.raiz.innerHTML = telaFinalizarEntrega(this.pacote);
    this.ligarFinalizar();
  }

  private ligarFotos(): void {
    selecionarTodos<HTMLInputElement>(this.raiz, "[data-foto-tipo]").forEach((input) => {
      input.addEventListener("change", async () => {
        const arquivo = input.files?.[0];
        const tipo = input.dataset.fotoTipo as TipoEvidenciaFoto | undefined;
        if (!arquivo || !tipo) return;
        try {
          document.body.dataset.carregando = "true";
          const salvo = await this.dependencias.repositorioFotos.salvar(arquivo);
          const anterior = adicionarFoto(this.pacote, {
            id: crypto.randomUUID(),
            tipo,
            chaveArquivo: salvo.chave,
            capturadaEm: new Date().toISOString(),
            tamanhoBytes: salvo.tamanhoBytes,
          });
          if (anterior) await this.dependencias.repositorioFotos.remover(anterior);
          await this.salvarCarga();
          this.mostrarFluxo();
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Falha ao salvar foto.");
        } finally {
          document.body.dataset.carregando = "false";
        }
      });
    });

    selecionarTodos<HTMLButtonElement>(this.raiz, "[data-remover-foto]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const chave = removerFoto(this.pacote, botao.dataset.removerFoto as TipoEvidenciaFoto);
        if (chave) await this.dependencias.repositorioFotos.remover(chave);
        await this.salvarCarga();
        this.mostrarFluxo();
      });
    });

    selecionar(this.raiz, "#ir-recebedor")?.addEventListener("click", () => {
      this.telaAtual = "RECEBEDOR";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#opcoes-entrega")?.addEventListener("click", () => this.mostrarOpcoes());
  }

  private ligarRecebedor(): void {
    const campoNome = selecionar<HTMLElement>(this.raiz, "#campo-nome-recebedor");
    const campoDocumento = selecionar<HTMLElement>(this.raiz, "#campo-documento-recebedor");
    const inputNome = selecionar<HTMLInputElement>(this.raiz, "#nome-recebedor");
    const inputDocumento = selecionar<HTMLInputElement>(this.raiz, "#documento-recebedor");
    let tipoSelecionado = obterEstadoEntrega(this.pacote).recebedor?.tipo;

    const salvarRecebedor = async () => {
      if (!tipoSelecionado) return;
      definirRecebedor(this.pacote, {
        tipo: tipoSelecionado,
        nome: tipoSelecionado === "PROPRIO" ? undefined : inputNome?.value.trim() || undefined,
        documento: inputDocumento?.value.trim() || undefined,
      });
      await this.salvarCarga();
    };

    selecionarTodos<HTMLButtonElement>(this.raiz, "[data-recebedor]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        tipoSelecionado = botao.dataset.recebedor as TipoRecebedor;
        selecionarTodos<HTMLButtonElement>(this.raiz, "[data-recebedor]").forEach((item) => {
          item.dataset.selecionado = String(item === botao);
        });
        campoNome?.classList.toggle("campo-grande--oculto", tipoSelecionado === "PROPRIO");
        campoDocumento?.classList.remove("campo-grande--oculto");
        await salvarRecebedor();
        const proximo = selecionar<HTMLButtonElement>(this.raiz, "#ir-finalizar");
        if (proximo) proximo.disabled = false;
      });
    });

    inputNome?.addEventListener("input", async () => {
      if (!tipoSelecionado || tipoSelecionado === "PROPRIO") return;
      await salvarRecebedor();
    });
    inputDocumento?.addEventListener("input", async () => {
      if (!tipoSelecionado) return;
      await salvarRecebedor();
    });

    selecionar(this.raiz, "#voltar-fotos")?.addEventListener("click", () => {
      this.telaAtual = "FOTOS";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#ir-finalizar")?.addEventListener("click", () => {
      if (!obterEstadoEntrega(this.pacote).recebedor) return;
      this.telaAtual = "FINALIZAR";
      this.mostrarFluxo();
    });
  }

  private ligarFinalizar(): void {
    selecionar(this.raiz, "#voltar-recebedor")?.addEventListener("click", () => {
      this.telaAtual = "RECEBEDOR";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#confirmar-entrega")?.addEventListener("click", async () => {
      try {
        confirmarEntrega(this.pacote);
        await this.salvarCarga();
        this.mostrarResultado();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel concluir.");
      }
    });
    selecionar(this.raiz, "#abrir-nao-entregue")?.addEventListener("click", () => {
      this.raiz.innerHTML = telaNaoEntregue(this.pacote);
      this.ligarNaoEntregue();
    });
    selecionar(this.raiz, "#opcoes-entrega")?.addEventListener("click", () => this.mostrarOpcoes());
  }

  private ligarNaoEntregue(): void {
    selecionarTodos<HTMLButtonElement>(this.raiz, "[data-motivo]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        marcarNaoEntregue(this.pacote, botao.dataset.motivo as MotivoNaoEntrega);
        await this.salvarCarga();
        this.mostrarResultado();
      });
    });
    selecionar(this.raiz, "#voltar-finalizar")?.addEventListener("click", () => {
      this.telaAtual = "FINALIZAR";
      this.mostrarFluxo();
    });
  }

  private mostrarOpcoes(): void {
    this.raiz.innerHTML = telaOpcoesEntrega(this.pacote);
    selecionar(this.raiz, "#pausar-entrega")?.addEventListener("click", async () => {
      pausarEntrega(this.pacote);
      await this.salvarCarga();
      this.navegacao.voltarEntregador();
    });
    selecionar(this.raiz, "#cancelar-preparacao")?.addEventListener("click", async () => {
      if (!confirm("Cancelar a preparacao e apagar as fotos registradas deste pacote?")) return;
      try {
        const arquivos = cancelarPreparacao(this.pacote);
        for (const chave of arquivos) await this.dependencias.repositorioFotos.remover(chave);
        await this.salvarCarga();
        this.navegacao.voltarScanner();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel cancelar.");
      }
    });
    selecionar(this.raiz, "#voltar-operacao")?.addEventListener("click", () => this.mostrarFluxo());
  }

  private mostrarResultado(): void {
    this.raiz.innerHTML = telaResultadoEntrega(this.pacote);
    selecionar(this.raiz, "#desfazer-conclusao")?.addEventListener("click", async () => {
      try {
        desfazerUltimaConclusao(this.pacote);
        await this.salvarCarga();
        this.telaAtual = "FINALIZAR";
        this.mostrarFluxo();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel desfazer.");
      }
    });
    selecionar(this.raiz, "#proximo-pacote")?.addEventListener("click", () => this.navegacao.voltarScanner());
  }
}

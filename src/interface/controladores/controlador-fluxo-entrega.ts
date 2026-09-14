import type { DependenciasAplicacao } from "../../configuracao/dependencias";
import type { CargaEntregador, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { MotivoNaoEntrega, OrigemEvidenciaFoto, TipoDocumentoImile, TipoEvidenciaFoto, TipoRecebedor, TipoRecebedorImile } from "../../dominio/entrega/tipos";
import {
  adicionarFoto,
  cancelarPreparacao,
  definirAssinatura,
  definirDadosComprovacaoImile,
  definirRecebedor,
  iniciarEntrega,
  obterEstadoEntrega,
  pausarEntrega,
  removerAssinatura,
  removerFoto,
} from "../../aplicacao/estado-entrega";
import { telaPacoteEncontrado } from "../telas/tela-pacote-encontrado";
import { telaFotosEntrega } from "../telas/tela-fotos-entrega";
import { telaRecebedor } from "../telas/tela-recebedor";
import { telaDadosComprovacaoImile } from "../telas/tela-dados-comprovacao-imile";
import { telaAssinaturaEntrega } from "../telas/tela-assinatura-entrega";
import { telaFinalizarEntrega } from "../telas/tela-finalizar-entrega";
import { telaNaoEntregue } from "../telas/tela-nao-entregue";
import { telaOpcoesEntrega } from "../telas/tela-opcoes-entrega";
import { telaResultadoEntrega } from "../telas/tela-resultado-entrega";
import { selecionar, selecionarTodos } from "../nucleo/dom";

type TelaEntrega = "FOTOS" | "RECEBEDOR" | "DADOS_IMILE" | "ASSINATURA" | "FINALIZAR";

interface NavegacaoFluxoEntrega {
  voltarScanner: () => void;
  voltarEntregador: () => void;
}

export class ControladorFluxoEntrega {
  private telaAtual: TelaEntrega = "FOTOS";

  constructor(
    private readonly raiz: HTMLElement,
    private readonly dependencias: DependenciasAplicacao,
    private readonly carga: CargaEntregador,
    private readonly pacote: PacoteDaCarga,
    private readonly salvarCarga: () => Promise<void>,
    private readonly navegacao: NavegacaoFluxoEntrega,
  ) {}

  mostrarPacoteEncontrado(): void {
    this.raiz.innerHTML = telaPacoteEncontrado(this.pacote);
    selecionar(this.raiz, "#voltar-scanner")?.addEventListener("click", () => this.navegacao.voltarScanner());
    selecionar(this.raiz, "#iniciar-entrega")?.addEventListener("click", async () => {
      const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
      const statusAnterior = this.carga.status;
      try {
        iniciarEntrega(this.pacote);
        if ((this.carga.status ?? "PUBLICADA") === "PUBLICADA") this.carga.status = "EM_OPERACAO";
        await this.salvarCarga();
        this.telaAtual = "FOTOS";
        this.mostrarFluxo();
      } catch (erro) {
        this.pacote.entrega = anterior;
        this.carga.status = statusAnterior;
        alert(erro instanceof Error ? erro.message : "Nao foi possivel iniciar a entrega.");
      }
    });
    selecionar(this.raiz, "#desfazer-conclusao")?.addEventListener("click", async () => {
      try {
        await this.dependencias.operacoesEntrega.desfazerUltimaConclusao(
          this.carga,
          this.pacote,
        );
        this.mostrarPacoteEncontrado();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel desfazer.");
      }
    });
  }

  /** Entrada única para o botão Voltar físico; nada preenchido é descartado. */
  voltar(): void {
    if (this.telaAtual === "FOTOS") {
      this.mostrarPacoteEncontrado();
      return;
    }
    if (this.telaAtual === "RECEBEDOR" || this.telaAtual === "DADOS_IMILE") {
      this.telaAtual = "FOTOS";
      this.mostrarFluxo();
      return;
    }
    if (this.telaAtual === "ASSINATURA") {
      this.telaAtual = this.pacote.transportadora.id === "IMILE" ? "DADOS_IMILE" : "RECEBEDOR";
      this.mostrarFluxo();
      return;
    }
    this.telaAtual = "ASSINATURA";
    this.mostrarFluxo();
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
    if (this.telaAtual === "DADOS_IMILE") {
      this.raiz.innerHTML = telaDadosComprovacaoImile(this.pacote);
      this.ligarDadosImile();
      return;
    }
    if (this.telaAtual === "ASSINATURA") {
      this.raiz.innerHTML = telaAssinaturaEntrega(this.pacote);
      this.ligarAssinatura();
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
        const origem = input.dataset.fotoOrigem as OrigemEvidenciaFoto | undefined;
        if (!arquivo || !tipo || !origem) return;
        try {
          document.body.dataset.carregando = "true";
          const salvo = await this.dependencias.repositorioFotos.salvar(arquivo);
          const estadoAnterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
          const anterior = adicionarFoto(this.pacote, {
            id: crypto.randomUUID(),
            tipo,
            chaveArquivo: salvo.chave,
            capturadaEm: new Date().toISOString(),
            tamanhoBytes: salvo.tamanhoBytes,
            largura: salvo.largura,
            altura: salvo.altura,
            origem,
          });
          try {
            await this.salvarCarga();
          } catch (erro) {
            this.pacote.entrega = estadoAnterior;
            await this.dependencias.repositorioFotos.remover(salvo.chave).catch(() => undefined);
            throw erro;
          }
          if (anterior) await this.dependencias.repositorioFotos.remover(anterior).catch(() => undefined);
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
        const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
        try {
          const chave = removerFoto(this.pacote, botao.dataset.removerFoto as TipoEvidenciaFoto);
          await this.salvarCarga();
          if (chave) await this.dependencias.repositorioFotos.remover(chave).catch(() => undefined);
          this.mostrarFluxo();
        } catch (erro) {
          this.pacote.entrega = anterior;
          alert(erro instanceof Error ? erro.message : "Nao foi possivel remover a foto.");
        }
      });
    });

    selecionar(this.raiz, "#ir-recebedor")?.addEventListener("click", () => {
      if (
        this.pacote.transportadora.id === "IMILE" &&
        !obterEstadoEntrega(this.pacote).fotos.some((foto) => foto.tipo === "COMPROVANTE_RECEBIMENTO")
      ) {
        alert("A iMile exige a foto de comprovante de recebimento antes de continuar.");
        return;
      }
      this.telaAtual = this.pacote.transportadora.id === "IMILE" ? "DADOS_IMILE" : "RECEBEDOR";
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
      const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
      try {
        definirRecebedor(this.pacote, {
          tipo: tipoSelecionado,
          nome: tipoSelecionado === "PROPRIO" ? undefined : inputNome?.value.trim() || undefined,
          documento: inputDocumento?.value.trim() || undefined,
        });
        await this.salvarCarga();
      } catch (erro) {
        this.pacote.entrega = anterior;
        throw erro;
      }
    };

    selecionarTodos<HTMLButtonElement>(this.raiz, "[data-recebedor]").forEach((botao) => {
      botao.addEventListener("click", async () => {
        tipoSelecionado = botao.dataset.recebedor as TipoRecebedor;
        selecionarTodos<HTMLButtonElement>(this.raiz, "[data-recebedor]").forEach((item) => {
          item.dataset.selecionado = String(item === botao);
        });
        campoNome?.classList.toggle("campo-grande--oculto", tipoSelecionado === "PROPRIO");
        campoDocumento?.classList.remove("campo-grande--oculto");
        try {
          await salvarRecebedor();
          const proximo = selecionar<HTMLButtonElement>(this.raiz, "#ir-finalizar");
          if (proximo) proximo.disabled = false;
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar o recebedor.");
        }
      });
    });

    selecionar(this.raiz, "#voltar-fotos")?.addEventListener("click", () => {
      this.telaAtual = "FOTOS";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#ir-finalizar")?.addEventListener("click", async () => {
      if (!tipoSelecionado) return;
      try {
        await salvarRecebedor();
        this.telaAtual = "ASSINATURA";
        this.mostrarFluxo();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar o recebedor.");
      }
    });
  }

  private ligarDadosImile(): void {
    const inputNome = selecionar<HTMLInputElement>(this.raiz, "#imile-nome-completo");
    const inputTipoDocumento = selecionar<HTMLSelectElement>(this.raiz, "#imile-tipo-documento");
    const inputNumeroDocumento = selecionar<HTMLInputElement>(this.raiz, "#imile-numero-documento");
    const inputObservacao = selecionar<HTMLTextAreaElement>(this.raiz, "#imile-observacao");
    let recebedorSelecionado = obterEstadoEntrega(this.pacote).dadosComprovacaoImile?.recebedor;

    selecionarTodos<HTMLButtonElement>(this.raiz, "[data-recebedor-imile]").forEach((botao) => {
      botao.addEventListener("click", () => {
        recebedorSelecionado = botao.dataset.recebedorImile as TipoRecebedorImile;
        selecionarTodos<HTMLButtonElement>(this.raiz, "[data-recebedor-imile]").forEach((item) => {
          item.dataset.selecionado = String(item === botao);
        });
      });
    });

    selecionar(this.raiz, "#voltar-fotos")?.addEventListener("click", () => {
      this.telaAtual = "FOTOS";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#ir-assinatura-imile")?.addEventListener("click", async () => {
      if (!recebedorSelecionado) {
        alert("Escolha quem recebeu a encomenda.");
        return;
      }
      const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
      try {
        definirDadosComprovacaoImile(this.pacote, {
          recebedor: recebedorSelecionado,
          nomeCompleto: inputNome?.value ?? "",
          tipoDocumento: inputTipoDocumento?.value as TipoDocumentoImile,
          numeroDocumento: inputNumeroDocumento?.value ?? "",
          observacao: inputObservacao?.value,
        });
        await this.salvarCarga();
        this.telaAtual = "ASSINATURA";
        this.mostrarFluxo();
      } catch (erro) {
        this.pacote.entrega = anterior;
        alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar os dados da iMile.");
      }
    });
  }

  private ligarAssinatura(): void {
    const canvas = selecionar<HTMLCanvasElement>(this.raiz, "#canvas-assinatura");
    const salvar = selecionar<HTMLButtonElement>(this.raiz, "#salvar-assinatura");
    const status = selecionar<HTMLElement>(this.raiz, "#status-assinatura");
    const contexto = canvas?.getContext("2d");
    let desenhando = false;
    let desenhada = false;

    if (canvas && contexto) {
      contexto.lineCap = "round";
      contexto.lineJoin = "round";
      contexto.lineWidth = 7;
      contexto.strokeStyle = "#111827";

      const ponto = (evento: PointerEvent) => {
        const retangulo = canvas.getBoundingClientRect();
        return {
          x: (evento.clientX - retangulo.left) * (canvas.width / retangulo.width),
          y: (evento.clientY - retangulo.top) * (canvas.height / retangulo.height),
        };
      };

      canvas.addEventListener("pointerdown", (evento) => {
        desenhando = true;
        canvas.setPointerCapture(evento.pointerId);
        const atual = ponto(evento);
        contexto.beginPath();
        contexto.moveTo(atual.x, atual.y);
      });
      canvas.addEventListener("pointermove", (evento) => {
        if (!desenhando) return;
        const atual = ponto(evento);
        contexto.lineTo(atual.x, atual.y);
        contexto.stroke();
        desenhada = true;
        canvas.dataset.desenhada = "true";
        if (salvar) salvar.disabled = false;
      });
      const encerrar = (evento: PointerEvent) => {
        desenhando = false;
        if (canvas.hasPointerCapture(evento.pointerId)) canvas.releasePointerCapture(evento.pointerId);
      };
      canvas.addEventListener("pointerup", encerrar);
      canvas.addEventListener("pointercancel", encerrar);
    }

    selecionar(this.raiz, "#limpar-assinatura")?.addEventListener("click", () => {
      if (!canvas || !contexto) return;
      contexto.clearRect(0, 0, canvas.width, canvas.height);
      desenhada = false;
      canvas.dataset.desenhada = "false";
      if (salvar) salvar.disabled = true;
      if (status) status.textContent = "Area limpa. Assine novamente.";
    });

    salvar?.addEventListener("click", async () => {
      if (!canvas || !desenhada) return;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return alert("Nao foi possivel preparar a assinatura.");
      const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
      try {
        document.body.dataset.carregando = "true";
        const arquivo = new File([blob], "assinatura.png", { type: "image/png" });
        const salvo = await this.dependencias.repositorioFotos.salvar(arquivo);
        const chaveAnterior = definirAssinatura(this.pacote, {
          chaveArquivo: salvo.chave,
          capturadaEm: new Date().toISOString(),
          largura: canvas.width,
          altura: canvas.height,
          tamanhoBytes: salvo.tamanhoBytes,
        });
        try {
          await this.salvarCarga();
        } catch (erro) {
          this.pacote.entrega = anterior;
          await this.dependencias.repositorioFotos.remover(salvo.chave).catch(() => undefined);
          throw erro;
        }
        if (chaveAnterior) {
          await this.dependencias.repositorioFotos.remover(chaveAnterior).catch(() => undefined);
        }
        this.mostrarFluxo();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel salvar a assinatura.");
      } finally {
        document.body.dataset.carregando = "false";
      }
    });

    selecionar(this.raiz, "#remover-assinatura")?.addEventListener("click", async () => {
      const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
      try {
        const chave = removerAssinatura(this.pacote);
        await this.salvarCarga();
        if (chave) await this.dependencias.repositorioFotos.remover(chave).catch(() => undefined);
        this.mostrarFluxo();
      } catch (erro) {
        this.pacote.entrega = anterior;
        alert(erro instanceof Error ? erro.message : "Nao foi possivel remover a assinatura.");
      }
    });

    selecionar(this.raiz, "#voltar-recebedor")?.addEventListener("click", () => {
      this.telaAtual = this.pacote.transportadora.id === "IMILE" ? "DADOS_IMILE" : "RECEBEDOR";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#ir-finalizar")?.addEventListener("click", () => {
      if (this.pacote.transportadora.id === "IMILE" && !obterEstadoEntrega(this.pacote).assinatura) {
        alert("A iMile exige a assinatura do cliente antes de continuar.");
        return;
      }
      this.telaAtual = "FINALIZAR";
      this.mostrarFluxo();
    });
  }

  private ligarFinalizar(): void {
    selecionar(this.raiz, "#voltar-assinatura")?.addEventListener("click", () => {
      this.telaAtual = "ASSINATURA";
      this.mostrarFluxo();
    });
    selecionar(this.raiz, "#confirmar-entrega")?.addEventListener("click", async () => {
      try {
        await this.dependencias.operacoesEntrega.confirmarEntrega(
          this.carga,
          this.pacote,
        );
        void this.dependencias.sincronizacaoEntregas.sincronizarAgora(this.carga.entregadorId);
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
        try {
          await this.dependencias.operacoesEntrega.marcarNaoEntregue(
            this.carga,
            this.pacote,
            botao.dataset.motivo as MotivoNaoEntrega,
          );
          void this.dependencias.sincronizacaoEntregas.sincronizarAgora(this.carga.entregadorId);
          this.mostrarResultado();
        } catch (erro) {
          alert(erro instanceof Error ? erro.message : "Nao foi possivel registrar a nao entrega.");
        }
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
      const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
      try {
        pausarEntrega(this.pacote);
        await this.salvarCarga();
        this.navegacao.voltarEntregador();
      } catch (erro) {
        this.pacote.entrega = anterior;
        alert(erro instanceof Error ? erro.message : "Nao foi possivel pausar a entrega.");
      }
    });
    selecionar(this.raiz, "#cancelar-preparacao")?.addEventListener("click", async () => {
      if (!confirm("Cancelar a preparacao e apagar as fotos registradas deste pacote?")) return;
      try {
        const anterior = this.pacote.entrega ? structuredClone(this.pacote.entrega) : undefined;
        const arquivos = cancelarPreparacao(this.pacote);
        try {
          await this.salvarCarga();
        } catch (erro) {
          this.pacote.entrega = anterior;
          throw erro;
        }
        for (const chave of arquivos) {
          await this.dependencias.repositorioFotos.remover(chave).catch(() => undefined);
        }
        this.navegacao.voltarScanner();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel cancelar.");
      }
    });
    selecionar(this.raiz, "#voltar-operacao")?.addEventListener("click", () => this.mostrarFluxo());
  }

  private mostrarResultado(): void {
    const integracao = this.dependencias.integracoesTransportadoras[
      this.pacote.transportadora.id
    ];
    this.raiz.innerHTML = telaResultadoEntrega(
      this.pacote,
      Boolean(integracao),
      integracao?.obterCapacidadePod?.(),
    );

    const prepararAssistenciaImile = async (abrirConfiguracoes = false): Promise<boolean> => {
      if (this.pacote.transportadora.id !== "IMILE") return true;
      const dados = obterEstadoEntrega(this.pacote).dadosComprovacaoImile;
      const status = selecionar<HTMLElement>(this.raiz, "#resultado-integracao");
      if (!dados) {
        if (status) status.textContent = "Preencha os dados iMile no Hub antes de abrir o aplicativo.";
        return false;
      }
      const saida = await this.dependencias.assistentePreenchimentoImile.preparar(dados);
      if (status) status.textContent = saida.mensagem;
      if (saida.estado === "DESATIVADA" && abrirConfiguracoes) {
        const abriu = await this.dependencias.assistentePreenchimentoImile.abrirConfiguracoes();
        if (status && abriu) status.textContent = "Ative “Delivery Hub • preenchimento iMile” no Android e volte para tocar em ABRIR IMILE.";
      }
      return saida.estado === "PRONTA" || saida.estado === "REVISAO_MANUAL";
    };

    const abrirTransportadora = async () => {
      if (!integracao) return;
      const botao = selecionar<HTMLButtonElement>(this.raiz, "#abrir-transportadora");
      const status = selecionar<HTMLElement>(this.raiz, "#resultado-integracao");
      if (botao) botao.disabled = true;
      if (status) status.textContent = "POD salvo. Preparando aplicativo da transportadora...";
      try {
        await prepararAssistenciaImile(false);
        const saida = await integracao.abrirPesquisaPorTracking({
          tracking: this.pacote.codigoNormalizado,
          modo: "OPERACAO",
        });
        if (status) status.textContent = saida.mensagem;
      } catch {
        if (status) {
          status.textContent = "O POD continua salvo. Abra o aplicativo e pesquise o codigo da etiqueta.";
        }
      } finally {
        if (botao?.isConnected) botao.disabled = false;
      }
    };

    selecionar(this.raiz, "#preparar-assistencia-imile")
      ?.addEventListener("click", () => void prepararAssistenciaImile(true));

    selecionar(this.raiz, "#abrir-transportadora")
      ?.addEventListener("click", () => void abrirTransportadora());

    selecionar(this.raiz, "#desfazer-conclusao")?.addEventListener("click", async () => {
      try {
        await this.dependencias.operacoesEntrega.desfazerUltimaConclusao(
          this.carga,
          this.pacote,
        );
        this.telaAtual = "FINALIZAR";
        this.mostrarFluxo();
      } catch (erro) {
        alert(erro instanceof Error ? erro.message : "Nao foi possivel desfazer.");
      }
    });
    selecionar(this.raiz, "#proximo-pacote")?.addEventListener("click", () => this.navegacao.voltarScanner());

    // A gravacao local/Outbox ja terminou quando esta tela aparece. A ponte
    // pode falhar sem perder o POD, e o botao permanece disponivel para repetir.
    if (integracao) void abrirTransportadora();
  }
}

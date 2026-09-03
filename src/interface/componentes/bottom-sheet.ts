import { escaparHtml } from "./html";

export interface ConfiguracaoBottomSheet {
  id: string;
  titulo: string;
  subtitulo?: string;
  conteudoHtml: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  aoConfirmar?: (conteudo: HTMLElement) => boolean | void | Promise<boolean | void>;
  podeFechar?: () => boolean;
}

export interface BottomSheetAberto {
  elemento: HTMLElement;
  conteudo: HTMLElement;
  fechar: (forcar?: boolean) => void;
}

export function abrirBottomSheet(configuracao: ConfiguracaoBottomSheet): BottomSheetAberto {
  document.querySelector<HTMLElement>("[data-bottom-sheet-raiz]")?.remove();

  const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const camada = document.createElement("div");
  camada.className = "bottom-sheet-camada";
  camada.dataset.bottomSheetRaiz = configuracao.id;
  camada.innerHTML = `
    <div class="bottom-sheet-fundo" data-bottom-sheet-fechar></div>
    <section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="${escaparHtml(configuracao.id)}-titulo">
      <div class="bottom-sheet__alca" aria-hidden="true"></div>
      <header class="bottom-sheet__cabecalho">
        <div>
          ${configuracao.subtitulo ? `<span class="sobrelinha">${escaparHtml(configuracao.subtitulo)}</span>` : ""}
          <h2 id="${escaparHtml(configuracao.id)}-titulo">${escaparHtml(configuracao.titulo)}</h2>
        </div>
        <button type="button" class="bottom-sheet__fechar" data-bottom-sheet-fechar aria-label="Fechar">×</button>
      </header>
      <div class="bottom-sheet__conteudo" data-bottom-sheet-conteudo>${configuracao.conteudoHtml}</div>
      <footer class="bottom-sheet__acoes">
        <button type="button" class="botao-acao botao-acao--secundario" data-bottom-sheet-fechar>${escaparHtml(configuracao.textoCancelar ?? "CANCELAR")}</button>
        ${configuracao.aoConfirmar ? `<button type="button" class="botao-acao botao-acao--primario" data-bottom-sheet-confirmar>${escaparHtml(configuracao.textoConfirmar ?? "SALVAR")}</button>` : ""}
      </footer>
    </section>`;

  const conteudo = camada.querySelector<HTMLElement>("[data-bottom-sheet-conteudo]");
  if (!conteudo) throw new Error("Conteudo do Bottom Sheet nao foi criado.");

  const fechar = (forcar = false) => {
    if (!forcar && configuracao.podeFechar && !configuracao.podeFechar()) return;
    camada.remove();
    document.body.classList.remove("bottom-sheet-aberto");
    focoAnterior?.focus({ preventScroll: true });
  };

  camada.addEventListener("click", (evento) => {
    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;
    if (alvo.closest("[data-bottom-sheet-fechar]")) fechar();
  });

  camada.querySelector<HTMLButtonElement>("[data-bottom-sheet-confirmar]")?.addEventListener("click", async () => {
    const botao = camada.querySelector<HTMLButtonElement>("[data-bottom-sheet-confirmar]");
    if (botao) botao.disabled = true;
    try {
      const resultado = await configuracao.aoConfirmar?.(conteudo);
      if (resultado !== false) fechar(true);
    } finally {
      if (botao?.isConnected) botao.disabled = false;
    }
  });

  const tratarTecla = (evento: KeyboardEvent) => {
    if (evento.key !== "Escape") return;
    evento.preventDefault();
    fechar();
  };
  camada.addEventListener("keydown", tratarTecla);

  document.body.append(camada);
  document.body.classList.add("bottom-sheet-aberto");

  requestAnimationFrame(() => {
    const primeiro = conteudo.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])");
    primeiro?.focus({ preventScroll: true });
  });

  return { elemento: camada, conteudo, fechar };
}

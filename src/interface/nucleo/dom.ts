export function selecionar<T extends Element>(raiz: ParentNode, seletor: string): T | null {
  return raiz.querySelector<T>(seletor);
}

export function selecionarTodos<T extends Element>(raiz: ParentNode, seletor: string): T[] {
  return Array.from(raiz.querySelectorAll<T>(seletor));
}

export function delegarEvento<K extends keyof HTMLElementEventMap>(
  raiz: HTMLElement,
  tipo: K,
  seletor: string,
  tratar: (alvo: HTMLElement, evento: HTMLElementEventMap[K]) => void,
): () => void {
  const listener = (evento: Event) => {
    const origem = evento.target;
    if (!(origem instanceof Element)) return;
    const alvo = origem.closest<HTMLElement>(seletor);
    if (!alvo || !raiz.contains(alvo)) return;
    tratar(alvo, evento as HTMLElementEventMap[K]);
  };

  raiz.addEventListener(tipo, listener);
  return () => raiz.removeEventListener(tipo, listener);
}

export function obterScrollPrincipal(): number {
  return document.scrollingElement?.scrollTop ?? window.scrollY ?? 0;
}

export function restaurarScrollPrincipal(posicao: number): void {
  if (!Number.isFinite(posicao) || posicao <= 0) return;
  requestAnimationFrame(() => window.scrollTo({ top: posicao, behavior: "auto" }));
}

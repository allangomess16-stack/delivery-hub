export interface EstadoListaCargasAdmin {
  busca: string;
  filtroStatus: "ATIVA" | "ARQUIVADA" | "TODAS";
  scrollTop: number;
}

export interface EstadoDetalheCargaAdmin {
  filtroCodigo: string;
  filtroRegiao: string;
  selecionados: string[];
  scrollTop: number;
}

export class EstadoUiSessao {
  private readonly estados = new Map<string, unknown>();

  obter<T>(chave: string, padrao: () => T): T {
    const existente = this.estados.get(chave);
    if (existente !== undefined) return existente as T;
    const inicial = padrao();
    this.estados.set(chave, inicial);
    return inicial;
  }

  definir<T>(chave: string, valor: T): void {
    this.estados.set(chave, valor);
  }

  atualizar<T>(chave: string, padrao: () => T, mutacao: (estado: T) => void): T {
    const estado = this.obter(chave, padrao);
    mutacao(estado);
    this.estados.set(chave, estado);
    return estado;
  }

  limpar(chave?: string): void {
    if (chave) {
      this.estados.delete(chave);
      return;
    }
    this.estados.clear();
  }
}

export function criarEstadoListaCargasAdmin(): EstadoListaCargasAdmin {
  return { busca: "", filtroStatus: "ATIVA", scrollTop: 0 };
}

export function criarEstadoDetalheCargaAdmin(): EstadoDetalheCargaAdmin {
  return { filtroCodigo: "", filtroRegiao: "TODAS", selecionados: [], scrollTop: 0 };
}

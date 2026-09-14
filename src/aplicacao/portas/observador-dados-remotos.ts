export type TipoAtualizacaoRemota = "CARGAS" | "OPERACOES";

export interface AtualizacaoRemota {
  tipo: TipoAtualizacaoRemota;
  entregadorId: string;
}

export interface ObservadorDadosRemotos {
  assinar(
    entregadorIds: readonly string[],
    ouvinte: (atualizacao: AtualizacaoRemota) => void,
  ): () => void;
}

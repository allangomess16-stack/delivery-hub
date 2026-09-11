import type {
  AtualizacaoRemota,
  ObservadorDadosRemotos,
} from "../../aplicacao/portas/observador-dados-remotos";

/** Ambiente local continua por atualizacao manual ate possuir transporte realtime. */
export class ObservadorDadosRemotosNulo implements ObservadorDadosRemotos {
  assinar(
    _entregadorIds: readonly string[],
    _ouvinte: (atualizacao: AtualizacaoRemota) => void,
  ): () => void {
    return () => undefined;
  }
}

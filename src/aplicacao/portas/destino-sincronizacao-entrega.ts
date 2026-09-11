import type {
  ItemOutboxEntrega,
  ResultadoEnvioOperacao,
} from "../../dominio/sincronizacao/tipos";

export interface DestinoSincronizacaoEntrega {
  enviar(item: ItemOutboxEntrega): Promise<ResultadoEnvioOperacao>;
}

/** Falha transitória traduzida pelo adaptador, sem expor HTTP ao caso de uso. */
export class ErroTemporarioSincronizacao extends Error {
  constructor(
    mensagem: string,
    readonly tentarNovamenteAposMs?: number,
  ) {
    super(mensagem);
    this.name = "ErroTemporarioSincronizacao";
  }
}

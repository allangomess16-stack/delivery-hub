import { onValue, ref, type Database, type Unsubscribe } from "firebase/database";
import type {
  AtualizacaoRemota,
  ObservadorDadosRemotos,
  TipoAtualizacaoRemota,
} from "../../aplicacao/portas/observador-dados-remotos";
import { CODIGOS_ERRO } from "../../dominio/diagnostico/codigos-erro";

/** Observa somente as arvores permitidas pelas regras Firebase do usuario. */
export class ObservadorDadosRemotosFirebase implements ObservadorDadosRemotos {
  constructor(private readonly database: Database) {}

  assinar(
    entregadorIds: readonly string[],
    ouvinte: (atualizacao: AtualizacaoRemota) => void,
  ): () => void {
    const paradas: Unsubscribe[] = [];

    const observar = (
      entregadorId: string,
      raiz: "cargas" | "operacoes",
      tipo: TipoAtualizacaoRemota,
    ) => {
      // onValue entrega o estado inicial imediatamente. Ele estabelece a base,
      // mas nao deve ser confundido com uma alteracao feita por outro cliente.
      let primeiraLeitura = true;
      const parar = onValue(
        ref(this.database, `${raiz}/${entregadorId}`),
        () => {
          if (primeiraLeitura) {
            primeiraLeitura = false;
            return;
          }
          ouvinte({ tipo, entregadorId });
        },
        () => {
          // Falha de assinatura nao interrompe a operacao local. Leituras sob
          // demanda e a Outbox continuam sendo os fallbacks seguros.
          console.warn(CODIGOS_ERRO.FIREBASE_ASSINATURA, { tipo, entregadorId });
        },
      );
      paradas.push(parar);
    };

    for (const entregadorId of new Set(entregadorIds.filter(Boolean))) {
      observar(entregadorId, "cargas", "CARGAS");
      observar(entregadorId, "operacoes", "OPERACOES");
    }

    return () => {
      for (const parar of paradas) parar();
    };
  }
}

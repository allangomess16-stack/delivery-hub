import type { Auth } from "firebase/auth";
import type { DestinoSincronizacaoEntrega } from "../../aplicacao/portas/destino-sincronizacao-entrega";
import { ErroTemporarioSincronizacao } from "../../aplicacao/portas/destino-sincronizacao-entrega";
import type { ItemOutboxEntrega, ResultadoEnvioOperacao } from "../../dominio/sincronizacao/tipos";
import type { UsuarioAtual } from "../../dominio/identidade/tipos";
import { obterUsuarioFirebase } from "./usuario-firebase";
import { ErroHttpFirebaseRest, type ClienteRealtimeRest } from "./cliente-realtime-rest";
import {
  prepararParaFirebase,
  type OperacaoPacoteFirebase,
} from "./operacoes-firebase";
import { CODIGOS_ERRO } from "../../dominio/diagnostico/codigos-erro";

export class DestinoSincronizacaoFirebase implements DestinoSincronizacaoEntrega {
  private usuarioCache: UsuarioAtual | null = null;
  private usuarioCacheUid = "";

  constructor(
    private readonly auth: Auth,
    private readonly rest: ClienteRealtimeRest,
  ) {}

  private async usuarioAtual(): Promise<UsuarioAtual | null> {
    const uid = this.auth.currentUser?.uid ?? "";
    if (uid && uid === this.usuarioCacheUid && this.usuarioCache) return this.usuarioCache;
    const usuario = await obterUsuarioFirebase(this.auth, this.rest);
    this.usuarioCache = usuario;
    this.usuarioCacheUid = uid;
    return usuario;
  }

  async enviar(item: ItemOutboxEntrega): Promise<ResultadoEnvioOperacao> {
    const usuario = await this.usuarioAtual();
    if (!usuario) throw new Error("Sessao Firebase indisponivel para sincronizacao.");

    if (usuario.tipo !== "ADMIN" && usuario.entregadorId !== item.entregadorId) {
      return {
        tipo: "ERRO_PERMANENTE",
        mensagem: "O usuario autenticado nao pode sincronizar esta carga.",
      };
    }

    /**
     * O UUID faz parte do caminho remoto.
     *
     * Isso e importante porque um pacote pode gerar uma operacao nova depois
     * de uma correcao. Uma retransmissao atrasada de um UUID antigo jamais
     * pode sobrescrever a operacao mais recente do mesmo pacote.
     */
    const caminho =
      `operacoes/${item.entregadorId}/${item.cargaId}/${item.pacoteId}/${item.operacaoId}`;
    const entregaRemota = structuredClone(item.payload.entrega);
    entregaRemota.estadoIntegracao = "AGUARDANDO_INTEGRACAO";
    entregaRemota.sincronizadaEm = new Date().toISOString();
    entregaRemota.ultimoErroIntegracao = undefined;
    delete entregaRemota.estadoBaixaExterna;

    const registro = prepararParaFirebase<OperacaoPacoteFirebase>({
      operacaoId: item.operacaoId,
      tipo: item.tipo,
      entrega: entregaRemota,
      usuarioId: usuario.usuarioId,
      atualizadoEm: new Date().toISOString(),
      tracking: item.tracking,
      transportadoraId: item.transportadoraId,
      contextoOperacional: item.payload.contextoOperacional,
      alertaAdmin: item.payload.alertaAdmin === true,
      conciliacaoExtraRota: item.payload.alertaAdmin
        ? { status: "ABERTA" as const }
        : undefined,
    });

    let resultado;
    try {
      resultado = await this.rest.criarSeAusente(caminho, registro);
    } catch (erro) {
      if (
        erro instanceof ErroHttpFirebaseRest &&
        erro.status >= 400 &&
        erro.status < 500 &&
        erro.status !== 408 &&
        erro.status !== 429
      ) {
        return {
          tipo: "ERRO_PERMANENTE",
          mensagem: `${CODIGOS_ERRO.FIREBASE_HTTP_PERMANENTE}: operacao recusada pelo Hub (HTTP ${erro.status}).`,
        };
      }
      if (
        erro instanceof ErroHttpFirebaseRest &&
        (erro.status === 408 || erro.status === 429 || erro.status >= 500)
      ) {
        throw new ErroTemporarioSincronizacao(
          `Falha temporaria do Hub (HTTP ${erro.status}).`,
          erro.tentarNovamenteAposMs,
        );
      }
      throw erro;
    }
    if (!resultado.criado && resultado.valorAtual?.operacaoId !== item.operacaoId) {
      throw new Error("O servidor recusou a transacao idempotente da operacao.");
    }

    return {
      tipo: "RECEBIDA_PELO_HUB",
      processadaAntes: !resultado.criado,
    };
  }
}

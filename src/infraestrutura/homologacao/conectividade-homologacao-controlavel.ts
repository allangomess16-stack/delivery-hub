import type { FonteConectividade } from "../../aplicacao/portas/fonte-conectividade";
import type { ArmazenamentoChaveValor } from "../armazenamento/armazenamento-chave-valor";

const CHAVE = "homologacao/conectividade-controlavel";

interface EstadoConectividadePersistido {
  versao: 1;
  offlineSimulado: boolean;
}

/**
 * Fonte determinística exclusiva da homologação.
 *
 * O WebView pode manter navigator.onLine=true durante o modo avião. Este
 * adapter persiste a escolha do teste e não consulta a rede real.
 */
export class ConectividadeHomologacaoControlavel implements FonteConectividade {
  private offlineSimulado = false;

  constructor(private readonly armazenamento: ArmazenamentoChaveValor) {}

  async iniciar(): Promise<void> {
    const salvo = await this.armazenamento.obter<EstadoConectividadePersistido>(CHAVE);
    this.offlineSimulado = salvo?.versao === 1 && salvo.offlineSimulado === true;
  }

  estaOnline(): boolean {
    return !this.offlineSimulado;
  }

  estaOfflineSimulado(): boolean {
    return this.offlineSimulado;
  }

  async definirOfflineSimulado(offline: boolean): Promise<void> {
    this.offlineSimulado = offline;
    await this.armazenamento.salvar<EstadoConectividadePersistido>(CHAVE, {
      versao: 1,
      offlineSimulado: offline,
    });
  }
}

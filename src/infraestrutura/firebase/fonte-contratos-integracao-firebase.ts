import type { FonteContratosIntegracao } from "../../aplicacao/portas/repositorio-contratos-integracao";
import type { ConfiguracaoContratoIntegracao } from "../../dominio/integracao/contrato-integracao";
import type { IdTransportadora } from "../../dominio/transportadora/tipos";
import type { ClienteRealtimeRest } from "./cliente-realtime-rest";

export class FonteContratosIntegracaoFirebase implements FonteContratosIntegracao {
  constructor(private readonly rest: ClienteRealtimeRest) {}

  obter(
    transportadora: IdTransportadora,
    versionCode: string,
  ): Promise<ConfiguracaoContratoIntegracao | null> {
    return this.rest.obter<ConfiguracaoContratoIntegracao>(
      `meta/integracoes/${transportadora}/${versionCode}`,
    );
  }

  async salvar(contrato: ConfiguracaoContratoIntegracao): Promise<void> {
    await this.rest.salvar(
      `meta/integracoes/${contrato.transportadora}/${contrato.versionCode}`,
      contrato,
    );
  }
}

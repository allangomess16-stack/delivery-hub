import type { FonteContratosIntegracao } from "../../aplicacao/portas/repositorio-contratos-integracao";
import type { ConfiguracaoContratoIntegracao } from "../../dominio/integracao/contrato-integracao";

export class FonteContratosIntegracaoNula implements FonteContratosIntegracao {
  async obter(): Promise<ConfiguracaoContratoIntegracao | null> {
    return null;
  }
}


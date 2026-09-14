import type {
  ConfiguracaoContratoIntegracao,
  ConsultaContratoIntegracao,
  ContratoIntegracaoEfetivo,
} from "../../dominio/integracao/contrato-integracao";
import type { IdTransportadora } from "../../dominio/transportadora/tipos";

export interface FonteContratosIntegracao {
  obter(
    transportadora: IdTransportadora,
    versionCode: string,
  ): Promise<ConfiguracaoContratoIntegracao | null>;
  salvar?(contrato: ConfiguracaoContratoIntegracao): Promise<void>;
}

export interface RepositorioContratosIntegracao {
  resolver(consulta: ConsultaContratoIntegracao): Promise<ContratoIntegracaoEfetivo>;
  definir(contrato: ConfiguracaoContratoIntegracao): Promise<void>;
}

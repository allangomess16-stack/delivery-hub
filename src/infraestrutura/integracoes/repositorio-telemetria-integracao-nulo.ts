import type { RepositorioTelemetriaIntegracao } from "../../aplicacao/portas/repositorio-telemetria-integracao";

export class RepositorioTelemetriaIntegracaoNulo
implements RepositorioTelemetriaIntegracao {
  async registrar(): Promise<void> {}
  async listarDia(): Promise<[]> {
    return [];
  }
}

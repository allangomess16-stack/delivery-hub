import type { Auth } from "firebase/auth";
import type {
  RegistroTelemetriaIntegracao,
  RepositorioTelemetriaIntegracao,
} from "../../aplicacao/portas/repositorio-telemetria-integracao";
import type { EventoTelemetriaIntegracao } from "../../dominio/integracao/telemetria-integracao";
import type { ClienteRealtimeRest } from "./cliente-realtime-rest";

function diaUtc(iso: string): string {
  return iso.slice(0, 10);
}

export class RepositorioTelemetriaIntegracaoFirebase
implements RepositorioTelemetriaIntegracao {
  constructor(
    private readonly auth: Auth,
    private readonly rest: ClienteRealtimeRest,
  ) {}

  async registrar(evento: EventoTelemetriaIntegracao): Promise<void> {
    const usuario = this.auth.currentUser;
    if (!usuario) throw new Error("Sessao Firebase indisponivel para telemetria.");
    await this.rest.criarSeAusente(
      `suporte/integracoes/${diaUtc(evento.ocorridoEm)}/${evento.eventoId}`,
      { usuarioId: usuario.uid, evento },
    );
  }

  async listarDia(dia: string): Promise<RegistroTelemetriaIntegracao[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error("Data de consulta invalida.");
    const arvore = await this.rest.obterUltimosPorChave<
      Record<string, RegistroTelemetriaIntegracao>
    >(`suporte/integracoes/${dia}`, 200);
    if (!arvore) return [];

    return Object.values(arvore)
      .filter((registro) => Boolean(registro?.usuarioId && registro?.evento))
      .sort((a, b) => b.evento.ocorridoEm.localeCompare(a.evento.ocorridoEm))
      .slice(0, 200);
  }
}

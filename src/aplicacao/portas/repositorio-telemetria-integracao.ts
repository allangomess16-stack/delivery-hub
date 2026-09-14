import type { EventoTelemetriaIntegracao } from "../../dominio/integracao/telemetria-integracao";

export interface RegistroTelemetriaIntegracao {
  usuarioId: string;
  evento: EventoTelemetriaIntegracao;
}

export interface RepositorioTelemetriaIntegracao {
  registrar(evento: EventoTelemetriaIntegracao): Promise<void>;
  listarDia(dia: string): Promise<RegistroTelemetriaIntegracao[]>;
}

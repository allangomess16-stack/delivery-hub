import { PonteNativaCapacitor } from "../infraestrutura/android/ponte-nativa-capacitor";
import type {
  FonteContratosIntegracao,
  RepositorioContratosIntegracao,
} from "../aplicacao/portas/repositorio-contratos-integracao";
import type { RepositorioTelemetriaIntegracao } from "../aplicacao/portas/repositorio-telemetria-integracao";
import type { ArmazenamentoChaveValor } from "../infraestrutura/armazenamento/armazenamento-chave-valor";
import { ArmazenamentoIndexedDb } from "../infraestrutura/armazenamento/armazenamento-indexeddb";
import { FonteContratosIntegracaoNula } from "../infraestrutura/integracoes/fonte-contratos-integracao-nula";
import { IMileAdapter } from "../infraestrutura/integracoes/imile-adapter";
import { AnjunAdapter } from "../infraestrutura/integracoes/anjun-adapter";
import { RepositorioContratosIntegracaoSeguro } from "../infraestrutura/integracoes/repositorio-contratos-integracao-seguro";
import { RepositorioTelemetriaIntegracaoNulo } from "../infraestrutura/integracoes/repositorio-telemetria-integracao-nulo";
import {
  POLITICAS_IMILE_HOMOLOGADAS,
  PROTOCOLO_IMILE_REQUEST_CODE_V1,
} from "./contratos-integracao/imile-2-3-18";

interface OpcoesIntegracaoAndroid {
  armazenamento?: ArmazenamentoChaveValor;
  fonteContratos?: FonteContratosIntegracao;
  telemetria?: RepositorioTelemetriaIntegracao;
  repositorioContratos?: RepositorioContratosIntegracao;
}

/** Composition root exclusivo das integracoes Android. */
export function criarIntegracaoIMile(opcoes: OpcoesIntegracaoAndroid = {}): IMileAdapter {
  const armazenamento = opcoes.armazenamento ?? new ArmazenamentoIndexedDb(
    "delivery-hub-integracoes",
  );
  const contratos = opcoes.repositorioContratos ?? new RepositorioContratosIntegracaoSeguro(
      armazenamento,
      opcoes.fonteContratos ?? new FonteContratosIntegracaoNula(),
      [...POLITICAS_IMILE_HOMOLOGADAS],
      new Set([PROTOCOLO_IMILE_REQUEST_CODE_V1]),
    );
  return new IMileAdapter(
    new PonteNativaCapacitor(),
    contratos,
    opcoes.telemetria ?? new RepositorioTelemetriaIntegracaoNulo(),
  );
}

export function criarIntegracaoAnjun(): AnjunAdapter {
  return new AnjunAdapter(new PonteNativaCapacitor());
}

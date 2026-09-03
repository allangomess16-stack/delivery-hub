import { obterIntegracaoTransportadora } from "../../configuracao/integracoes-transportadoras";
import type {
  CapacidadeIntegracao,
  EvidenciaCapacidade,
  NivelEvidenciaIntegracao,
  PlanoIntegracao,
  RegistroIntegracaoTransportadora,
} from "../../dominio/integracao/tipos";
import type { IdTransportadora } from "../../dominio/transportadora/tipos";

const ORDEM_EVIDENCIA: NivelEvidenciaIntegracao[] = [
  "UNKNOWN",
  "MANIFEST_DISCOVERED",
  "CODE_DISCOVERED",
  "ADB_VALIDATED",
  "DEVICE_VALIDATED",
  "PRODUCTION_VALIDATED",
];

export function nivelPeloMenos(
  atual: NivelEvidenciaIntegracao,
  minimo: NivelEvidenciaIntegracao,
): boolean {
  return ORDEM_EVIDENCIA.indexOf(atual) >= ORDEM_EVIDENCIA.indexOf(minimo);
}

export function obterEvidenciaCapacidade(
  registro: RegistroIntegracaoTransportadora,
  capacidade: CapacidadeIntegracao,
): EvidenciaCapacidade | null {
  return (
    registro.capacidades.find((item) => item.capacidade === capacidade) ?? null
  );
}

/**
 * Uma capacidade so pode ser usada automaticamente em producao quando
 * foi explicitamente PRODUCTION_VALIDATED.
 */
export function capacidadeAutomaticaPermitida(
  registro: RegistroIntegracaoTransportadora,
  capacidade: CapacidadeIntegracao,
): boolean {
  return (
    obterEvidenciaCapacidade(registro, capacidade)?.nivel ===
    "PRODUCTION_VALIDATED"
  );
}

/**
 * Resolve o plano sem transformar descoberta estatica em automacao.
 *
 * Hoje Anjun/iMile ficam em modo assistido ate passarem por ADB, aparelho
 * autenticado e validacao de producao.
 */
export function resolverIntegracao(
  transportadora: IdTransportadora,
): PlanoIntegracao {
  const registro = obterIntegracaoTransportadora(transportadora);

  if (!registro || !registro.packageName) {
    return {
      transportadora,
      estrategia: "ASSISTIDO_MANUAL",
      automatica: false,
      motivo: "Aplicativo operacional ainda nao foi identificado com seguranca.",
      packageName: null,
    };
  }

  if (capacidadeAutomaticaPermitida(registro, "DEEP_LINK")) {
    return {
      transportadora,
      estrategia: "DEEP_LINK",
      automatica: true,
      motivo: "Deep link validado em producao para esta versao do aplicativo.",
      packageName: registro.packageName,
    };
  }

  if (capacidadeAutomaticaPermitida(registro, "INTENT_EXPLICITO")) {
    return {
      transportadora,
      estrategia: "INTENT_EXPLICITO",
      automatica: true,
      motivo: "Intent explicito validado em producao.",
      packageName: registro.packageName,
    };
  }

  const texto = capacidadeAutomaticaPermitida(
    registro,
    "COMPARTILHAR_TEXTO",
  );
  const imagem = capacidadeAutomaticaPermitida(
    registro,
    "COMPARTILHAR_IMAGEM",
  );

  if (texto || imagem) {
    return {
      transportadora,
      estrategia: "COMPARTILHAMENTO",
      automatica: true,
      motivo: "Compartilhamento externo validado em producao.",
      packageName: registro.packageName,
    };
  }

  if (capacidadeAutomaticaPermitida(registro, "ABRIR_APP")) {
    return {
      transportadora,
      estrategia: "CLIPBOARD_E_ABRIR_APP",
      automatica: false,
      motivo:
        "Abertura do app esta validada, mas o preenchimento externo ainda requer assistencia.",
      packageName: registro.packageName,
    };
  }

  return {
    transportadora,
    estrategia: "ASSISTIDO_MANUAL",
    automatica: false,
    motivo:
      "Package conhecido por analise do APK; aguarda ADB/aparelho antes de qualquer automacao.",
    packageName: registro.packageName,
  };
}

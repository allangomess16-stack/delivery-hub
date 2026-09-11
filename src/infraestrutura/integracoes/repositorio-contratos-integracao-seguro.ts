import type {
  FonteContratosIntegracao,
  RepositorioContratosIntegracao,
} from "../../aplicacao/portas/repositorio-contratos-integracao";
import type {
  ConfiguracaoContratoIntegracao,
  ConsultaContratoIntegracao,
  ContratoIntegracaoEfetivo,
  ModoContratoIntegracao,
} from "../../dominio/integracao/contrato-integracao";
import type { ArmazenamentoChaveValor } from "../armazenamento/armazenamento-chave-valor";

const MODOS = new Set<ModoContratoIntegracao>(["DEEPLINK", "CLIPBOARD_APP", "MANUAL"]);
const EVIDENCIAS = new Set([
  "UNKNOWN",
  "MANIFEST_DISCOVERED",
  "CODE_DISCOVERED",
  "ADB_VALIDATED",
  "DEVICE_VALIDATED",
  "PRODUCTION_VALIDATED",
]);

function chaveCache(consulta: ConsultaContratoIntegracao): string {
  return `integracoes:contratos:${consulta.transportadora}:${consulta.versionCode}`;
}

function dataValida(valor: unknown): valor is string {
  return typeof valor === "string" && Number.isFinite(Date.parse(valor));
}

function validarContrato(
  valor: unknown,
  consulta: ConsultaContratoIntegracao,
  protocolosPermitidos: ReadonlySet<string>,
): ConfiguracaoContratoIntegracao | null {
  if (!valor || typeof valor !== "object") return null;
  const item = valor as Partial<ConfiguracaoContratoIntegracao>;
  if (
    item.versaoSchema !== 1 ||
    item.transportadora !== consulta.transportadora ||
    item.versionCode !== consulta.versionCode ||
    typeof item.versaoContrato !== "number" ||
    !Number.isInteger(item.versaoContrato) ||
    item.versaoContrato < 1 ||
    typeof item.habilitado !== "boolean" ||
    !MODOS.has(item.modo as ModoContratoIntegracao) ||
    !EVIDENCIAS.has(item.evidencia ?? "") ||
    !dataValida(item.atualizadoEm)
  ) {
    return null;
  }

  if (item.expiraEm !== undefined && !dataValida(item.expiraEm)) return null;
  if (
    item.protocoloId !== undefined &&
    item.protocoloId !== null &&
    typeof item.protocoloId !== "string"
  ) return null;
  if (item.modo === "DEEPLINK" && !item.protocoloId) return null;
  if (item.protocoloId && !protocolosPermitidos.has(item.protocoloId)) return null;
  if (item.motivo !== undefined && (typeof item.motivo !== "string" || item.motivo.length > 300)) {
    return null;
  }

  return {
    versaoSchema: 1,
    transportadora: item.transportadora,
    versionCode: item.versionCode,
    protocoloId: item.protocoloId ?? null,
    versaoContrato: item.versaoContrato,
    habilitado: item.habilitado,
    modo: item.modo as ModoContratoIntegracao,
    evidencia: item.evidencia as ConfiguracaoContratoIntegracao["evidencia"],
    atualizadoEm: item.atualizadoEm,
    expiraEm: item.expiraEm,
    motivo: item.motivo,
  };
}

function expirado(contrato: ConfiguracaoContratoIntegracao, agora: number): boolean {
  return contrato.expiraEm !== undefined && Date.parse(contrato.expiraEm) <= agora;
}

function efetivo(
  contrato: ConfiguracaoContratoIntegracao,
  origem: ContratoIntegracaoEfetivo["origem"],
  agora: number,
): ContratoIntegracaoEfetivo {
  return { ...contrato, origem, expirado: expirado(contrato, agora) };
}

function padraoSeguro(consulta: ConsultaContratoIntegracao): ContratoIntegracaoEfetivo {
  return {
    versaoSchema: 1,
    transportadora: consulta.transportadora,
    versionCode: consulta.versionCode,
    protocoloId: null,
    versaoContrato: 0,
    habilitado: true,
    modo: "CLIPBOARD_APP",
    evidencia: "UNKNOWN",
    atualizadoEm: new Date(0).toISOString(),
    motivo: "Versao sem contrato homologado; usar abertura assistida.",
    origem: "PADRAO_SEGURO",
    expirado: false,
  };
}

export class RepositorioContratosIntegracaoSeguro
implements RepositorioContratosIntegracao {
  constructor(
    private readonly armazenamento: ArmazenamentoChaveValor,
    private readonly fonteRemota: FonteContratosIntegracao,
    private readonly contratosEmbarcados: readonly ConfiguracaoContratoIntegracao[],
    private readonly protocolosPermitidos: ReadonlySet<string>,
    private readonly agora: () => number = Date.now,
  ) {}

  async resolver(consulta: ConsultaContratoIntegracao): Promise<ContratoIntegracaoEfetivo> {
    const agora = this.agora();

    try {
      const remotoBruto = await this.fonteRemota.obter(
        consulta.transportadora,
        consulta.versionCode,
      );
      const remoto = validarContrato(remotoBruto, consulta, this.protocolosPermitidos);
      if (remoto && !expirado(remoto, agora)) {
        await this.armazenamento.salvar(chaveCache(consulta), remoto);
        return efetivo(remoto, "REMOTO", agora);
      }
    } catch {
      // Rede hostil: a decisao continua pelo ultimo contrato valido/cache local.
    }

    const cacheBruto = await this.armazenamento
      .obter<ConfiguracaoContratoIntegracao>(chaveCache(consulta))
      .catch(() => null);
    const cache = validarContrato(cacheBruto, consulta, this.protocolosPermitidos);
    if (cache) {
      // Um kill switch conhecido permanece fail-closed mesmo expirado.
      if (!cache.habilitado || !expirado(cache, agora)) {
        return efetivo(cache, "CACHE", agora);
      }
    }

    const embarcado = this.contratosEmbarcados.find(
      (item) =>
        item.transportadora === consulta.transportadora &&
        item.versionCode === consulta.versionCode,
    );
    if (embarcado) return efetivo(embarcado, "EMBARCADO", agora);

    return padraoSeguro(consulta);
  }

  async definir(contrato: ConfiguracaoContratoIntegracao): Promise<void> {
    if (!this.fonteRemota.salvar) {
      throw new Error("A configuracao remota nao esta disponivel neste ambiente.");
    }
    const consulta: ConsultaContratoIntegracao = {
      transportadora: contrato.transportadora,
      packageName: "validado-pelo-adaptador",
      versionCode: contrato.versionCode,
    };
    const validado = validarContrato(contrato, consulta, this.protocolosPermitidos);
    if (!validado || expirado(validado, this.agora())) {
      throw new Error("Contrato de integracao invalido ou expirado.");
    }
    await this.fonteRemota.salvar(validado);
    await this.armazenamento.salvar(chaveCache(consulta), validado);
  }
}

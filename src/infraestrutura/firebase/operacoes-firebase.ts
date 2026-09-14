import type { EstadoEntrega } from "../../dominio/entrega/tipos";
import type { ItemOutboxEntrega } from "../../dominio/sincronizacao/tipos";

export interface OperacaoPacoteFirebase {
  operacaoId: string;
  tipo: ItemOutboxEntrega["tipo"];
  entrega: EstadoEntrega;
  usuarioId: string;
  atualizadoEm: string;
  tracking?: string;
  transportadoraId?: string;
  contextoOperacional?: "REGULAR" | "EXTRA_ROTA" | "AVULSA";
  alertaAdmin?: boolean;
  conciliacaoExtraRota?: { status: "ABERTA" | "RESOLVIDA"; resolvidaEm?: string };
}

/**
 * Remove propriedades `undefined` antes de enviar um objeto ao Realtime Database.
 *
 * O Firebase rejeita `undefined` em qualquer profundidade. Como o dominio usa
 * campos opcionais normalmente, a fronteira de infraestrutura precisa
 * serializar o payload para um formato JSON seguro antes da gravacao.
 */
export function prepararParaFirebase<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function pareceOperacao(valor: unknown): valor is OperacaoPacoteFirebase {
  if (!valor || typeof valor !== "object") return false;
  const candidata = valor as Partial<OperacaoPacoteFirebase>;
  return (
    typeof candidata.operacaoId === "string" &&
    typeof candidata.tipo === "string" &&
    Boolean(candidata.entrega) &&
    typeof candidata.usuarioId === "string" &&
    typeof candidata.atualizadoEm === "string"
  );
}

/**
 * Aceita tanto o formato V0.4.0 atual (um filho por UUID) quanto o formato
 * transitório anterior em que o pacote apontava diretamente para uma operação.
 * Isso evita quebrar dados de homologações já sincronizadas.
 */
export function listarOperacoesPersistidas(valor: unknown): OperacaoPacoteFirebase[] {
  if (pareceOperacao(valor)) return [valor];
  if (!valor || typeof valor !== "object") return [];

  return Object.values(valor as Record<string, unknown>).filter(pareceOperacao);
}

export function operacaoMaisRecente(
  valor: unknown,
): OperacaoPacoteFirebase | null {
  const operacoes = listarOperacoesPersistidas(valor);
  if (!operacoes.length) return null;

  return [...operacoes].sort((a, b) => {
    const porData = b.atualizadoEm.localeCompare(a.atualizadoEm);
    if (porData !== 0) return porData;
    return b.operacaoId.localeCompare(a.operacaoId);
  })[0];
}

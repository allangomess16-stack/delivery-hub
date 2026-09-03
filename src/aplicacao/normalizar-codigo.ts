export interface ResultadoNormalizacao {
  codigo: string;
  precisaRevisao: boolean;
  motivoRevisao?: string;
}

const LIMITE_INTEIRO_SEGURO = Number.MAX_SAFE_INTEGER;

function extrairTrackingDeTextoScanner(texto: string): string | null {
  // Alguns leitores geram textos como: ^TN^Ç^888002431695151^{
  // Consumimos qualquer caractere estranho entre TN e o codigo.
  const resultado = texto.match(/TN[^A-Z0-9]*([A-Z0-9-]{8,})/i);
  if (resultado?.[1]) return resultado[1].trim();

  // Algumas planilhas vieram com sujeira antes de codigos Anjun,
  // por exemplo: A2AJ608101081639012 ou 7.AJ2608...
  const anjunDentroDoTexto = texto.match(/AJ\d{15}/i);
  return anjunDentroDoTexto?.[0]?.trim() ?? null;
}

function limparTexto(texto: string): string {
  return texto.trim().replace(/^`+/, "").toUpperCase();
}

export function normalizarCodigo(valor: unknown): ResultadoNormalizacao {
  if (valor === null || valor === undefined) {
    return { codigo: "", precisaRevisao: true, motivoRevisao: "Codigo vazio" };
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) {
      return { codigo: "", precisaRevisao: true, motivoRevisao: "Numero invalido" };
    }

    if (!Number.isInteger(valor) || Math.abs(valor) > LIMITE_INTEIRO_SEGURO) {
      return {
        codigo: String(valor),
        precisaRevisao: true,
        motivoRevisao: "Codigo numerico pode ter perdido precisao no Excel",
      };
    }

    const codigo = String(valor);
    return {
      codigo,
      precisaRevisao: codigo.length > 15,
      motivoRevisao:
        codigo.length > 15 ? "Codigo numerico com mais de 15 digitos precisa revisao" : undefined,
    };
  }

  const texto = limparTexto(String(valor));
  const trackingExtraido = extrairTrackingDeTextoScanner(texto);

  if (trackingExtraido) {
    return { codigo: trackingExtraido, precisaRevisao: false };
  }

  return {
    codigo: texto,
    precisaRevisao: texto.length === 0,
    motivoRevisao: texto.length === 0 ? "Codigo vazio" : undefined,
  };
}

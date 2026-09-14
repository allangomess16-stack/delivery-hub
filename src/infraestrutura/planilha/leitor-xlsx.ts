import * as XLSX from "xlsx";
import { identificarTransportadora } from "../../aplicacao/identificar-transportadora";
import { normalizarCodigo } from "../../aplicacao/normalizar-codigo";
import type { CargaImportada, PacoteDaCarga } from "../../dominio/carga/tipos";
import type { LeitorPlanilha } from "../../aplicacao/portas/leitor-planilha";

function gerarId(): string {
  return crypto.randomUUID();
}

function nomeEntregador(valor: unknown, indice: number): string {
  const nome = String(valor ?? "").trim();
  return nome || `SEM_NOME_${indice + 1}`;
}

function valorPreenchido(valor: unknown): boolean {
  return valor !== null && valor !== undefined && String(valor).trim() !== "";
}

function cabecalhoDeNumeracao(valor: unknown, coluna: number): boolean {
  if (coluna !== 0) return false;
  const normalizado = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9#]/g, "");
  return ["N", "NO", "NUMERO", "ITEM", "LINHA", "ORDEM", "SEQ", "SEQUENCIA", "INDICE", "#"].includes(normalizado);
}

function valoresParecemNumeracao(linhas: unknown[][], coluna: number): boolean {
  if (coluna !== 0) return false;
  const preenchidos = linhas
    .slice(1)
    .map((linha, indice) => ({ valor: linha?.[coluna], numeroLinha: indice + 1 }))
    .filter(({ valor }) => valorPreenchido(valor));
  if (preenchidos.length < 2) return false;
  return preenchidos.every(({ valor, numeroLinha }) => {
    const numero = Number(String(valor).trim());
    return Number.isInteger(numero) && numero === numeroLinha;
  });
}

export class LeitorXlsx implements LeitorPlanilha {
  async ler(arquivo: File): Promise<CargaImportada> {
    const dados = await arquivo.arrayBuffer();
    const workbook = XLSX.read(dados, { type: "array", raw: true, cellDates: false });
    const nomeAba = workbook.SheetNames[0];

    if (!nomeAba) {
      throw new Error("A planilha nao possui abas.");
    }

    const aba = workbook.Sheets[nomeAba];
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, {
      header: 1,
      raw: true,
      defval: null,
      // Preserva linhas vazias intermediarias para que a coordenada reportada
      // corresponda exatamente a linha vista pelo administrador no Excel.
      blankrows: true,
    });

    if (linhas.length < 2) {
      throw new Error("A planilha nao possui dados suficientes.");
    }

    const cabecalho = linhas[0] ?? [];
    const pacotes: PacoteDaCarga[] = [];
    const entregadores: string[] = [];

    for (let coluna = 0; coluna < cabecalho.length; coluna += 1) {
      const cabecalhoColuna = cabecalho[coluna];
      if (!valorPreenchido(cabecalhoColuna)) continue;
      if (cabecalhoDeNumeracao(cabecalhoColuna, coluna) || valoresParecemNumeracao(linhas, coluna)) continue;

      const entregador = nomeEntregador(cabecalhoColuna, coluna);
      entregadores.push(entregador);

      for (let linha = 1; linha < linhas.length; linha += 1) {
        const valor = linhas[linha]?.[coluna];
        if (!valorPreenchido(valor)) continue;

        const normalizado = normalizarCodigo(valor);
        const transportadora = identificarTransportadora(normalizado.codigo);

        pacotes.push({
          id: gerarId(),
          entregador,
          codigoOriginal: String(valor),
          codigoNormalizado: normalizado.codigo,
          transportadora,
          precisaRevisao: normalizado.precisaRevisao,
          motivoRevisao: normalizado.motivoRevisao,
          origemPlanilha: {
            aba: nomeAba,
            linha: linha + 1,
            coluna: coluna + 1,
            celula: XLSX.utils.encode_cell({ r: linha, c: coluna }),
            cabecalho: entregador,
          },
        });
      }
    }

    return {
      id: gerarId(),
      nomeArquivo: arquivo.name,
      importadaEm: new Date().toISOString(),
      pacotes,
      entregadores: [...new Set(entregadores)],
    };
  }
}

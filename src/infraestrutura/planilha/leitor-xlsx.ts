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
      blankrows: false,
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

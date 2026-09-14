import * as XLSX from "xlsx";
import type { LeitorEnderecos, RegistroEnderecoImportado } from "../../aplicacao/portas/leitor-enderecos";
import { normalizarCodigo } from "../../aplicacao/normalizar-codigo";
import { normalizarTextoRegiao } from "../../aplicacao/regiao/normalizar-texto-regiao";

function indiceCabecalho(cabecalho: unknown[], nomes: string[]): number {
  const normalizados = nomes.map(normalizarTextoRegiao);
  return cabecalho.findIndex((valor) => normalizados.includes(normalizarTextoRegiao(valor)));
}

export class LeitorEnderecosXlsx implements LeitorEnderecos {
  async ler(arquivo: File): Promise<RegistroEnderecoImportado[]> {
    const dados = await arquivo.arrayBuffer();
    const workbook = XLSX.read(dados, { type: "array", raw: true, cellDates: false });
    const nomeAba = workbook.SheetNames[0];
    if (!nomeAba) throw new Error("A planilha de enderecos nao possui abas.");

    const linhas = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[nomeAba], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });

    if (linhas.length < 2) throw new Error("A planilha de enderecos nao possui dados.");
    const cabecalho = linhas[0] ?? [];
    const colunaCodigo = indiceCabecalho(cabecalho, ["CODIGO", "TRACKING", "RASTREIO", "AWB", "ENCOMENDA"]);
    const colunaEndereco = indiceCabecalho(cabecalho, ["ENDERECO", "ADDRESS", "ENDERECO ENTREGA"]);
    const colunaRegiao = indiceCabecalho(cabecalho, ["REGIAO", "CIDADE", "RA", "REGIAO ADMINISTRATIVA"]);

    if (colunaCodigo < 0 || colunaEndereco < 0) {
      throw new Error("A planilha precisa ter as colunas CODIGO/TRACKING e ENDERECO.");
    }

    const registros: RegistroEnderecoImportado[] = [];
    for (let i = 1; i < linhas.length; i += 1) {
      const linha = linhas[i] ?? [];
      const codigo = normalizarCodigo(linha[colunaCodigo]).codigo;
      const endereco = String(linha[colunaEndereco] ?? "").trim();
      if (!codigo || !endereco) continue;
      const regiao = colunaRegiao >= 0 ? String(linha[colunaRegiao] ?? "").trim() : "";
      registros.push({ codigo, endereco, regiao: regiao || undefined });
    }

    return registros;
  }
}

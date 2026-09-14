import type { CargaEntregador } from "../../dominio/carga/tipos";
import type { RegistroEnderecoImportado } from "../portas/leitor-enderecos";
import { definirLocalizacaoPacote } from "./atribuir-localizacao-pacote";

export interface ResultadoImportacaoEnderecos {
  atualizados: number;
  naoEncontrados: string[];
  duplicadosNaCarga: string[];
}

export function associarEnderecosNaCarga(
  carga: CargaEntregador,
  registros: RegistroEnderecoImportado[],
): ResultadoImportacaoEnderecos {
  let atualizados = 0;
  const naoEncontrados: string[] = [];
  const duplicadosNaCarga: string[] = [];

  for (const registro of registros) {
    const encontrados = carga.pacotes.filter((pacote) => pacote.codigoNormalizado === registro.codigo);
    if (!encontrados.length) {
      naoEncontrados.push(registro.codigo);
      continue;
    }
    if (encontrados.length > 1) {
      duplicadosNaCarga.push(registro.codigo);
      continue;
    }

    definirLocalizacaoPacote(encontrados[0], {
      endereco: registro.endereco,
      regiaoPersonalizada: registro.regiao,
      origemRegiao: "IMPORTACAO",
    });
    atualizados += 1;
  }

  return { atualizados, naoEncontrados, duplicadosNaCarga };
}

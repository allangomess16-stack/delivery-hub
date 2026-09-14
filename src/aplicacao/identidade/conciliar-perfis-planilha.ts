import type { PerfilEntregador } from "../../dominio/identidade/tipos";
import { normalizarNomeExcel } from "./normalizar-nome-excel";

export interface PerfilEncontrado {
  colunaExcel: string;
  colunaNormalizada: string;
  entregadorId: string;
  perfil: PerfilEntregador;
}

export interface PerfilDesconhecido {
  colunaExcel: string;
  colunaNormalizada: string;
}

export interface ConflitoPerfil {
  colunaExcel: string;
  colunaNormalizada: string;
  perfis: PerfilEntregador[];
}

export interface PerfilInativoEncontrado {
  colunaExcel: string;
  colunaNormalizada: string;
  perfil: PerfilEntregador;
}

export interface ResultadoConciliacaoPerfis {
  encontrados: PerfilEncontrado[];
  desconhecidos: PerfilDesconhecido[];
  conflitos: ConflitoPerfil[];
  inativos: PerfilInativoEncontrado[];
  podeDistribuir: boolean;
}

/**
 * Papel equivalente ao Profile Matcher.
 * O nome em portugues foi mantido para facilitar manutencao manual do projeto.
 */
export class ConciliadorPerfisPlanilha {
  conciliar(
    colunasExcel: string[],
    perfis: PerfilEntregador[],
  ): ResultadoConciliacaoPerfis {
    const encontrados: PerfilEncontrado[] = [];
    const desconhecidos: PerfilDesconhecido[] = [];
    const conflitos: ConflitoPerfil[] = [];
    const inativos: PerfilInativoEncontrado[] = [];

    for (const colunaExcel of [...new Set(colunasExcel)]) {
      const colunaNormalizada = normalizarNomeExcel(colunaExcel);
      const correspondencias = perfis.filter((perfil) =>
        perfil.excelAliases.some(
          (alias) => normalizarNomeExcel(alias) === colunaNormalizada,
        ),
      );

      if (correspondencias.length === 0) {
        desconhecidos.push({ colunaExcel, colunaNormalizada });
        continue;
      }

      if (correspondencias.length > 1) {
        conflitos.push({ colunaExcel, colunaNormalizada, perfis: correspondencias });
        continue;
      }

      const perfil = correspondencias[0];
      if (!perfil.ativo) {
        inativos.push({ colunaExcel, colunaNormalizada, perfil });
        continue;
      }

      encontrados.push({
        colunaExcel,
        colunaNormalizada,
        entregadorId: perfil.entregadorId,
        perfil,
      });
    }

    return {
      encontrados,
      desconhecidos,
      conflitos,
      inativos,
      podeDistribuir:
        desconhecidos.length === 0 &&
        conflitos.length === 0 &&
        inativos.length === 0,
    };
  }
}

import { ArmazenamentoIndexedDb } from "../infraestrutura/armazenamento/armazenamento-indexeddb";
import { ArmazenamentoServidorLocal } from "../infraestrutura/armazenamento/armazenamento-servidor-local";
import { ArmazenamentoCompartilhadoComCache } from "../infraestrutura/armazenamento/armazenamento-compartilhado-com-cache";
import { RepositorioCargaLocalAdapter } from "../infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { RepositorioPerfisLocalAdapter } from "../infraestrutura/armazenamento/repositorio-perfis-local-adapter";
import { RepositorioVinculosExcelLocalAdapter } from "../infraestrutura/armazenamento/repositorio-vinculos-excel-local-adapter";
import { RepositorioContasServidorLocalAdapter } from "../infraestrutura/autenticacao/repositorio-contas-servidor-local-adapter";
import { RepositorioFotosNavegador } from "../infraestrutura/fotos/repositorio-fotos-navegador";
import { AutenticacaoLocalAdapter } from "../infraestrutura/mock/autenticacao-local-adapter";
import { LeitorXlsx } from "../infraestrutura/planilha/leitor-xlsx";
import { LeitorEnderecosXlsx } from "../infraestrutura/planilha/leitor-enderecos-xlsx";
import type { DependenciasAplicacao } from "./dependencias";

export function criarDependenciasLocais(): DependenciasAplicacao {
  const cacheLocal = new ArmazenamentoIndexedDb();
  const servidorLocal = new ArmazenamentoServidorLocal();
  const armazenamento = new ArmazenamentoCompartilhadoComCache(cacheLocal, servidorLocal);
  const repositorioContas = new RepositorioContasServidorLocalAdapter();

  return {
    leitorPlanilha: new LeitorXlsx(),
    leitorEnderecos: new LeitorEnderecosXlsx(),
    autenticacao: new AutenticacaoLocalAdapter(),
    repositorioCargas: new RepositorioCargaLocalAdapter(armazenamento),
    repositorioContas,
    repositorioPerfis: new RepositorioPerfisLocalAdapter(armazenamento),
    repositorioVinculos: new RepositorioVinculosExcelLocalAdapter(armazenamento),
    repositorioFotos: new RepositorioFotosNavegador(),
    prepararInfraestrutura: () => armazenamento.migrarCacheParaServidor(),
    dadosCompartilhadosAtivos: () => armazenamento.servidorAtivo(),
  };
}

import type { LeitorPlanilha } from "../aplicacao/portas/leitor-planilha";
import type { LeitorEnderecos } from "../aplicacao/portas/leitor-enderecos";
import type { RepositorioCargaEntregador } from "../aplicacao/portas/repositorio-carga-entregador";
import type { RepositorioContasAcesso } from "../aplicacao/portas/repositorio-contas-acesso";
import type { RepositorioFotos } from "../aplicacao/portas/repositorio-fotos";
import type { RepositorioPerfisEntregador } from "../aplicacao/portas/repositorio-perfis-entregador";
import type { RepositorioVinculosExcel } from "../aplicacao/portas/repositorio-vinculos-excel";
import type { ServicoAutenticacao } from "../aplicacao/portas/servico-autenticacao";

export interface DependenciasAplicacao {
  leitorPlanilha: LeitorPlanilha;
  leitorEnderecos: LeitorEnderecos;
  autenticacao: ServicoAutenticacao;
  repositorioCargas: RepositorioCargaEntregador;
  repositorioContas: RepositorioContasAcesso;
  repositorioPerfis: RepositorioPerfisEntregador;
  repositorioVinculos: RepositorioVinculosExcel;
  repositorioFotos: RepositorioFotos;
  prepararInfraestrutura(): Promise<void>;
  dadosCompartilhadosAtivos(): Promise<boolean>;
}

import type { LeitorPlanilha } from "../aplicacao/portas/leitor-planilha";
import type { LeitorEnderecos } from "../aplicacao/portas/leitor-enderecos";
import type { RepositorioCargaEntregador } from "../aplicacao/portas/repositorio-carga-entregador";
import type { RepositorioContasAcesso } from "../aplicacao/portas/repositorio-contas-acesso";
import type { RepositorioFotos } from "../aplicacao/portas/repositorio-fotos";
import type { RepositorioPerfisEntregador } from "../aplicacao/portas/repositorio-perfis-entregador";
import type { RepositorioVinculosExcel } from "../aplicacao/portas/repositorio-vinculos-excel";
import type { ServicoAutenticacao } from "../aplicacao/portas/servico-autenticacao";
import type { ServicoOperacoesEntrega } from "../aplicacao/sincronizacao/servico-operacoes-entrega";
import type { ServicoSincronizacaoEntrega } from "../aplicacao/sincronizacao/servico-sincronizacao-entrega";
import type { ObservadorDadosRemotos } from "../aplicacao/portas/observador-dados-remotos";
import type { IntegracaoTransportadora } from "../aplicacao/portas/integracao-transportadora";
import type { IdTransportadora } from "../dominio/transportadora/tipos";
import type { RepositorioTelemetriaIntegracao } from "../aplicacao/portas/repositorio-telemetria-integracao";
import type { RepositorioContratosIntegracao } from "../aplicacao/portas/repositorio-contratos-integracao";
import type { RepositorioOperacoesScanner } from "../aplicacao/portas/repositorio-operacoes-scanner";
import type { AssistentePreenchimentoImile } from "../aplicacao/portas/assistente-preenchimento-imile";

export interface DependenciasAplicacao {
  leitorPlanilha: LeitorPlanilha;
  leitorEnderecos: LeitorEnderecos;
  autenticacao: ServicoAutenticacao;
  repositorioCargas: RepositorioCargaEntregador;
  repositorioContas: RepositorioContasAcesso;
  repositorioPerfis: RepositorioPerfisEntregador;
  repositorioVinculos: RepositorioVinculosExcel;
  repositorioFotos: RepositorioFotos;

  /** Casos de uso que garantem conclusao local + Outbox. */
  operacoesEntrega: ServicoOperacoesEntrega;
  /** Processa/reconcilia a fila sem expor IndexedDB para a interface. */
  sincronizacaoEntregas: ServicoSincronizacaoEntrega;
  /** Notifica mudancas de outro cliente sem acoplar a interface ao Firebase. */
  observadorDadosRemotos: ObservadorDadosRemotos;
  /** Adaptadores isolados; uma transportadora nunca altera a regra de outra. */
  integracoesTransportadoras: Partial<Record<IdTransportadora, IntegracaoTransportadora>>;
  repositorioTelemetriaIntegracao: RepositorioTelemetriaIntegracao;
  repositorioContratosIntegracao: RepositorioContratosIntegracao;
  /** Historico local idempotente do scanner livre e assistido. */
  repositorioOperacoesScanner: RepositorioOperacoesScanner;
  /** Preenche campos comprovados da iMile, sem foto, assinatura ou baixa final. */
  assistentePreenchimentoImile: AssistentePreenchimentoImile;

  prepararInfraestrutura(): Promise<void>;
  prepararDadosDemonstracao(): Promise<void>;
  dadosCompartilhadosAtivos(): Promise<boolean>;
  iniciarSincronizacaoAutomatica(entregadorId?: string): () => void;
}

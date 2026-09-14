import { ArmazenamentoIndexedDb } from "../infraestrutura/armazenamento/armazenamento-indexeddb";
import { ArmazenamentoServidorLocal } from "../infraestrutura/armazenamento/armazenamento-servidor-local";
import { ArmazenamentoCompartilhadoComCache } from "../infraestrutura/armazenamento/armazenamento-compartilhado-com-cache";
import { RepositorioCargaLocalAdapter } from "../infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { RepositorioPerfisLocalAdapter } from "../infraestrutura/armazenamento/repositorio-perfis-local-adapter";
import { RepositorioVinculosExcelLocalAdapter } from "../infraestrutura/armazenamento/repositorio-vinculos-excel-local-adapter";
import { RepositorioContasServidorLocalAdapter } from "../infraestrutura/autenticacao/repositorio-contas-servidor-local-adapter";
import { RepositorioFotosNavegador } from "../infraestrutura/fotos/repositorio-fotos-navegador";
import { AutenticacaoLocalAdapter } from "../infraestrutura/mock/autenticacao-local-adapter";
import { DestinoSincronizacaoLocal } from "../infraestrutura/mock/destino-sincronizacao-local";
import { LeitorXlsx } from "../infraestrutura/planilha/leitor-xlsx";
import { LeitorEnderecosXlsx } from "../infraestrutura/planilha/leitor-enderecos-xlsx";
import { RepositorioOutboxIndexedDb } from "../infraestrutura/outbox/repositorio-outbox-indexeddb";
import { SincronizadorAutomaticoOutbox } from "../infraestrutura/outbox/sincronizador-automatico-outbox";
import { ServicoOperacoesEntrega } from "../aplicacao/sincronizacao/servico-operacoes-entrega";
import { ServicoSincronizacaoEntrega } from "../aplicacao/sincronizacao/servico-sincronizacao-entrega";
import type { DependenciasAplicacao } from "./dependencias";
import { ObservadorDadosRemotosNulo } from "../infraestrutura/mock/observador-dados-remotos-nulo";
import { prepararDadosTeste } from "../infraestrutura/mock/preparar-dados-teste";
import { criarIntegracaoAnjun, criarIntegracaoIMile } from "./composicao-integracoes-android";
import { RepositorioTelemetriaIntegracaoNulo } from "../infraestrutura/integracoes/repositorio-telemetria-integracao-nulo";
import { FonteContratosIntegracaoNula } from "../infraestrutura/integracoes/fonte-contratos-integracao-nula";
import { RepositorioContratosIntegracaoSeguro } from "../infraestrutura/integracoes/repositorio-contratos-integracao-seguro";
import {
  POLITICAS_IMILE_HOMOLOGADAS,
  PROTOCOLO_IMILE_REQUEST_CODE_V1,
} from "./contratos-integracao/imile-2-3-18";
import { RepositorioOperacoesScannerIndexedDb } from "../infraestrutura/scanner/repositorio-operacoes-scanner-indexeddb";
import { AssistentePreenchimentoImileCapacitor } from "../infraestrutura/android/assistente-preenchimento-imile-capacitor";

export function criarDependenciasLocais(): DependenciasAplicacao {
  const cacheLocal = new ArmazenamentoIndexedDb();
  const servidorLocal = new ArmazenamentoServidorLocal();
  const armazenamento = new ArmazenamentoCompartilhadoComCache(cacheLocal, servidorLocal);
  const repositorioContas = new RepositorioContasServidorLocalAdapter();
  const repositorioPerfis = new RepositorioPerfisLocalAdapter(armazenamento);
  const repositorioCargas = new RepositorioCargaLocalAdapter(armazenamento);
  const repositorioOutbox = new RepositorioOutboxIndexedDb(cacheLocal);
  const servicoOperacoes = new ServicoOperacoesEntrega(repositorioOutbox, repositorioCargas);
  const servicoSincronizacao = new ServicoSincronizacaoEntrega(
    repositorioOutbox,
    repositorioCargas,
    new DestinoSincronizacaoLocal(),
    () => navigator.onLine,
  );
  const automatico = new SincronizadorAutomaticoOutbox(servicoSincronizacao);
  const telemetriaIntegracao = new RepositorioTelemetriaIntegracaoNulo();
  const repositorioContratos = new RepositorioContratosIntegracaoSeguro(
    cacheLocal,
    new FonteContratosIntegracaoNula(),
    [...POLITICAS_IMILE_HOMOLOGADAS],
    new Set([PROTOCOLO_IMILE_REQUEST_CODE_V1]),
  );

  return {
    leitorPlanilha: new LeitorXlsx(),
    leitorEnderecos: new LeitorEnderecosXlsx(),
    autenticacao: new AutenticacaoLocalAdapter(),
    repositorioCargas,
    repositorioContas,
    repositorioPerfis,
    repositorioVinculos: new RepositorioVinculosExcelLocalAdapter(armazenamento),
    repositorioFotos: new RepositorioFotosNavegador(),
    operacoesEntrega: servicoOperacoes,
    sincronizacaoEntregas: servicoSincronizacao,
    observadorDadosRemotos: new ObservadorDadosRemotosNulo(),
    integracoesTransportadoras: {
      ANJUN: criarIntegracaoAnjun(),
      IMILE: criarIntegracaoIMile({
        armazenamento: cacheLocal,
        repositorioContratos,
        telemetria: telemetriaIntegracao,
      }),
    },
    repositorioTelemetriaIntegracao: telemetriaIntegracao,
    repositorioContratosIntegracao: repositorioContratos,
    repositorioOperacoesScanner: new RepositorioOperacoesScannerIndexedDb(cacheLocal),
    assistentePreenchimentoImile: new AssistentePreenchimentoImileCapacitor(),
    prepararInfraestrutura: async () => {
      await armazenamento.migrarCacheParaServidor();
      await servicoSincronizacao.reconciliar();
    },
    prepararDadosDemonstracao: () => prepararDadosTeste(repositorioPerfis, repositorioContas),
    dadosCompartilhadosAtivos: () => armazenamento.servidorAtivo(),
    iniciarSincronizacaoAutomatica: (entregadorId) => automatico.iniciar(entregadorId),
  };
}

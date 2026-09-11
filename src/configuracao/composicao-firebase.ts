import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { ArmazenamentoIndexedDb } from "../infraestrutura/armazenamento/armazenamento-indexeddb";
import { ArmazenamentoRemotoComCache } from "../infraestrutura/armazenamento/armazenamento-remoto-com-cache";
import { RepositorioCargaLocalAdapter } from "../infraestrutura/armazenamento/repositorio-carga-local-adapter";
import { RepositorioPerfisLocalAdapter } from "../infraestrutura/armazenamento/repositorio-perfis-local-adapter";
import { RepositorioVinculosExcelLocalAdapter } from "../infraestrutura/armazenamento/repositorio-vinculos-excel-local-adapter";
import { RepositorioFotosNavegador } from "../infraestrutura/fotos/repositorio-fotos-navegador";
import { LeitorEnderecosXlsx } from "../infraestrutura/planilha/leitor-enderecos-xlsx";
import { LeitorXlsx } from "../infraestrutura/planilha/leitor-xlsx";
import { ArmazenamentoRealtimeFirebase } from "../infraestrutura/firebase/armazenamento-realtime-firebase";
import { AutenticacaoFirebaseAdapter } from "../infraestrutura/firebase/autenticacao-firebase-adapter";
import { RepositorioContasFirebaseAdapter } from "../infraestrutura/firebase/repositorio-contas-firebase-adapter";
import { RepositorioCargaFirebaseAdapter } from "../infraestrutura/firebase/repositorio-carga-firebase-adapter";
import { DestinoSincronizacaoFirebase } from "../infraestrutura/firebase/destino-sincronizacao-firebase";
import { RepositorioOutboxIndexedDb } from "../infraestrutura/outbox/repositorio-outbox-indexeddb";
import { SincronizadorAutomaticoOutbox } from "../infraestrutura/outbox/sincronizador-automatico-outbox";
import { ServicoOperacoesEntrega } from "../aplicacao/sincronizacao/servico-operacoes-entrega";
import { ServicoSincronizacaoEntrega } from "../aplicacao/sincronizacao/servico-sincronizacao-entrega";
import type { DependenciasAplicacao } from "./dependencias";
import type { FirebaseRuntimeConfig } from "./firebase-runtime";
import { ConectividadeFirebase } from "../infraestrutura/firebase/conectividade-firebase";
import { ObservadorDadosRemotosFirebase } from "../infraestrutura/firebase/observador-dados-remotos-firebase";
import { ClienteRealtimeRest } from "../infraestrutura/firebase/cliente-realtime-rest";
import { FonteContratosIntegracaoFirebase } from "../infraestrutura/firebase/fonte-contratos-integracao-firebase";
import { RepositorioTelemetriaIntegracaoFirebase } from "../infraestrutura/firebase/repositorio-telemetria-integracao-firebase";
import { RepositorioTelemetriaIntegracaoComFila } from "../infraestrutura/integracoes/repositorio-telemetria-integracao-com-fila";
import { criarIntegracaoAnjun, criarIntegracaoIMile } from "./composicao-integracoes-android";
import { RepositorioContratosIntegracaoSeguro } from "../infraestrutura/integracoes/repositorio-contratos-integracao-seguro";
import {
  POLITICAS_IMILE_HOMOLOGADAS,
  PROTOCOLO_IMILE_REQUEST_CODE_V1,
} from "./contratos-integracao/imile-2-3-18";
import { RepositorioOperacoesScannerIndexedDb } from "../infraestrutura/scanner/repositorio-operacoes-scanner-indexeddb";

export function criarDependenciasFirebase(
  config: FirebaseRuntimeConfig,
): DependenciasAplicacao {
  const existente = getApps().find((item) => item.name === "delivery-hub");
  const app = existente ?? initializeApp(config.firebase, "delivery-hub");
  const auth = getAuth(app);
  const database = getDatabase(app, config.databaseURL);
  const rest = new ClienteRealtimeRest(auth, config.databaseURL);

  const cacheLocal = new ArmazenamentoIndexedDb(
    `delivery-hub-firebase-${config.projectId}`,
  );

  const armazenamentoRemoto = new ArmazenamentoRealtimeFirebase(rest);
  const armazenamento = new ArmazenamentoRemotoComCache(
    cacheLocal,
    armazenamentoRemoto,
    true,
  );

  const repositorioCargaLocal = new RepositorioCargaLocalAdapter(cacheLocal);
  const repositorioCargas = new RepositorioCargaFirebaseAdapter(
    auth,
    rest,
    repositorioCargaLocal,
  );
  const repositorioOutbox = new RepositorioOutboxIndexedDb(cacheLocal);
  const conectividade = new ConectividadeFirebase();
  const servicoOperacoes = new ServicoOperacoesEntrega(repositorioOutbox, repositorioCargas);
  const servicoSincronizacao = new ServicoSincronizacaoEntrega(
    repositorioOutbox,
    repositorioCargas,
    new DestinoSincronizacaoFirebase(auth, rest),
    () => conectividade.estaOnline(),
  );
  const automatico = new SincronizadorAutomaticoOutbox(servicoSincronizacao);
  const telemetriaIntegracao = new RepositorioTelemetriaIntegracaoComFila(
    cacheLocal,
    new RepositorioTelemetriaIntegracaoFirebase(auth, rest),
  );
  const fonteContratos = new FonteContratosIntegracaoFirebase(rest);
  const repositorioContratos = new RepositorioContratosIntegracaoSeguro(
    cacheLocal,
    fonteContratos,
    [...POLITICAS_IMILE_HOMOLOGADAS],
    new Set([PROTOCOLO_IMILE_REQUEST_CODE_V1]),
  );

  return {
    leitorPlanilha: new LeitorXlsx(),
    leitorEnderecos: new LeitorEnderecosXlsx(),
    autenticacao: new AutenticacaoFirebaseAdapter(auth, rest),
    repositorioCargas,
    repositorioContas: new RepositorioContasFirebaseAdapter(
      config.firebase,
      database,
    ),
    repositorioPerfis: new RepositorioPerfisLocalAdapter(armazenamento),
    repositorioVinculos: new RepositorioVinculosExcelLocalAdapter(armazenamento),
    repositorioFotos: new RepositorioFotosNavegador(),
    operacoesEntrega: servicoOperacoes,
    sincronizacaoEntregas: servicoSincronizacao,
    observadorDadosRemotos: new ObservadorDadosRemotosFirebase(database),
    integracoesTransportadoras: {
      ANJUN: criarIntegracaoAnjun(),
      IMILE: criarIntegracaoIMile({
        armazenamento: cacheLocal,
        fonteContratos,
        repositorioContratos,
        telemetria: telemetriaIntegracao,
      }),
    },
    repositorioTelemetriaIntegracao: telemetriaIntegracao,
    repositorioContratosIntegracao: repositorioContratos,
    repositorioOperacoesScanner: new RepositorioOperacoesScannerIndexedDb(cacheLocal),
    prepararInfraestrutura: async () => {
      conectividade.iniciar();
      telemetriaIntegracao.iniciar();
      // Nao migra automaticamente dados locais antigos entre ambientes.
      await servicoSincronizacao.reconciliar();
    },
    // Contas Firebase sao criadas somente por uma acao deliberada do Admin.
    prepararDadosDemonstracao: async () => undefined,
    dadosCompartilhadosAtivos: () => armazenamentoRemoto.estaDisponivel(),
    iniciarSincronizacaoAutomatica: (entregadorId) => automatico.iniciar(entregadorId),
  };
}

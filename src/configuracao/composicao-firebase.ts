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
import type { DependenciasAplicacao } from "./dependencias";
import type { FirebaseRuntimeConfig } from "./firebase-runtime";

export function criarDependenciasFirebase(
  config: FirebaseRuntimeConfig,
): DependenciasAplicacao {
  const existente = getApps().find((item) => item.name === "delivery-hub");
  const app = existente ?? initializeApp(config.firebase, "delivery-hub");
  const auth = getAuth(app);
  const database = getDatabase(app, config.databaseURL);

  // Banco local separado do ambiente DEV antigo para evitar misturar cargas de teste.
  const cacheLocal = new ArmazenamentoIndexedDb(
    `delivery-hub-firebase-${config.projectId}`,
  );

  const armazenamentoRemoto = new ArmazenamentoRealtimeFirebase(database);
  const armazenamento = new ArmazenamentoRemotoComCache(
    cacheLocal,
    armazenamentoRemoto,
  );

  const repositorioCargaLocal = new RepositorioCargaLocalAdapter(cacheLocal);

  return {
    leitorPlanilha: new LeitorXlsx(),
    leitorEnderecos: new LeitorEnderecosXlsx(),
    autenticacao: new AutenticacaoFirebaseAdapter(auth, database),
    repositorioCargas: new RepositorioCargaFirebaseAdapter(
      auth,
      database,
      repositorioCargaLocal,
    ),
    repositorioContas: new RepositorioContasFirebaseAdapter(
      config.firebase,
      database,
    ),
    repositorioPerfis: new RepositorioPerfisLocalAdapter(armazenamento),
    repositorioVinculos: new RepositorioVinculosExcelLocalAdapter(armazenamento),
    repositorioFotos: new RepositorioFotosNavegador(),
    prepararInfraestrutura: async () => {
      // Nao migra automaticamente dados locais antigos para producao.
    },
    dadosCompartilhadosAtivos: () => armazenamentoRemoto.estaDisponivel(),
  };
}

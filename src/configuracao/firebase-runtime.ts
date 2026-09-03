import type { FirebaseOptions } from "firebase/app";

export interface FirebaseRuntimeConfig {
  habilitado: boolean;
  projectId: string;
  databaseURL: string;
  databaseInstance: string;
  firebase: FirebaseOptions;
}

export async function carregarFirebaseRuntimeConfig(): Promise<FirebaseRuntimeConfig | null> {
  try {
    const resposta = await fetch("/firebase-config.json", { cache: "no-store" });
    if (!resposta.ok) return null;

    const config = (await resposta.json()) as Partial<FirebaseRuntimeConfig>;
    if (!config.habilitado) return null;

    if (!config.projectId || !config.databaseURL || !config.firebase?.apiKey || !config.firebase?.appId) {
      throw new Error("Configuracao Firebase incompleta.");
    }

    return config as FirebaseRuntimeConfig;
  } catch (erro) {
    console.error("Falha ao carregar configuracao Firebase.", erro);
    throw erro;
  }
}

export interface HomologacaoRuntimeConfig {
  habilitado: boolean;
}

export async function carregarHomologacaoRuntimeConfig(): Promise<HomologacaoRuntimeConfig> {
  try {
    const resposta = await fetch("/homologacao-config.json", {
      cache: "no-store",
    });

    if (!resposta.ok) return { habilitado: false };

    const config = (await resposta.json()) as Partial<HomologacaoRuntimeConfig>;
    return {
      habilitado: config.habilitado === true,
    };
  } catch {
    return { habilitado: false };
  }
}

export interface AppNativoInstalado {
  packageName: string;
  instalado: boolean;
  consultaConcluida: boolean;
  erroCodigo?: string;
  versionName?: string;
  versionCode?: string;
}

export type CodigoAberturaNativa =
  | "DESPACHADO"
  | "PLATAFORMA_NAO_SUPORTADA"
  | "PACOTE_NAO_INSTALADO"
  | "URI_REJEITADA"
  | "ACAO_NAO_SUPORTADA"
  | "FALHA_NATIVA";

export type CodigoCopiaNativa =
  | "COPIADO"
  | "TEXTO_REJEITADO"
  | "PLATAFORMA_NAO_SUPORTADA"
  | "FALHA_NATIVA";

export interface ResultadoAberturaNativa {
  codigo: CodigoAberturaNativa;
  despachado: boolean;
  packageName: string;
  mensagem: string;
}

export interface ResultadoCopiaNativa {
  codigo: CodigoCopiaNativa;
  copiado: boolean;
  mensagem: string;
}

/**
 * Porta minima usada pelos adaptadores de transportadora.
 *
 * A aplicacao nao conhece Capacitor, Intent, Activity ou Android. O retorno
 * informa apenas se a solicitacao foi despachada; nunca confirma pesquisa ou
 * baixa dentro do aplicativo externo.
 */
export interface PonteNativa {
  consultarApp(packageName: string): Promise<AppNativoInstalado>;
  abrirDeepLink(
    uri: string,
    packageName: string,
  ): Promise<ResultadoAberturaNativa>;
  abrirAplicativo(packageName: string): Promise<ResultadoAberturaNativa>;
  copiarTexto(texto: string): Promise<ResultadoCopiaNativa>;
}

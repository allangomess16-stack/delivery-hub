export interface AppExternoInstalado {
  packageName: string;
  instalado: boolean;
  versionName?: string;
  versionCode?: string;
}

export interface PonteAppExterno {
  consultarApp(packageName: string): Promise<AppExternoInstalado>;
  abrirApp(packageName: string): Promise<void>;
  copiarTexto(texto: string): Promise<void>;
  abrirDeepLink(uri: string, packageName?: string): Promise<void>;
  compartilharImagem(
    packageName: string,
    contentUri: string,
    mimeType: string,
    texto?: string,
  ): Promise<void>;
}

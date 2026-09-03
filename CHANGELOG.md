# Changelog

Todas as versões aprovadas do Delivery Hub são identificadas por tags Git `vX.Y.Z`.

## 0.3.4

### GitHub CLI
- adiciona `00_LOGIN_GITHUB.bat`;
- separa autenticação local do GitHub da conexão do ChatGPT;
- remove tokens de ambiente temporários da sessão antes do login;
- executa `gh auth setup-git`;
- mostra o estado real da autenticação em vez de esconder a saída;
- `01_CONFIGURAR_REPOSITORIO` e `07_GERAR_APK_HOMOLOGACAO` passam a reutilizar o login centralizado.

## 0.3.3

### Homologação mobile
- adiciona modo de homologação sem login;
- adiciona carga demonstrativa para avaliação do produto;
- adiciona scan real de etiqueta em modo somente leitura;
- mostra tracking, transportadora, confiança, regra e estado da integração;
- permite simular o fluxo de entrega com tracking escaneado sem baixa externa;
- adiciona BAT para preparar SDK Android local;
- adiciona BAT para gerar APK de homologação;
- mantém o modo normal desabilitado por padrão no `homologacao-config.json`.

## 0.3.2

### Integrações Android
- registra Anjun `com.anjun.supplierManagement`;
- registra iMile `com.imile.redelivery`;
- mantém J&T como `UNKNOWN`;
- adiciona níveis de evidência por capacidade;
- adiciona resolver que só automatiza `PRODUCTION_VALIDATED`;
- adiciona tela Admin de integrações;
- adiciona BATs ADB para diagnóstico, abertura segura e extração de APK;
- adiciona `<queries>` Android para Anjun/iMile;
- corrige workflow GitHub para não depender de `package-lock.json` ausente.

## 0.3.1

### Organização
- adiciona versionamento Git/GitHub;
- adiciona BATs permanentes em `BAT/GITHUB`;
- adiciona GitHub Actions para TypeScript, testes e build;
- adiciona `.gitattributes`;
- reforça `.gitignore` para Firebase, credenciais e dados operacionais;
- define `main` como branch estável;
- define tags `vX.Y.Z` para releases.

## 0.3.0
- infraestrutura Firebase Authentication;
- Realtime Database;
- regras de segurança;
- Firebase Hosting;
- modo local preservado.

## 0.2.9
- limpeza estrutural de BATs;
- nomes permanentes sem versão;
- organização da documentação histórica.

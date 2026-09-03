# Changelog

Todas as versões aprovadas do Delivery Hub são identificadas por tags Git `vX.Y.Z`.

## 0.3.8

### Homologacao operacional
- primeira leitura do scanner passa a ser imediatamente acionavel;
- tracking e transportadora aparecem assim que o primeiro codigo e detectado;
- botao `CONFIRMAR E CONTINUAR` permite seguir sem esperar uma segunda leitura;
- segunda leitura continua como confirmacao automatica quando ocorrer em janela curta;
- scanner deixa de converter cada quadro em JPEG quando ha leitura direta disponivel;
- ZXing passa a trabalhar diretamente no stream de video como fallback continuo;
- nome e CPF/documento do recebedor aparecem no fluxo como campos opcionais;
- CPF/documento vazio nao impede confirmar a entrega;
- resumo final mostra quando CPF/documento nao foi informado;
- BAT 07 passa a adotar automaticamente o historico remoto quando o ZIP completo for extraido em uma pasta nova.

## 0.3.7

### Scanner ao vivo
- scanner contínuo de câmera no modo de homologação;
- confirmação em duas leituras antes de aceitar o tracking;
- feedback visual e vibração ao confirmar;
- lanterna quando suportada pela câmera;
- foto preservada apenas como fallback;
- recorte central do frame para aumentar a área útil do barcode;
- Anjun passa a reconhecer AJ + 14 ou 15 dígitos;
- teste real iMile `6082326246225`;
- permissão CAMERA aplicada automaticamente ao AndroidManifest gerado;
- versionName/versionCode do Android derivados do package.json;
- assinatura debug de homologação preservada pelo cache do GitHub Actions;
- BAT de APK tolera queda temporária de internet durante acompanhamento do GitHub Actions.

## 0.3.6

### Consolidação
- entrega o sistema completo em um único ZIP;
- incorpora os BATs GitHub corrigidos para Windows;
- incorpora o workflow APK na estrutura `.github/workflows`;
- fixa o fluxo atual para o repositório existente `allangomess16-stack/delivery-hub`;
- adiciona guia `INICIAR_AQUI.txt`;
- registra a refatoração de interface como etapa obrigatória pós-homologação.

## 0.3.5

### Correção GitHub no Windows
- considera `gh auth status` como fonte oficial do estado de login;
- corrige captura de `gh api user` em BAT no Windows;
- corrige captura de `gh repo view` e `gh run list`;
- remove falso erro depois de login válido no keyring;
- torna o nome do APK dinâmico conforme `package.json`;
- usa nome estável de artefato no GitHub Actions para não quebrar a cada versão.

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

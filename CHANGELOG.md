# Changelog

## 0.5.9.1

- corrige o acionamento para a tela real `Confirmar` observada na iMile 2.3.21;
- localiza rótulos tanto por texto visual quanto por `content-desc`;
- remove a dependência da tela anterior de relação, que pode não aparecer;
- habilita o serviço para conexão explícita do Android após consentimento do usuário.

## 0.5.9

- incorpora o mapeamento observado na iMile Rider Delivery 2.3.21: Activity
  única Flutter, seletores por `content-desc` e campos editáveis sem IDs;
- adiciona preenchimento assistido, opt-in, limitado a relação mapeada, nome,
  número do documento e notas;
- impõe expiração local de dois minutos, ignora todos os pacotes Android fora
  da iMile e nunca toca em foto, assinatura ou `Entregue`;
- mantém CPF como tipo padrão assistido; outros tipos exigem conferência do
  entregador no seletor nativo da iMile;
- substitui o coletor exploratório por versão resiliente à saída `stderr` da
  MIUI e com capturas de Activity, intents e hierarquia visual por etapa;
- total atual: 58 arquivos de teste e 189 testes automatizados.

## 0.5.1

- adiciona contrato versionado da iMile/Rider Delivery 2.3.21 (461), validado por Deep Link sintético;
- redesenha o painel do entregador para a operação híbrida;
- preserva a última operação como contingência de copiar código e abrir aplicativo;
- classifica leituras fora da carga ativa como `EXTRA_ROTA` para conciliação posterior.
- adiciona alerta persistente no Admin, abertura direta da conciliação e sugestão de possível atribuído.

Todas as versões aprovadas do Delivery Hub são identificadas por tags Git `vX.Y.Z`.

## 0.5.0

### Fundação do POD Universal

- permite iniciar o registro completo a partir de qualquer tracking reconhecido;
- isola operações do scanner livre das cargas oficiais importadas;
- reutiliza o fluxo offline de fotos, recebedor e Outbox já homologado;
- adiciona captura de assinatura em canvas, persistida no IndexedDB;
- normaliza fotos e assinaturas com fundo seguro antes da compressão;
- salva o POD e só então abre automaticamente o adaptador da transportadora;
- mantém abertura direta como contingência quando o entregador não registrar POD;
- adiciona validação Firebase para os metadados da assinatura;
- total atual: 50 arquivos de teste e 158 testes automatizados.

## 0.4.9

### Scanner universal e carga opcional

- torna o scanner utilizavel sem carga importada;
- identifica a transportadora antes de consultar o contexto da carga;
- permite que um tracking reconhecido siga para o adaptador mesmo fora da planilha;
- mantém a carga como contexto opcional para registro completo e auditoria;
- cria tela de resultado com sistema reconhecido, origem e estado da integração;
- reconhece transportadoras sem executar adaptadores ainda não homologados;
- registra operações do scanner no IndexedDB com chave idempotente por entregador/dia/tracking;
- preserva o histórico de tentativas sem duplicar contagens diárias;
- total atual: 48 arquivos de teste e 153 testes automatizados.

## 0.4.8.3

### Referências e ciclo de vida profissional das cargas

- separa a referência do lote importado da referência da carga operacional;
- mostra na confirmação apenas os pacotes e entregadores do lote atual;
- preserva, na carga diária consolidada, todos os lotes e arquivos de origem;
- filtra a gestão por cargas ativas, arquivadas ou todas;
- permite remover cargas de teste apenas enquanto nenhum pacote tiver iniciado;
- usa encerramento remoto como tombstone para impedir ressurreição por cache offline;
- mantém compatibilidade visual com cargas antigas por referências determinísticas;
- centraliza regras de referência e remoção na aplicação, sem acoplar o domínio à interface;
- total atual: 45 arquivos de teste e 144 testes automatizados.

## 0.4.8.2

### Reparo conservador e gestão rápida de inconsistências

- consolida cargas ativas duplicadas quando somente uma, ou nenhuma, possui
  operação iniciada; mantém bloqueio se duas cargas já tiverem progresso;
- encerra a carga estrutural duplicada sem mover operações concluídas;
- reconhece automaticamente a primeira coluna sequencial, mesmo com cabeçalho
  não cadastrado;
- permite ignorar qualquer coluna durante a conciliação e registra a decisão;
- adiciona busca global exata por tracking e leitura de foto da etiqueta na
  Gestão de cargas do Admin;
- abre a carga já filtrada no pacote encontrado, reutilizando a transferência
  segura existente;
- adiciona redefinição de senha por e-mail do Firebase para contas existentes;
- substitui o `sdkmanager` descontinuado pelo Android CLI atual, valida os três
  componentes físicos e reutiliza SDK completo encontrado em versão anterior;
- adiciona fallback do repositório oficial para API 35 e Build Tools, com
  validação de tamanho, checksum e conteúdo antes da instalação;
- corrige o preparador Android para a matriz real do AGP 8.7.2: API 35 com Build Tools 34.0.0;
- adiciona aceite expresso e registro local da licenca Android antes da instalacao;
- corrige a abertura da tag `application` no AndroidManifest, que impedia o merge do Manifest;
- adiciona teste estrutural do XML e das declaracoes Android criticas;
- corrige a limpeza da marca antiga de homologacao, que podia remover o `>` da tag `application`;
- valida o AndroidManifest depois de todas as transformacoes e antes de chamar o Gradle;
- mantem o BAT principal aberto e identifica a etapa exata quando Firebase, validacao ou APK falham;
- total atual: 44 arquivos de teste e 139 testes automatizados.

## 0.4.8.1

### Origem exata dos pacotes e recuperação do ADB

- preserva a célula original de cada tracking (`aba`, `linha`, `coluna`,
  `célula` e `cabeçalho`) durante toda a distribuição;
- lista duplicidades internas com as pessoas e posições exatas antes de
  habilitar a distribuição;
- informa a origem nova e o dono da carga existente em conflitos entre
  importações do mesmo dia;
- aceita planilhas numeradas sem criar o falso entregador `Nº`;
- inclui `dados-teste/MODELO_CARGAS_DELIVERY_HUB.xlsx`, preparado para dez
  entregadores e 300 linhas;
- adiciona fallback direto de download do Platform Tools quando o
  `sdkmanager` não materializa `platform-tools/adb.exe`;
- corrige o `versionCode` da variante de homologação para considerar o quarto
  segmento da versão (`0.4.8.1` → `40801`).

## 0.4.8

### Compatibilidade de transportadoras e suporte silencioso

- preserva sem alteração a Outbox operacional homologada na V0.4.7.2;
- seleciona o contrato iMile por `versionCode` e permite apenas protocolos já
  compilados no APK, impedindo configuração remota de URI arbitrária;
- mantém o Deep Link na iMile 2.3.18 / code 458 e usa fallback de clipboard +
  launcher para versão desconhecida, contrato desativado ou falha da Intent;
- adiciona `openApp` e `copyText` ao NativeBridge com package/texto validados;
- adiciona kill switch remoto e cache fail-closed;
- cria o papel separado `SUPORTE`, sem permissões administrativas de carga;
- adiciona painel diário de compatibilidade e incidentes para o suporte;
- envia telemetria sem tracking, recebedor, documento, foto ou token;
- usa fila local de telemetria isolada da Outbox operacional, com backoff,
  limite de tentativas, poison pill bloqueada e teto de 200 itens locais;
- limita a leitura de suporte a 200 eventos no próprio servidor Firebase;
- adiciona os BATs `10_PREPARAR_PILOTO_V048` e `11_CRIAR_USUARIO_SUPORTE`;
- corrige o BAT de validação para preparar dependências e retornar falha real;
- total atual: 39 arquivos e 123 testes automatizados.

## 0.4.7.2

### Reconciliação da projeção local pelo UUID remoto

- corrige a divergência em que a Outbox informava fila vazia, mas o cartão da
  carga permanecia em `AGUARDANDO SYNC`;
- quando o Hub possui exatamente o mesmo UUID da operação local, aplica o
  estado remoto `AGUARDANDO_INTEGRACAO` e repara o resumo do aparelho;
- preserva a operação local quando o UUID remoto é diferente, impedindo que
  uma operação antiga apague uma conclusão offline mais nova;
- renova o ID token e repete uma única vez após HTTP 401;
- classifica `400/403` como falha permanente por item e mantém os itens seguintes;
- respeita backoff exponencial e `Retry-After` em `429/5xx`;
- usa `PATCH` multipath atômico para distribuição e transferências de cargas;
- impede duas cargas ativas por entregador/data e tracking duplicado no mesmo dia;
- consolida nova importação na carga diária já ativa;
- confirma o estado da carga antes de apagar/substituir arquivos de foto;
- exige Firebase em builds operacionais e mantém fallback local apenas em desenvolvimento;
- retira source maps dos builds operacionais;
- restringe o payload de operações nas regras e impede exclusão pelo entregador;
- substitui `numChildren()`, inexistente nas regras do Realtime Database, por
  validação dos índices `0-9` para fotos e `0-99` para eventos;
- remove a configuração Firebase redundante da subpasta;
- adiciona testes de regressão; total atual: 37 arquivos e 113 testes.

## 0.4.7.1

### Recuperação da Outbox no piloto real

- corrige item da Outbox que permanecia em `AGUARDANDO SYNC` depois do aceite
  remoto: a confirmação do Hub agora limpa a fila antes da projeção visual;
- separa a tentativa manual forçada do backoff automático e aguarda uma
  sincronização concorrente em vez de ignorar o toque do entregador;
- limita também a obtenção do token Firebase e impede a interface de ficar
  indefinidamente em `Sincronizando operacoes locais...`;
- adiciona os códigos `DH-SYNC-L01` e `DH-SYNC-U01` para diagnóstico seguro.

## 0.4.7

### Piloto Firebase Admin ↔ entregador

- usa REST autenticado para Outbox, cargas, perfis e leituras do entregador;
- preserva idempotencia por UUID com `if-match: null_etag`;
- usa `navigator.onLine` apenas como filtro e deixa a chamada REST confirmar o backend;
- restringe conexoes persistentes e assinaturas em tempo real ao Admin;
- adiciona porta genérica para observar cargas e operações remotas;
- assina dados por entregador, evitando leitura da raiz completa;
- ignora a leitura inicial do Firebase como evento de alteração;
- agrupa eventos próximos e não interrompe scanner ou formulários;
- atualiza automaticamente resumos seguros do Admin e entregador;
- testa dois clientes, reinício offline, UUID e idempotência remota;
- adiciona APK piloto Firebase separado da homologação local;
- adiciona `BAT/FIREBASE/09_PREPARAR_PILOTO_V047.bat`.
- move a configuração ativa para `firebase.json` na raiz, corrigindo tanto
  `firebase/firebase/database.rules.json` quanto o bloqueio de `../dist` no Hosting.
- remove `public/firebase-config.json` do pacote distribuído e regenera a
  configuração local automaticamente nos BATs 02, 03, 07 e 09.
- o BAT de Admin republica o provedor Email/Senha antes do bootstrap;
- o bootstrap traduz erros seguros do Authentication e recupera uma conta
  parcialmente criada quando a senha informada confirma sua titularidade.
- substitui validações `node -e` frágeis no Windows por um script Node único,
  sem caracteres especiais interpretados pelo `cmd.exe`.
- atualiza `database:set` da Firebase CLI 15 para usar `--force`, substituindo
  a opção removida `--confirm`.
- grava o perfil ADMIN temporário em UTF-8 sem BOM e valida o JSON localmente,
  evitando HTTP 400 no Windows PowerShell 5.

## 0.4.6.1

### Homologação determinística da Outbox

- adiciona conectividade controlável exclusiva do APK de homologação;
- persiste a escolha `SIMULAR SEM REDE` no IndexedDB;
- restaura visualmente a operação pendente ao reiniciar o aplicativo;
- mantém fila e UUID enquanto a rede simulada estiver desativada;
- adiciona `REATIVAR REDE E SINCRONIZAR` para concluir o teste;
- adiciona teste automatizado de reinicialização, idempotência e fila 1 → 0;
- adiciona `BAT/ANDROID/07_VALIDAR_OUTBOX_OFFLINE.bat`;
- mantém scanner contínuo e NativeBridge iMile sem alteração funcional.

## 0.4.4

### Correção da cópia do APK via ADB
- corrige o destino do `adb pull`, agora usando caminho completo do arquivo;
- adiciona `diagnosticos-apk/extracao-apk-log.txt` desde o início do BAT;
- registra retorno e tamanho de cada APK copiado;
- verifica fisicamente o arquivo após `adb pull`;
- preserva `pause` em sucesso, falha e cancelamento;
- se apenas a compactação falhar, o `base.apk` extraído continua utilizável;
- nenhuma regra funcional do Delivery Hub foi alterada.

## 0.4.3

### Extração do APK real instalado
- corrige `04_EXTRAIR_APK_INSTALADO.bat`, removendo execução de ADB dentro de `FOR /F`;
- detecta aparelho e `pm path` por arquivos temporários;
- copia `base.apk` e todos os split APKs do pacote;
- registra versão, launcher, caminhos e SHA-256;
- gera ZIP pronto para análise em `diagnosticos-apk/`;
- melhora a reutilização de SDK/ADB entre pastas `DeliveryHub-V*-COMPLETO`;
- nenhuma regra funcional do Delivery Hub foi alterada.

## 0.4.2

### Diagnóstico Android/iMile
- corrige parsing de `adb devices` quando o ADB está em caminho com espaços;
- corrige escape de `J&T` no Windows `cmd.exe`;
- abertura de Anjun/iMile passa a usar Activity explícita;
- adiciona verificação automática do estado de Activities após abertura;
- adiciona `05_MAPEAR_IMILE_SCANNER.bat` para capturar tela inicial × scanner;
- diagnóstico gera TXT e XML em `diagnosticos-apk/`;
- BATs Android podem reutilizar o SDK local de outra versão do Delivery Hub extraída ao lado;
- nenhuma regra funcional da Outbox/scanner Delivery Hub foi alterada.

## 0.4.1

### Corrigido
- `00_PREPARAR_SDK_ANDROID.bat` não perde mais o caminho do ZIP dentro do bloco `IF`;
- validação explícita do download das Android Command Line Tools antes do `Expand-Archive`;
- instalação e validação de `platform-tools/adb.exe`;
- BATs Android localizam automaticamente o ADB instalado em `.ferramentas`;
- diagnóstico diferencia aparelho `unauthorized`, `offline` e ausente;
- geração local do APK usa a versão atual do `package.json` em vez de nome fixo antigo.

### Mantido
- Outbox/idempotência e estados da V0.4.0 sem alteração funcional.

## 0.4.0

### Confiabilidade offline / Outbox
- separa `estadoFisico` de `estadoIntegracao`;
- adiciona `AGUARDANDO_SINCRONIZACAO`, `SINCRONIZANDO`, `AGUARDANDO_INTEGRACAO`, `CONFIRMADA`, `ERRO` e `ACAO_MANUAL`;
- migra estados antigos de `estadoBaixaExterna` em leitura;
- adiciona Outbox persistente em IndexedDB com UUID por operação;
- salva Outbox antes da carga para permitir recuperação após interrupção;
- adiciona reconciliação de carga a partir do payload da fila;
- adiciona retry com backoff e recuperação de item `PROCESSANDO` abandonado;
- Firebase recebe cada operação em nó próprio por UUID (`.../{pacoteId}/{operacaoId}`), impedindo retransmissão antiga de sobrescrever uma operação nova;
- payload Firebase é sanitizado para remover `undefined` antes da escrita;
- leitura remota preserva estado local ainda pertencente à Outbox;
- erros permanentes/ação manual ficam `BLOQUEADO` e não entram em loop automático de retry;
- sincronização automática é escopada ao entregador autenticado no aparelho;
- entregador deixa de gravar `operacoes` diretamente pelo repositório de carga;
- painel do entregador separa entrega física, sync, Hub, confirmação e ação manual;
- cartões de pendência filtram os pacotes correspondentes;
- sincronização automática reage a retorno da rede/foco/visibilidade;
- homologação passa a permitir teste seguro de modo avião usando o mesmo motor Outbox.

## 0.3.9

### Reenquadramento da interface
- V0.3.8 mantida como baseline funcional homologada.
- `app.ts` reduzido de cerca de 1.117 para cerca de 590 linhas.
- Gestão de cargas extraída para `ControladorAdminCargas`.
- Fluxo de entrega extraído para `ControladorFluxoEntrega`.
- Estado visual isolado em `EstadoUiSessao`, sem Firebase/IndexedDB operacional.
- Filtros, seleção e scroll do Admin são preservados entre re-renderizações.
- Delegação de eventos aplicada nas listas principais.
- Edição de endereço/região migrou para Bottom Sheet com foco e confirmação de descarte.
- Edição de localização atualiza somente card e resumo de regiões, sem desmontar a lista inteira.
- Scanner e recebedor aprovados na V0.3.8 não tiveram regra funcional alterada.

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

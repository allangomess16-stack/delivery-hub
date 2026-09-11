# Delivery Hub — V0.5.6

## V0.5.6 — Galeria no scanner e Anjun nível 1

- a câmera ao vivo permanece exclusivamente no scanner; o campo auxiliar agora
  abre a **galeria** para ler uma etiqueta já fotografada, removendo a duplicidade;
- Anjun `2.4.0` / `versionCode 100` passa a ter somente o fluxo seguro de copiar
  tracking `AJ` e abrir o launcher validado; busca e baixa permanecem manuais;
- o adaptador bloqueia qualquer versão diferente da comprovada no aparelho;
- `BAT\ANDROID\10_DIAGNOSTICAR_FLUXO_REAL_ANJUN.bat` conduz o primeiro teste sem
  confirmar baixa e gera um relatório mascarado.

Para as próximas atualizações, execute apenas `BAT\PUBLICAR_PILOTO_COMPLETO.bat`.
Ele gera o APK, publica a Release GitHub, envia o APK e publica o manifesto no
Firebase. Os BATs individuais continuam disponíveis para recuperar uma etapa.
O roteiro completo está em `docs/V0.5.6_ANJUN_NIVEL_1_E_GALERIA_SCANNER.md`.

## V0.5.5 — Atualização e continuidade assistida

- na abertura, o APK consulta um manifesto pequeno no Firebase Hosting; se houver
  versão superior, oferece **ATUALIZAR AGORA** sem bloquear o trabalho offline;
- o Android abre o download somente para URLs HTTPS autorizadas do projeto; a
  instalação ainda depende da confirmação do usuário;
- o botão físico **Voltar** retorna pelas etapas do POD e não fecha uma entrega
  em andamento; no Lobby, pede confirmação antes de sair;
- uma etiqueta sem padrão reconhecido mantém o tracking lido e permite que o
  entregador selecione iMile, Anjun ou J&T. A escolha fica auditada como manual;
- reconhecimento iMile inclui o padrão `609` e normaliza o formato visual
  `60905264-49890`.

Para publicar uma atualização futura: `BAT\FIREBASE\18_PREPARAR_PILOTO_V055.bat`,
`BAT\GITHUB\03_PUBLICAR_VERSAO.bat`, `BAT\GITHUB\08_ENVIAR_APK_PARA_RELEASE.bat`
e `BAT\FIREBASE\03_SUBIR_ATUALIZACAO.bat`. O roteiro está em
`docs/V0.5.5_ATUALIZACAO_VOLTA_E_SELECAO_MANUAL.md`.

## V0.5.4 — Fotos por câmera ou galeria

- cada evidência do POD oferece dois caminhos explícitos: **CÂMERA** abre a
  câmera traseira; **GALERIA** permite anexar uma foto feita anteriormente no
  celular;
- a origem fica registrada na evidência (`CAMERA` ou `GALERIA`) para auditoria;
- as fotos continuam compactadas e guardadas no aparelho em IndexedDB, sem
  depender de sinal; arquivos vazios, não-imagens e maiores que 15 MB são
  recusados antes do processamento;
- substituir ou remover uma foto mantém o rollback da carga e a limpeza do
  arquivo anterior.

O roteiro de teste está em `docs/V0.5.4_FOTOS_CAMERA_GALERIA.md`.

## V0.5.3 — Lobby operacional e Cockpit preservado

- entrega vinculada abre primeiro no Lobby, não diretamente no scanner;
- Home mostra conectividade, modo piloto, entregas físicas da semana e
  pendências reais da carga atual, sem consulta contínua ao Firebase;
- entrega/POD em andamento recebe ação prioritária de retomada;
- carga importada abre o Cockpit aprovado; sem carga, o botão abre o Scanner
  Universal;
- o Cockpit ganhou ação `INÍCIO`, que encerra a câmera antes de navegar;
- carga, fotos, assinatura, Outbox, Deep Link e integração iMile permanecem
  com os mesmos contratos da V0.5.2.

O roteiro de homologação está em `docs/V0.5.3_ESBOCO_LOBBY.md`.

## V0.5.2 — matriz de capacidades e resiliência da ponte

- a confirmação final mostra exatamente quais campos foram transferidos para a
  transportadora e quais continuam manuais;
- para Rider Delivery/iMile 2.3.21, apenas o tracking possui transferência
  automática validada; recebedor, fotos, assinatura e baixa não são prometidos;
- exceções inesperadas na ponte Android agora viram fallback/manual com
  telemetria sanitizada, em vez de interromper a tela do entregador;
- o contrato de capacidades prepara adaptadores independentes para Anjun, J&T
  e futuras transportadoras, sem reaproveitar permissões por suposição.

O roteiro e os limites estão em `docs/V0.5.2_MATRIZ_CAPACIDADES_POD.md`.

## V0.5.1 — Operação híbrida de campo

- painel simplificado do entregador com versão, conectividade e scanner na zona inferior;
- saldo de rota calculado exclusivamente pela carga atribuída, sem inventar pendências;
- operações universais do dia e última leitura com copiar código/abrir aplicativo;
- leitura fora da carga ativa registrada como `EXTRA_ROTA`, sem bloquear o entregador;
- Rider Delivery/iMile 2.3.21 (`versionCode 461`) homologada para o contrato `requestCode`.

Para gerar e publicar o piloto desta versão no Windows, execute nesta ordem:

```text
BAT\FIREBASE\14_PREPARAR_PILOTO_V051.bat
BAT\FIREBASE\03_SUBIR_ATUALIZACAO.bat
```

O roteiro de teste completo está em `docs/V0.5.1_ROTEIRO_HOMOLOGACAO.md`.

## V0.5.0 — Fundação do POD Universal

O entregador pode registrar o POD antes de seguir para o aplicativo da
transportadora, inclusive quando o tracking veio do scanner livre e não de uma
planilha. A operação fica salva localmente e entra na Outbox antes da abertura
automática do adaptador homologado.

- leitura livre materializada em operação diária própria, sem contaminar cargas importadas;
- fotos, tipo de recebedor, nome/documento e assinatura armazenados offline;
- assinatura opcional nesta etapa, enquanto as exigências de cada transportadora são mapeadas;
- abertura automática da iMile somente depois da confirmação local do POD;
- alternativa explícita para abrir a transportadora sem registrar POD;
- fallback iMile e separação de estados físico, Hub e transportadora preservados.

O roteiro está em `docs/V0.5.0_POD_UNIVERSAL.md`.

## V0.4.9 — Scanner Universal

O scanner passa a ser a entrada principal da operacao. Uma carga importada
adiciona contexto, mas sua ausencia nao impede o reconhecimento e o
encaminhamento para o aplicativo da transportadora.

- funciona com ou sem carga ativa;
- reconhece iMile, Anjun e J&T pelas regras compiladas de tracking;
- abre automaticamente apenas adaptadores homologados;
- informa com clareza quando a transportadora foi reconhecida, mas sua
  integracao ainda esta pendente;
- mantém o registro completo do Delivery Hub disponível para pacotes que
  pertencem a uma carga;
- registra localmente uma unica operacao por tracking/dia e incrementa as
  tentativas em releituras;
- preserva a importacao, a gestao de cargas e todo o fluxo V0.4.8.3.

O roteiro está em `docs/V0.4.9_SCANNER_UNIVERSAL.md`.

Para diagnosticar uma encomenda real sem automatizar a baixa, use
`BAT\ANDROID\08_DIAGNOSTICAR_FLUXO_REAL_IMILE.bat`. Para registrar uma
exploração visual contínua da iMile por até três minutos, use
`BAT\ANDROID\09_GRAVAR_SESSAO_EXPLORATORIA_IMILE.bat`. O procedimento e os
limites de privacidade estão em `docs/V0.4.9_DIAGNOSTICO_IMILE_REAL.md`.

## V0.4.8.3 — controle operacional de cargas

Esta revisão organiza a gestão por referências imutáveis de carga e lote,
sem alterar scanner, Outbox, Firebase REST ou integração iMile.

- cada carga recebe uma referência `CARGA-AAAAMMDD-XXXXXX`;
- cada importação recebe uma referência `LOTE-AAAAMMDD-XXXXXX`;
- a confirmação mostra somente a distribuição do lote recém-importado;
- novas importações do mesmo entregador e dia continuam consolidadas em uma
  única carga operacional, preservando a origem de cada lote;
- a Gestão de cargas abre mostrando apenas cargas ativas e permite consultar
  arquivadas ou todas;
- cargas de teste sem operação iniciada podem ser removidas com segurança;
- registros antigos ganham referência visual sem migração destrutiva;
- textos genéricos da confirmação foram retirados.

O roteiro de validação está em `docs/V0.4.8.3_GESTAO_PROFISSIONAL_CARGAS.md`.

## V0.4.8.2 — reparo de cargas e atendimento rápido do Admin

Esta revisão corrige a distribuição quando uma atualização anterior deixou
duas cargas ativas para a mesma pessoa e data. A consolidação automática só
ocorre quando no máximo uma das cargas possui operação iniciada; situações
ambíguas continuam bloqueadas para preservar o histórico.

- colunas `Nº`, `Ordem`, `Seq.` e sequências numéricas na primeira coluna são
  ignoradas automaticamente;
- qualquer coluna auxiliar restante pode ser ignorada pelo Admin durante a
  conciliação, com registro da quantidade descartada;
- a Gestão de cargas permite digitar um tracking ou ler uma foto da etiqueta,
  localiza a pessoa/carga e abre diretamente o pacote para correção ou
  transferência;
- contas existentes recebem redefinição segura por e-mail do Firebase; o Admin
  nunca visualiza a senha atual;
- o preparador Android reutiliza um SDK completo de outra versão e usa o novo
  `android sdk install`, evitando a dependência JAXB do `sdkmanager` antigo;
- scanner do entregador, Outbox, Firebase REST e adaptador iMile não tiveram
  seus contratos alterados.

O roteiro de validação está em `docs/V0.4.8.2_ADMIN_REPARO_SCANNER.md`.

## V0.4.8.1 — rastreabilidade da importação

Esta revisão mantém scanner, Outbox, Firebase e integração iMile da V0.4.8 e
melhora a preparação operacional das cargas:

- cada tracking importado preserva aba, linha, coluna, célula e cabeçalho;
- duplicidades na mesma planilha aparecem antes da distribuição, com as
  pessoas e posições exatas envolvidas;
- conflito com carga já publicada informa a posição da nova planilha e o
  entregador que já possui o tracking;
- a coluna inicial `Nº` é ignorada com segurança pelo importador;
- `dados-teste/MODELO_CARGAS_DELIVERY_HUB.xlsx` traz 300 linhas, dez espaços de
  entregadores, códigos em formato texto e destaque automático de duplicados;
- o instalador Android baixa o Platform Tools diretamente quando o
  `sdkmanager` termina sem criar `adb.exe`.

## V0.4.8 — contratos por versão, fallback e suporte

A V0.4.7.2 permanece como a base homologada do sincronismo. A V0.4.8 não
altera a Outbox operacional: adiciona uma camada independente para proteger a
integração com aplicativos de transportadora contra atualizações inesperadas.

Para preparar e gerar o novo piloto no Windows:

```text
BAT\FIREBASE\10_PREPARAR_PILOTO_V048.bat
```

Principais proteções:

- contrato iMile por `versionCode` e protocolo compilado permitido;
- versão 2.3.18 / code 458 habilitada para o Deep Link já homologado;
- versão desconhecida usa código copiado + abertura do app, sem arriscar URI;
- kill switch remoto controlado exclusivamente pelo perfil `SUPORTE`;
- telemetria silenciosa, sanitizada e sem tracking/POD/token;
- fila local própria para logs, separada da Outbox de entregas;
- painel de suporte consulta um único dia e no máximo 200 eventos;
- nenhuma abertura da iMile significa “baixa confirmada”.

Crie o usuário separado de suporte com:

```text
BAT\FIREBASE\11_CRIAR_USUARIO_SUPORTE.bat
```

Use um e-mail diferente do ADMIN. O administrador da empresa continua cuidando
de cargas e entregadores; o suporte cuida de compatibilidade e incidentes.

O roteiro completo está em `docs/V0.4.8_CONTRATOS_FALLBACK_SUPORTE.md`.

## V0.4.7 — piloto Firebase híbrido para o plano Spark

O relatório técnico da revisão atual está em
`docs/AUDITORIA_PONTA_A_PONTA_V0.4.7.2.md`.

A Outbox e as leituras operacionais do entregador usam chamadas REST curtas,
autenticadas pelo ID token Firebase e sem manter conexao com o Realtime
Database. O Admin preserva assinaturas em tempo real por `entregadorId`, sem
interromper scanner ou formularios. Assim, os aparelhos dos entregadores nao
consomem o limite de 100 conexoes simultaneas do plano Spark.

A configuracao `firebase.json` fica na raiz do projeto. Assim, as regras em
`firebase/database.rules.json` e o Hosting em `dist` permanecem dentro do mesmo
diretorio aceito pela Firebase CLI.

`public/firebase-config.json` e específico de cada projeto e não acompanha o
ZIP. Os BATs Firebase o regeneram antes de criar o Admin, publicar ou gerar o
APK piloto, evitando substituir a configuração real durante uma atualização.

Preparacao automatizada no Windows:

```text
BAT\FIREBASE\09_PREPARAR_PILOTO_V047.bat
```

Esse fluxo gera `APK\DeliveryHub-Piloto-Firebase-v0.4.7.2.apk`. O APK de
homologacao local continua separado e pode ser gerado pelo BAT 01.

## V0.4.6.1 — homologacao deterministica da Outbox

A versao de teste agora possui um controle interno `SIMULAR SEM REDE`. Ele nao
depende de `navigator.onLine` nem do modo aviao do Android. A operacao permanece
na fila com o mesmo UUID depois de fechar e reabrir o APK; ao tocar em
`REATIVAR REDE E SINCRONIZAR`, a fila deve chegar a zero sem duplicidade.

Roteiro assistido no Windows:

```text
BAT\ANDROID\07_VALIDAR_OUTBOX_OFFLINE.bat
```

O scanner continuo e a NativeBridge iMile homologados na V0.4.6 nao foram
alterados.

Versão de confiabilidade operacional offline. A V0.3.8 permanece como baseline
funcional homologada do scanner/recebedor e a V0.3.9 como reenquadramento da
interface. A V0.4.0 adiciona Outbox idempotente, estados físico × sistêmico e
painel de pendências sem iniciar ainda a baixa real nas transportadoras.




## V0.4.4 — correção do adb pull

O extrator Android agora usa um destino explícito para o `base.apk` e mantém
um log persistente desde o início:

```text
diagnosticos-apk\extracao-apk-log.txt
```

Execute:

```text
BAT\ANDROID\04_EXTRAIR_APK_INSTALADO.bat
```

## V0.4.3 — extração do APK instalado

Corrige a extração do APK real via ADB e passa a copiar todos os APKs/splits:

```text
BAT\ANDROID\04_EXTRAIR_APK_INSTALADO.bat
```

Para iMile, escolha a opção `2`. O BAT gera um ZIP dentro de
`diagnosticos-apk\` pronto para análise.

## V0.4.2 — diagnóstico iMile no aparelho real

Esta versão corrige somente a infraestrutura ADB dos testes Windows. O fluxo
funcional da V0.4.1 permanece intacto.

Para mapear a tela de scanner iMile sem executar baixa:

```text
BAT\ANDROID\05_MAPEAR_IMILE_SCANNER.bat
```

O resultado fica em `diagnosticos-apk\diagnostico-imile-scanner.txt`.

## V0.4.1 — SDK/ADB local no Windows

Correção de infraestrutura para homologação em aparelho Android real. O instalador local do Android SDK agora preserva corretamente o caminho do ZIP das Command Line Tools durante blocos `IF` do `cmd.exe`, valida o download antes da extração e confirma a instalação do `adb.exe`.

Os BATs em `BAT/ANDROID` também passam a procurar automaticamente o ADB em `.ferramentas/android-sdk/platform-tools`, sem depender do `PATH` global do Windows. A lógica funcional da Outbox V0.4.0 permanece intacta.

## Iniciar no Windows

Abra:

```text
BAT\01_SERVIDOR_LOCAL.bat
```

Esse é o BAT principal. Ele:

- verifica Node.js/npm;
- instala dependências quando necessário;
- gera o build `localserver`, único modo publicado que permite fallback local;
- inicia o servidor compartilhado;
- abre `http://localhost:5173`;
- mostra o endereço LAN para teste no celular.

## BATs

Todos os BATs de uso atual ficam somente em `BAT/`:

```text
BAT/
├── 01_SERVIDOR_LOCAL.bat
├── 02_PREPARAR_AMBIENTE.bat
├── 03_VALIDAR_PROJETO.bat
├── 04_CORRIGIR_ACESSO_CELULAR.bat
└── 05_RESETAR_DADOS_TESTE.bat
```

A partir da V0.2.9, os nomes são permanentes. Uma nova versão deve substituir estes mesmos arquivos, e não criar `TESTAR_Vxxx.bat` ou `VALIDAR_Vxxx.bat`.

## Fluxo atual aprovado

O sistema atualmente possui:

- importação XLSX por entregador;
- perfis e contas vinculados ao `entregadorId`;
- carga compartilhada no servidor local de desenvolvimento;
- gestão manual de cargas no Admin;
- transferência individual, total ou parcial;
- agrupamento/região preparado para uso operacional;
- scanner por foto com barcode/QR e digitação como fallback;
- evidências de entrega separadas da foto usada no scanner;
- acesso PC/celular pela rede local;
- armazenamento local/offline em desenvolvimento.

## Pastas principais

```text
src/              código da aplicação
 tests/           testes automatizados
 scripts/node/    servidor e ferramentas Node
 BAT/              comandos Windows de uso diário
 docs/             documentação atual
 docs/historico/   documentação de versões antigas
 dados-teste/      arquivos auxiliares para testes
```

## Ajustes visuais

As cores principais continuam centralizadas em:

```text
src/interface/estilos/tema.css
```

## Observação

A V0.2.9 é uma limpeza estrutural. A base funcional é a mesma V0.2.8 já validada, com os BATs reorganizados e referências atualizadas.


## V0.3.0 — Infraestrutura Firebase

A aplicação agora possui dois ambientes:

- **LOCAL/DEV**: servidor compartilhado em `BAT/01_SERVIDOR_LOCAL.bat`;
- **FIREBASE**: Authentication + Realtime Database + Hosting.

Para criar o projeto Firebase pela primeira vez:

```text
BAT/FIREBASE/01_CRIAR_E_CONFIGURAR.bat
```

Depois, para publicar novas versões:

```text
BAT/FIREBASE/03_SUBIR_ATUALIZACAO.bat
```

A configuração Firebase específica da conta/projeto é gerada localmente e não fica embutida nos BATs.

## V0.3.1 — GitHub

O projeto agora possui versionamento Git/GitHub organizado.

Primeiro uso:

```text
BAT\GITHUB\01_CONFIGURAR_REPOSITORIO.bat
```

Salvar trabalho intermediário:

```text
BAT\GITHUB\02_SALVAR_TRABALHO.bat
```

Publicar uma versão aprovada:

```text
BAT\GITHUB\03_PUBLICAR_VERSAO.bat
```

Tags seguem o formato `vX.Y.Z`.

## V0.3.2 — Integrações Android

O projeto agora contém um registry real baseado nos APKs analisados:

```text
Anjun
com.anjun.supplierManagement

iMile
com.imile.redelivery

J&T
UNKNOWN
```

O Admin possui a tela **INTEGRAÇÕES ANDROID** para acompanhar o nível de evidência.

Testes seguros via ADB:

```text
BAT\ANDROID\02_DIAGNOSTICAR_APPS.bat
BAT\ANDROID\03_TESTAR_ABERTURA_APPS.bat
```

Nenhuma Activity interna é automatizada enquanto não chegar a
`PRODUCTION_VALIDATED`.

## V0.3.3 — APK de homologação

Para gerar o APK que pode ser enviado ao sócio:

```text
BAT\APK\01_GERAR_APK_HOMOLOGACAO.bat
```

Saída:

```text
APK\DeliveryHub-Homologacao-v0.3.3.apk
```

O APK possui carga demonstrativa e **SCAN REAL / SOMENTE LEITURA**. Uma etiqueta
real pode ser fotografada para extrair tracking e identificar a transportadora,
mas nenhuma baixa é enviada.

## V0.3.5 — correção GitHub CLI

Se a GitHub CLI mostrar a conta como `Logged in` e `Active account: true`, o
Delivery Hub passa a considerar a autenticação válida. A captura de usuário,
repositório e workflow foi ajustada para o comportamento do `cmd.exe` no Windows.

## V0.3.6 — pacote completo de homologação

Esta versão consolida os ajustes de GitHub/Windows e deve ser usada em uma pasta
nova para evitar mistura com BATs antigos.

Fluxo atual:

```text
BAT\GITHUB\00_LOGIN_GITHUB.bat
BAT\GITHUB\07_GERAR_APK_HOMOLOGACAO.bat
```

Workflow:

```text
.github\workflows\apk-homologacao.yml
```

A refatoração de interface foi registrada para ocorrer imediatamente após a
homologação do APK, antes de novas expansões funcionais.

## V0.3.7 — scanner contínuo

O fluxo principal de leitura de etiquetas agora usa câmera ao vivo. O tracking é
confirmado somente após duas leituras próximas do mesmo código. Foto e digitação
continuam disponíveis como fallback.

Para atualizar e gerar o APK de homologação:

```text
BAT\GITHUB\07_GERAR_APK_HOMOLOGACAO.bat
```

## V0.3.8 — leitura imediata e dados opcionais do recebedor

O scanner nao obriga mais o entregador a esperar a segunda leitura. Assim que o
primeiro tracking e reconhecido, o aplicativo mostra o codigo e a transportadora
e libera `CONFIRMAR E CONTINUAR`. Se a camera reencontrar o mesmo codigo em uma
janela curta, a confirmacao ocorre automaticamente.

No recebedor, nome e CPF/documento ficam disponiveis para registro, mas sao
opcionais. Deixar CPF/documento vazio nao bloqueia a conclusao da entrega.

Para esta e as proximas versoes, use sempre o ZIP completo em uma pasta nova. O
`BAT\GITHUB\07_GERAR_APK_HOMOLOGACAO.bat` adota o historico atual do GitHub
antes de criar o commit da nova versao, evitando reconstruir o historico remoto.

## V0.3.9 — reenquadramento antes da próxima expansão

A V0.3.8 foi homologada no Android. A V0.3.9 reorganiza a camada de interface sem alterar o comportamento aprovado do scanner e do recebedor.

Principais limites arquiteturais a partir desta versão:

- estado visual não é sincronizado;
- fluxos com ciclo de vida próprio devem usar controladores;
- listas devem preferir delegação de eventos;
- alterações localizadas devem evitar reconstrução integral da tela;
- `app.ts` permanece como orquestrador, não como depósito de regras de tela.

Detalhes: `docs/V0.3.9_REENQUADRAMENTO_INTERFACE.md`.



## V0.4.0 — Operação offline robusta

A conclusão física agora é persistida por Outbox local idempotente antes de qualquer tentativa remota.

```text
ENTREGA FISICA
✓ ENTREGUE

ESTADO SISTEMICO
↻ AGUARDANDO SINCRONIZACAO
```

Quando o servidor Delivery Hub recebe a operação:

```text
NO HUB / AGUARDANDO INTEGRACAO
```

Isso **não** é apresentado como confirmação da transportadora. `CONFIRMADA` fica reservado para a futura integração validada com J&T/Anjun/iMile.

O UUID da Outbox é mantido em novas tentativas para evitar duplicidade quando a resposta de rede é perdida. Cada UUID ocupa um nó remoto próprio, impedindo também que um reenvio antigo sobrescreva uma operação mais nova do mesmo pacote.

Erros permanentes ficam bloqueados para revisão, em vez de serem reenviados indefinidamente, e a sincronização automática é limitada ao entregador autenticado no aparelho.

Consulte `docs/V0.4.0_OUTBOX_OFFLINE_IDEMPOTENTE.md`.

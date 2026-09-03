# Delivery Hub — V0.2.9

Versão de manutenção e organização baseada na V0.2.8 aprovada.
Não altera o fluxo funcional do entregador; remove arquivos BAT acumulados de releases antigas.

## Iniciar no Windows

Abra:

```text
BAT\01_SERVIDOR_LOCAL.bat
```

Esse é o BAT principal. Ele:

- verifica Node.js/npm;
- instala dependências quando necessário;
- gera o build;
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


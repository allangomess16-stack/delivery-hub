@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

cls
echo ============================================================
echo  DELIVERY HUB - CRIAR E CONFIGURAR FIREBASE
echo ============================================================
echo.
echo Este assistente ira:
echo  - instalar/verificar Firebase CLI;
echo  - autenticar sua conta Google;
echo  - criar o projeto Firebase;
echo  - criar Realtime Database;
echo  - criar o App Web;
echo  - ativar Email/Senha no Authentication;
echo  - publicar regras de seguranca;
echo  - gerar a configuracao do Delivery Hub;
echo  - gerar build e publicar no Firebase Hosting.
echo.
echo Nenhuma senha ou token sera gravado neste BAT.
echo.

call "%RAIZ%\BAT\02_PREPARAR_AMBIENTE.bat"
if errorlevel 1 ( pause & exit /b 1 )

if not exist "%FIREBASE_CMD%" (
  echo [ERRO] Firebase CLI local nao foi instalada.
  echo Execute BAT\02_PREPARAR_AMBIENTE.bat.
  pause
  exit /b 1
)

echo.
echo [1/9] Login Firebase...
call "%FIREBASE_CMD%" login
if errorlevel 1 (
  echo [ERRO] Nao foi possivel autenticar no Firebase.
  pause
  exit /b 1
)

set "PROJECT_ID="
set "DB_INSTANCE="
set "DB_URL="
set "WEB_APP_ID="

if exist "%PROJETO_ENV%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%PROJETO_ENV%") do (
    if /I "%%A"=="PROJECT_ID" set "PROJECT_ID=%%B"
    if /I "%%A"=="DATABASE_INSTANCE" set "DB_INSTANCE=%%B"
    if /I "%%A"=="DATABASE_URL" set "DB_URL=%%B"
    if /I "%%A"=="WEB_APP_ID" set "WEB_APP_ID=%%B"
  )
)

if defined PROJECT_ID (
  echo.
  echo Configuracao existente encontrada:
  echo   Projeto: !PROJECT_ID!
  choice /C SN /N /M "Reutilizar este projeto? [S/N]: "
  if errorlevel 2 (
    set "PROJECT_ID="
    set "DB_INSTANCE="
    set "DB_URL="
    set "WEB_APP_ID="
  )
)

if not defined PROJECT_ID (
  echo.
  echo [2/9] Criacao do projeto.
  set "DISPLAY_NAME=Delivery Hub"
  set /p "DISPLAY_NAME=Nome visivel [Delivery Hub]: "
  if not defined DISPLAY_NAME set "DISPLAY_NAME=Delivery Hub"

  set "SUGESTAO=delivery-hub-df-%RANDOM%%RANDOM%"
  set "SUGESTAO=!SUGESTAO:~0,30!"

  :PERGUNTAR_ID
  echo.
  echo O Project ID e permanente, deve ser minusculo e globalmente unico.
  set /p "PROJECT_ID=Project ID [!SUGESTAO!]: "
  if not defined PROJECT_ID set "PROJECT_ID=!SUGESTAO!"

  for /f %%V in ('powershell.exe -NoProfile -Command "$v='!PROJECT_ID!'; if($v -match '^[a-z][a-z0-9-]{4,28}[a-z0-9]$'){ 'OK' } else { 'ERRO' }"') do set "ID_VALIDO=%%V"
  if /I not "!ID_VALIDO!"=="OK" (
    echo [ERRO] ID invalido. Use 6-30 caracteres: letras minusculas, numeros e hifen.
    set "PROJECT_ID="
    goto :PERGUNTAR_ID
  )

  echo.
  echo Criando projeto !PROJECT_ID!...
  call "%FIREBASE_CMD%" projects:create "!PROJECT_ID!" --display-name "!DISPLAY_NAME!"
  if errorlevel 1 (
    echo.
    echo [ERRO] O projeto nao foi criado.
    echo O ID pode ja estar em uso, haver limite de projetos ou restricao na conta.
    set "PROJECT_ID="
    choice /C SN /N /M "Tentar outro Project ID? [S/N]: "
    if errorlevel 2 ( pause & exit /b 1 )
    goto :PERGUNTAR_ID
  )
)

echo.
echo [3/9] Realtime Database.

set "TMP_DB=%TEMP%\delivery-hub-db-!RANDOM!.json"
call "%FIREBASE_CMD%" database:instances:list --project "!PROJECT_ID!" --json > "!TMP_DB!" 2>nul

set "DB_INSTANCE="
set "DB_URL="
for /f "usebackq tokens=1,* delims==" %%A in (`node "%RAIZ%\scripts\node\firebase-encontrar-database.mjs" "!TMP_DB!" 2^>nul`) do (
  if /I "%%A"=="DATABASE_INSTANCE" set "DB_INSTANCE=%%B"
  if /I "%%A"=="DATABASE_URL" set "DB_URL=%%B"
)
del /q "!TMP_DB!" >nul 2>nul

if not defined DB_INSTANCE (
  echo.
  echo Nenhuma instancia Realtime Database foi encontrada.
  echo A CLI oficial abrira agora o fluxo de criacao do primeiro banco.
  echo.
  echo Para este projeto no Brasil, use preferencialmente:
  echo   us-central1 ^(Iowa^)
  echo.
  echo O Firebase Realtime Database atualmente oferece:
  echo   us-central1, europe-west1 e asia-southeast1.
  echo.
  echo IMPORTANTE: a localizacao nao pode ser alterada depois.
  echo.

  set "BOOTSTRAP=%TEMP%\delivery-hub-firebase-bootstrap-!RANDOM!"
  mkdir "!BOOTSTRAP!" >nul 2>nul
  pushd "!BOOTSTRAP!"
  call "%FIREBASE_CMD%" init database --project "!PROJECT_ID!"
  set "RET=!ERRORLEVEL!"
  popd
  rmdir /s /q "!BOOTSTRAP!" >nul 2>nul

  if not "!RET!"=="0" (
    echo [ERRO] Realtime Database nao foi criado.
    pause
    exit /b 1
  )

  set "TMP_DB=%TEMP%\delivery-hub-db-!RANDOM!.json"
  call "%FIREBASE_CMD%" database:instances:list --project "!PROJECT_ID!" --json > "!TMP_DB!"
  for /f "usebackq tokens=1,* delims==" %%A in (`node "%RAIZ%\scripts\node\firebase-encontrar-database.mjs" "!TMP_DB!"`) do (
    if /I "%%A"=="DATABASE_INSTANCE" set "DB_INSTANCE=%%B"
    if /I "%%A"=="DATABASE_URL" set "DB_URL=%%B"
  )
  del /q "!TMP_DB!" >nul 2>nul
)

if not defined DB_INSTANCE (
  echo [ERRO] O banco foi criado, mas a CLI nao retornou o nome da instancia.
  pause
  exit /b 1
)

if not defined DB_URL (
  if /I "!DB_INSTANCE:~-13!"=="-default-rtdb" (
    set "DB_URL=https://!DB_INSTANCE!.firebaseio.com"
  )
)

if not defined DB_URL (
  echo [ERRO] Nao foi possivel determinar a URL do Realtime Database.
  echo Execute 04_VALIDAR_CONFIGURACAO.bat e informe a saida.
  pause
  exit /b 1
)

echo [OK] Database: !DB_INSTANCE!
echo [OK] URL:      !DB_URL!

echo.
echo [4/9] App Web Firebase.
if not defined WEB_APP_ID (
  set "TMP_APPS=%TEMP%\delivery-hub-apps-!RANDOM!.json"
  call "%FIREBASE_CMD%" apps:list WEB --project "!PROJECT_ID!" --json > "!TMP_APPS!" 2>nul
  for /f "usebackq delims=" %%I in (`node "%RAIZ%\scripts\node\firebase-encontrar-app-id.mjs" "!TMP_APPS!" 2^>nul`) do set "WEB_APP_ID=%%I"
  del /q "!TMP_APPS!" >nul 2>nul
)

if not defined WEB_APP_ID (
  set "TMP_APP=%TEMP%\delivery-hub-app-!RANDOM!.json"
  call "%FIREBASE_CMD%" apps:create WEB "Delivery Hub Web" --project "!PROJECT_ID!" --json > "!TMP_APP!"
  if errorlevel 1 (
    del /q "!TMP_APP!" >nul 2>nul
    echo [ERRO] App Web nao foi criado.
    pause
    exit /b 1
  )

  for /f "usebackq delims=" %%I in (`node "%RAIZ%\scripts\node\firebase-encontrar-app-id.mjs" "!TMP_APP!"`) do set "WEB_APP_ID=%%I"
  del /q "!TMP_APP!" >nul 2>nul
)

if not defined WEB_APP_ID (
  echo [ERRO] Nao foi possivel identificar o App ID Web.
  pause
  exit /b 1
)

echo App Web: !WEB_APP_ID!

echo.
echo [5/9] SDK Web.
set "SDK_RAW=%FIREBASE_DIR%\web-sdk-config.raw.json"
call "%FIREBASE_CMD%" apps:sdkconfig WEB "!WEB_APP_ID!" --project "!PROJECT_ID!" --json > "!SDK_RAW!"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel obter a configuracao SDK.
  pause
  exit /b 1
)

node "%RAIZ%\scripts\node\firebase-gerar-runtime-config.mjs" ^
  "!SDK_RAW!" ^
  "%RAIZ%\public\firebase-config.json" ^
  "!PROJECT_ID!" ^
  "!DB_INSTANCE!" ^
  "!DB_URL!"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel gerar public\firebase-config.json.
  pause
  exit /b 1
)

(
  echo PROJECT_ID=!PROJECT_ID!
  echo DATABASE_INSTANCE=!DB_INSTANCE!
  echo DATABASE_URL=!DB_URL!
  echo WEB_APP_ID=!WEB_APP_ID!
) > "%PROJETO_ENV%"

echo.
echo [6/9] Authentication + regras Realtime...
if not exist "%FIREBASE_DIR%\database.rules.json" (
  echo [ERRO] Arquivo de regras nao encontrado: firebase\database.rules.json
  echo Extraia novamente o projeto completo antes de continuar.
  pause
  exit /b 1
)
call "%FIREBASE_CMD%" deploy --only auth,database --config "%CONFIG_FIREBASE%" --project "!PROJECT_ID!"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel publicar Authentication/Regras.
  pause
  exit /b 1
)

echo.
echo [7/9] Build do Delivery Hub...
pushd "%RAIZ%"
call npm run build
set "RET_BUILD=!ERRORLEVEL!"
popd
if not "!RET_BUILD!"=="0" (
  echo [ERRO] Build falhou. O Firebase nao sera publicado.
  pause
  exit /b 1
)

echo.
echo [8/9] Firebase Hosting...
call "%FIREBASE_CMD%" deploy --only hosting --config "%CONFIG_FIREBASE%" --project "!PROJECT_ID!"
if errorlevel 1 (
  echo [ERRO] Hosting nao foi publicado.
  pause
  exit /b 1
)

echo.
echo [9/9] Configuracao concluida.
echo.
echo Projeto:       !PROJECT_ID!
echo Database:      !DB_INSTANCE!
echo Database URL:  !DB_URL!
echo Web App ID:    !WEB_APP_ID!
echo.
echo Agora crie o primeiro administrador:
echo BAT\FIREBASE\02_CRIAR_ADMIN_INICIAL.bat
echo.
choice /C SN /N /M "Criar o administrador inicial agora? [S/N]: "
if errorlevel 2 goto :FIM
call "%RAIZ%\BAT\FIREBASE\02_CRIAR_ADMIN_INICIAL.bat"

:FIM
echo.
echo [OK] Firebase preparado.
pause

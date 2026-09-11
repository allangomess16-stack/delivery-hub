@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_APK.bat"

set "MODO_APK=HOMOLOGACAO_LOCAL"
set "HOMOLOGACAO_HABILITADA=true"
set "NOME_APK=DeliveryHub-Homologacao"
if /I "%~1"=="/firebase" (
  set "MODO_APK=PILOTO_FIREBASE"
  set "HOMOLOGACAO_HABILITADA=false"
  set "NOME_APK=DeliveryHub-Piloto-Firebase"
)

cls
echo ============================================================
echo  DELIVERY HUB - GERAR APK DE HOMOLOGACAO
echo ============================================================
echo.
echo Modo: %MODO_APK%
echo.
if "%MODO_APK%"=="PILOTO_FIREBASE" (
  echo Este APK usa login e o Firebase configurado para o piloto atual.
  echo Ele NAO confirma baixa automaticamente nas transportadoras.
) else (
  echo Este APK e SOMENTE PARA TESTE:
  echo  - possui carga demonstrativa;
  echo  - permite scan real de etiqueta;
  echo  - nao envia baixa para transportadoras;
  echo  - nao exige login do entregador.
)
echo.

call "%RAIZ%\BAT\02_PREPARAR_AMBIENTE.bat" /interno
if errorlevel 1 (
  echo [ERRO] Dependencias web nao foram preparadas.
  pause
  exit /b 1
)

if exist "%FERRAMENTAS%\android-local.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%FERRAMENTAS%\android-local.env") do (
    if /I "%%A"=="ANDROID_HOME" set "ANDROID_HOME=%%B"
    if /I "%%A"=="JAVA_HOME" set "JAVA_HOME=%%B"
  )
)

if not defined ANDROID_HOME if exist "%SDK_LOCAL%\platforms\android-35\android.jar" (
  set "ANDROID_HOME=%SDK_LOCAL%"
)

if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk\platforms" (
  set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)

if not defined JAVA_HOME (
  for /d %%J in ("%ProgramFiles%\Microsoft\jdk-21*") do (
    if exist "%%~fJ\bin\java.exe" set "JAVA_HOME=%%~fJ"
  )
)

if not defined JAVA_HOME if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
)

if not defined ANDROID_HOME (
  echo [INFO] SDK Android nao encontrado.
  echo Executando preparacao automatica...
  call "%RAIZ%\BAT\APK\00_PREPARAR_SDK_ANDROID.bat"
  if errorlevel 1 (
    echo [ERRO] A preparacao do SDK Android nao foi concluida.
    pause
    exit /b 1
  )

  if exist "%FERRAMENTAS%\android-local.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%FERRAMENTAS%\android-local.env") do (
      if /I "%%A"=="ANDROID_HOME" set "ANDROID_HOME=%%B"
      if /I "%%A"=="JAVA_HOME" set "JAVA_HOME=%%B"
    )
  )
)

if not defined JAVA_HOME (
  echo [ERRO] JDK nao localizado.
  echo Execute BAT\APK\00_PREPARAR_SDK_ANDROID.bat.
  pause
  exit /b 1
)

set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

pushd "%RAIZ%"

if "%MODO_APK%"=="PILOTO_FIREBASE" (
  if not exist "%RAIZ%\public\firebase-config.json" (
    echo [ERRO] Configuracao Firebase ausente.
    echo Execute BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat.
    goto :FALHOU_SEM_BACKUP
  )
  node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.exit(c.habilitado===true?0:1)" "%RAIZ%\public\firebase-config.json"
  if errorlevel 1 (
    echo [ERRO] Firebase nao esta habilitado para o APK piloto.
    echo Execute BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat.
    goto :FALHOU_SEM_BACKUP
  )
)

set "BACKUP_CONFIG=%TEMP%\delivery-hub-homologacao-config-%RANDOM%.json"
copy /Y "%CONFIG_HOMOLOGACAO%" "!BACKUP_CONFIG!" >nul

(
  echo {
  echo   "habilitado": !HOMOLOGACAO_HABILITADA!
  echo }
) > "%CONFIG_HOMOLOGACAO%"

echo.
echo [1/6] Validando projeto...
call npm run validate
if errorlevel 1 goto :FALHOU

echo.
echo [2/6] Executando testes...
call npm run test
if errorlevel 1 goto :FALHOU

echo.
echo [3/6] Build web em modo !MODO_APK!...
call npm run build
if errorlevel 1 goto :FALHOU

echo.
echo [4/6] Preparando Capacitor Android...
if not exist "%RAIZ%\android\app\src\main\AndroidManifest.xml" (
  call npx cap add android
  if errorlevel 1 goto :FALHOU
)

call npx cap sync android
if errorlevel 1 goto :FALHOU

node "%RAIZ%\scripts\node\aplicar-queries-android.mjs"
if errorlevel 1 goto :FALHOU

node "%RAIZ%\scripts\node\aplicar-native-bridge-android.mjs"
if errorlevel 1 goto :FALHOU
rem NativeBridge deve existir antes do Gradle para o APK conter a ponte iMile de homologacao.

node "%RAIZ%\scripts\node\aplicar-identidade-apk-homologacao.mjs"
if errorlevel 1 goto :FALHOU
rem ID distinto: o piloto/homologacao instala ao lado do app operacional.

node "%RAIZ%\scripts\node\validar-android-manifest.mjs"
if errorlevel 1 goto :FALHOU
rem Impede que qualquer transformacao prossiga com XML Android malformado.

echo sdk.dir=%ANDROID_HOME:\=/%> "%RAIZ%\android\local.properties"

echo.
echo [5/6] Compilando APK debug instalavel...
pushd "%RAIZ%\android"
call gradlew.bat --no-daemon assembleDebug
set "RET_GRADLE=!ERRORLEVEL!"
popd
if not "!RET_GRADLE!"=="0" goto :FALHOU

echo.
echo [6/6] Copiando APK...
set "APK_ORIGEM=%RAIZ%\android\app\build\outputs\apk\debug\app-debug.apk"
set "VERSAO="
if exist "%RAIZ%\VERSION" set /p "VERSAO="<"%RAIZ%\VERSION"
if not defined VERSAO set "VERSAO=atual"
set "APK_DESTINO=%SAIDA_APK%\!NOME_APK!-v!VERSAO!.apk"

if not exist "!APK_ORIGEM!" (
  echo [ERRO] Gradle terminou, mas o APK nao foi encontrado.
  goto :FALHOU
)

copy /Y "!APK_ORIGEM!" "!APK_DESTINO!" >nul
if errorlevel 1 goto :FALHOU

if "%MODO_APK%"=="PILOTO_FIREBASE" (
  call npm run atualizacao:preparar
  if errorlevel 1 goto :FALHOU
)

copy /Y "!BACKUP_CONFIG!" "%CONFIG_HOMOLOGACAO%" >nul
del /q "!BACKUP_CONFIG!" >nul 2>nul

popd

echo.
echo ============================================================
echo [OK] APK GERADO
echo ============================================================
echo.
echo Arquivo para enviar ao socio:
echo %APK_DESTINO%
echo.
echo O Android podera avisar que o APK nao veio da Play Store.
echo Isso e esperado para esta homologacao interna.
echo.
pause
exit /b 0

:FALHOU_SEM_BACKUP
popd
pause
exit /b 1

:FALHOU
echo.
echo [ERRO] Nao foi possivel gerar o APK.
copy /Y "!BACKUP_CONFIG!" "%CONFIG_HOMOLOGACAO%" >nul 2>nul
del /q "!BACKUP_CONFIG!" >nul 2>nul
popd
pause
exit /b 1

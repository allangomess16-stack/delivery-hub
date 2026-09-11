@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_APK.bat"

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR SDK ANDROID LOCAL
echo ============================================================
echo.
echo O SDK sera instalado dentro do proprio projeto:
echo %SDK_LOCAL%
echo.
echo Nao e necessario instalar Android Studio.
echo.

rem ============================================================
rem REUTILIZAR SDK COMPLETO DE OUTRA VERSAO
rem ============================================================
set "SDK_REUTILIZADO="
set "SDK_ATUAL_COMPLETO=1"
if not exist "%SDK_LOCAL%\platform-tools\adb.exe" set "SDK_ATUAL_COMPLETO=0"
if not exist "%SDK_LOCAL%\platforms\android-35\android.jar" set "SDK_ATUAL_COMPLETO=0"
if not exist "%SDK_LOCAL%\build-tools\34.0.0\aapt2.exe" set "SDK_ATUAL_COMPLETO=0"
if "!SDK_ATUAL_COMPLETO!"=="0" (
  for /d %%D in ("%PAI_PROJETO%\delivery-hub-v*") do (
    if not defined SDK_REUTILIZADO if exist "%%~fD\.ferramentas\android-sdk\platform-tools\adb.exe" if exist "%%~fD\.ferramentas\android-sdk\platforms\android-35\android.jar" if exist "%%~fD\.ferramentas\android-sdk\build-tools\34.0.0\aapt2.exe" (
      set "SDK_REUTILIZADO=%%~fD\.ferramentas\android-sdk"
    )
  )
  for /d %%P in ("%PAI_GERAL%\DeliveryHub-V*") do (
    for /d %%D in ("%%~fP\delivery-hub-v*") do (
      if not defined SDK_REUTILIZADO if exist "%%~fD\.ferramentas\android-sdk\platform-tools\adb.exe" if exist "%%~fD\.ferramentas\android-sdk\platforms\android-35\android.jar" if exist "%%~fD\.ferramentas\android-sdk\build-tools\34.0.0\aapt2.exe" (
        set "SDK_REUTILIZADO=%%~fD\.ferramentas\android-sdk"
      )
    )
  )
)

if defined SDK_REUTILIZADO (
  set "SDK_LOCAL=!SDK_REUTILIZADO!"
  echo [OK] SDK Android completo reutilizado de outra versao:
  echo !SDK_LOCAL!
  echo.
)

rem ============================================================
rem JAVA / JDK 21
rem ============================================================
where java >nul 2>nul
if errorlevel 1 (
  echo [INFO] Java/JDK nao encontrado.
  where winget >nul 2>nul
  if errorlevel 1 (
    echo [ERRO] winget nao esta disponivel para instalar o JDK automaticamente.
    echo Instale JDK 21 e execute este BAT novamente.
    pause
    exit /b 1
  )

  echo Instalando Microsoft OpenJDK 21...
  winget install --id Microsoft.OpenJDK.21 -e --source winget ^
    --accept-package-agreements --accept-source-agreements

  if errorlevel 1 (
    echo [ERRO] JDK nao foi instalado.
    pause
    exit /b 1
  )
)

set "JAVA_EXE="
where java >nul 2>nul
if not errorlevel 1 for /f "delims=" %%J in ('where java') do if not defined JAVA_EXE set "JAVA_EXE=%%J"

if not defined JAVA_EXE (
  for /d %%J in ("%ProgramFiles%\Microsoft\jdk-21*") do (
    if exist "%%~fJ\bin\java.exe" (
      set "JAVA_HOME=%%~fJ"
      set "JAVA_EXE=%%~fJ\bin\java.exe"
    )
  )
)

if not defined JAVA_EXE (
  echo [ERRO] JDK 21 foi instalado, mas java.exe nao foi localizado.
  echo Feche esta janela e execute este BAT novamente.
  pause
  exit /b 1
)

if not defined JAVA_HOME (
  for %%J in ("!JAVA_EXE!") do set "JAVA_BIN=%%~dpJ"
  for %%J in ("!JAVA_BIN!..") do set "JAVA_HOME=%%~fJ"
)

set "PATH=!JAVA_HOME!\bin;!PATH!"

echo.
echo [OK] Java:
"!JAVA_EXE!" -version

rem ============================================================
rem COMMAND LINE TOOLS
rem ============================================================
set "ANDROID_CLI=%SDK_LOCAL%\cmdline-tools\latest\bin\android.bat"
if not exist "!ANDROID_CLI!" if exist "%SDK_LOCAL%\cmdline-tools\latest\bin\android.exe" set "ANDROID_CLI=%SDK_LOCAL%\cmdline-tools\latest\bin\android.exe"
set "ZIP=%FERRAMENTAS%\android-commandlinetools.zip"
set "TMP=%FERRAMENTAS%\android-cmdline-temp"

if not exist "!ANDROID_CLI!" (
  echo.
  echo [1/4] Baixando Android Command Line Tools...

  if exist "!ZIP!" del /q "!ZIP!" >nul 2>nul
  if exist "!TMP!" rmdir /s /q "!TMP!" >nul 2>nul
  mkdir "!TMP!" >nul 2>nul

  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile '!ZIP!'"

  if errorlevel 1 (
    echo [ERRO] Download das ferramentas Android falhou.
    pause
    exit /b 1
  )

  if not exist "!ZIP!" (
    echo [ERRO] O download terminou, mas o ZIP nao foi encontrado:
    echo !ZIP!
    pause
    exit /b 1
  )

  for %%Z in ("!ZIP!") do set "ZIP_TAMANHO=%%~zZ"
  if !ZIP_TAMANHO! LSS 1000000 (
    echo [ERRO] O arquivo baixado parece incompleto ^(!ZIP_TAMANHO! bytes^).
    del /q "!ZIP!" >nul 2>nul
    pause
    exit /b 1
  )

  echo.
  echo [2/4] Extraindo Android Command Line Tools...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath '!ZIP!' -DestinationPath '!TMP!' -Force"

  if errorlevel 1 (
    echo [ERRO] Nao foi possivel extrair Android Command Line Tools.
    echo ZIP: !ZIP!
    pause
    exit /b 1
  )

  if not exist "!TMP!\cmdline-tools\bin\android.bat" if not exist "!TMP!\cmdline-tools\bin\android.exe" (
    echo [ERRO] A estrutura extraida nao contem o Android CLI atual.
    pause
    exit /b 1
  )

  if exist "%SDK_LOCAL%\cmdline-tools\latest" rmdir /s /q "%SDK_LOCAL%\cmdline-tools\latest" >nul 2>nul
  mkdir "%SDK_LOCAL%\cmdline-tools\latest" >nul 2>nul
  xcopy "!TMP!\cmdline-tools\*" "%SDK_LOCAL%\cmdline-tools\latest\" /E /I /Y >nul

  if errorlevel 1 (
    echo [ERRO] Nao foi possivel copiar as Command Line Tools para o SDK local.
    pause
    exit /b 1
  )

  rmdir /s /q "!TMP!" >nul 2>nul
  del /q "!ZIP!" >nul 2>nul

  set "ANDROID_CLI=%SDK_LOCAL%\cmdline-tools\latest\bin\android.bat"
  if not exist "!ANDROID_CLI!" if exist "%SDK_LOCAL%\cmdline-tools\latest\bin\android.exe" set "ANDROID_CLI=%SDK_LOCAL%\cmdline-tools\latest\bin\android.exe"
) else (
  echo.
  echo [1/4] Android Command Line Tools ja instaladas.
)

if not exist "!ANDROID_CLI!" (
  echo [ERRO] Android CLI atual nao foi encontrado em:
  echo %SDK_LOCAL%\cmdline-tools\latest\bin
  pause
  exit /b 1
)

set "ANDROID_HOME=%SDK_LOCAL%"
set "ANDROID_SDK_ROOT=%SDK_LOCAL%"
set "PATH=!JAVA_HOME!\bin;%SDK_LOCAL%\platform-tools;!PATH!"

rem ============================================================
rem LICENCA ANDROID SDK
rem ============================================================
set "LICENCA_ANDROID=%SDK_LOCAL%\licenses\android-sdk-license"
set "LICENCA_ANDROID_OK=0"
if exist "!LICENCA_ANDROID!" (
  findstr /x /c:"24333f8a63b6825ea9c5514f83c2829b004d1fee" "!LICENCA_ANDROID!" >nul 2>nul
  if not errorlevel 1 set "LICENCA_ANDROID_OK=1"
)

if "!LICENCA_ANDROID_OK!"=="0" (
  echo.
  echo Para instalar e usar o Android SDK, e necessario aceitar a licenca do Google.
  echo Consulte: https://developer.android.com/studio/terms
  echo.
  choice /C SN /N /M "Voce aceita a licenca do Android SDK? [S/N]: "
  if errorlevel 2 (
    echo.
    echo [ERRO] Licenca nao aceita. A preparacao foi cancelada sem gerar o APK.
    pause
    exit /b 1
  )

  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%RAIZ%\scripts\powershell\android-registrar-licenca.ps1" -SdkRoot "%SDK_LOCAL%"
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel registrar a licenca Android no SDK local.
    pause
    exit /b 1
  )
)

rem ============================================================
rem ANDROID CLI + COMPONENTES
rem ============================================================
echo.
echo [4/4] Instalando Platform Tools e componentes Android...
set "INSTALACAO_COMPONENTES_OK=0"
if exist "%SDK_LOCAL%\platform-tools\adb.exe" if exist "%SDK_LOCAL%\platforms\android-35\android.jar" if exist "%SDK_LOCAL%\build-tools\34.0.0\aapt2.exe" (
  echo [OK] Componentes necessarios ja estao instalados.
  set "INSTALACAO_COMPONENTES_OK=1"
) else (
  echo [INFO] Usando Android CLI atual. O sdkmanager antigo nao sera executado.
  call "!ANDROID_CLI!" "--sdk=%SDK_LOCAL%" sdk install ^
    platform-tools ^
    platforms/android-35 ^
    build-tools/34.0.0
  if not errorlevel 1 set "INSTALACAO_COMPONENTES_OK=1"
)

set "ADB_EXE=%SDK_LOCAL%\platform-tools\adb.exe"
if not exist "!ADB_EXE!" (
  echo.
  echo [ATENCAO] O gerenciador terminou, mas adb.exe nao apareceu.
  echo Tentando reparo direto do Platform Tools...

  set "PLATFORM_ZIP=%FERRAMENTAS%\platform-tools-latest-windows.zip"
  set "PLATFORM_TMP=%FERRAMENTAS%\platform-tools-temp"
  if exist "!PLATFORM_ZIP!" del /q "!PLATFORM_ZIP!" >nul 2>nul
  if exist "!PLATFORM_TMP!" rmdir /s /q "!PLATFORM_TMP!" >nul 2>nul
  mkdir "!PLATFORM_TMP!" >nul 2>nul

  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile '!PLATFORM_ZIP!'; Expand-Archive -LiteralPath '!PLATFORM_ZIP!' -DestinationPath '!PLATFORM_TMP!' -Force"

  if errorlevel 1 (
    echo [ERRO] Nao foi possivel baixar/extrair o Platform Tools diretamente.
    echo Verifique a internet ou antivirus e execute este BAT novamente.
    pause
    exit /b 1
  )

  if not exist "!PLATFORM_TMP!\platform-tools\adb.exe" (
    echo [ERRO] O pacote baixado nao contem platform-tools\adb.exe.
    pause
    exit /b 1
  )

  if exist "%SDK_LOCAL%\platform-tools" rmdir /s /q "%SDK_LOCAL%\platform-tools" >nul 2>nul
  xcopy "!PLATFORM_TMP!\platform-tools\*" "%SDK_LOCAL%\platform-tools\" /E /I /Y >nul
  if errorlevel 1 (
    echo [ERRO] O Windows nao permitiu copiar o Platform Tools para o SDK local.
    pause
    exit /b 1
  )

  rmdir /s /q "!PLATFORM_TMP!" >nul 2>nul
  del /q "!PLATFORM_ZIP!" >nul 2>nul
)

set "ANDROID_JAR=%SDK_LOCAL%\platforms\android-35\android.jar"
set "AAPT2_EXE=%SDK_LOCAL%\build-tools\34.0.0\aapt2.exe"

set "PACOTES_COMPILACAO_OK=1"
if not exist "!ANDROID_JAR!" set "PACOTES_COMPILACAO_OK=0"
if not exist "!AAPT2_EXE!" set "PACOTES_COMPILACAO_OK=0"
if "!PACOTES_COMPILACAO_OK!"=="0" (
  echo.
  echo [ATENCAO] Android CLI nao concluiu os pacotes de compilacao.
  echo Tentando instalacao direta pelo repositorio oficial Android...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%RAIZ%\scripts\powershell\android-instalar-pacotes-direto.ps1" -SdkRoot "%SDK_LOCAL%"
  if errorlevel 1 (
    echo [ERRO] A instalacao direta dos pacotes Android falhou.
  )
)

if not exist "!ADB_EXE!" (
  echo.
  echo [ERRO] O reparo terminou, mas adb.exe ainda nao foi encontrado:
  echo !ADB_EXE!
  echo Verifique se o antivirus colocou adb.exe em quarentena.
  pause
  exit /b 1
)

if not exist "!ANDROID_JAR!" (
  echo.
  echo [ERRO] A plataforma Android 35 nao foi instalada:
  echo !ANDROID_JAR!
  echo Execute este BAT novamente. Se persistir, verifique internet e antivirus.
  pause
  exit /b 1
)

if not exist "!AAPT2_EXE!" (
  echo.
  echo [ERRO] O Build Tools 34.0.0 nao foi instalado:
  echo !AAPT2_EXE!
  echo Execute este BAT novamente. Se persistir, verifique internet e antivirus.
  pause
  exit /b 1
)

(
  echo ANDROID_HOME=%SDK_LOCAL%
  echo ANDROID_SDK_ROOT=%SDK_LOCAL%
  echo JAVA_HOME=!JAVA_HOME!
  echo ADB_EXE=!ADB_EXE!
) > "%FERRAMENTAS%\android-local.env"

echo.
echo [OK] ADB:
"!ADB_EXE!" version

echo.
echo ============================================================
echo [OK] SDK ANDROID PREPARADO
 echo ============================================================
echo.
echo SDK local:
echo %SDK_LOCAL%
echo.
echo Para diagnosticar o celular e os apps instalados:
echo BAT\ANDROID\02_DIAGNOSTICAR_APPS.bat
echo.
echo Para gerar APK localmente:
echo BAT\APK\01_GERAR_APK_HOMOLOGACAO.bat
echo.
pause
exit /b 0

@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_GITHUB.bat"
if errorlevel 1 ( pause & exit /b 1 )

pushd "%RAIZ%"
set "VERSAO="
if exist "%RAIZ%\VERSION" set /p "VERSAO="<"%RAIZ%\VERSION"
set "APK=%RAIZ%\APK\DeliveryHub-Piloto-Firebase-v!VERSAO!.apk"

if not exist "!APK!" (
  echo [ERRO] APK do piloto nao encontrado: !APK!
  echo Execute BAT\FIREBASE\18_PREPARAR_PILOTO_V055.bat primeiro.
  popd
  pause
  exit /b 1
)

call "%RAIZ%\BAT\GITHUB\00_LOGIN_GITHUB.bat"
if errorlevel 1 ( popd & pause & exit /b 1 )

set "CANAL_APK="
if exist "%RAIZ%\firebase\projeto.local.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%RAIZ%\firebase\projeto.local.env") do (
    if /I "%%A"=="UPDATE_RELEASE_REPOSITORY" set "CANAL_APK=%%B"
  )
)

if not defined CANAL_APK (
  set "CANAL_APK=allangomess16-stack/delivery-hub"
  echo.
  echo Canal publico para distribuir APKs: !CANAL_APK!
  set /p "CANAL_APK=Repositorio publico de APKs [!CANAL_APK!]: "
  if not defined CANAL_APK set "CANAL_APK=allangomess16-stack/delivery-hub"
  >> "%RAIZ%\firebase\projeto.local.env" echo UPDATE_RELEASE_REPOSITORY=!CANAL_APK!
)

set "TMP_VISIBILIDADE=%TEMP%\delivery-hub-visibilidade-%RANDOM%.txt"
"%GH_EXE%" repo view "!CANAL_APK!" --json visibility --jq .visibility > "!TMP_VISIBILIDADE!" 2>nul
set "VISIBILIDADE="
for /f "usebackq delims=" %%V in ("!TMP_VISIBILIDADE!") do set "VISIBILIDADE=%%V"
del /q "!TMP_VISIBILIDADE!" >nul 2>nul
if /I not "!VISIBILIDADE!"=="PUBLIC" (
  echo [ERRO] O repositorio !CANAL_APK! precisa ser publico para o celular baixar o APK.
  popd
  pause
  exit /b 1
)

"%GH_EXE%" release view "v!VERSAO!" --repo "!CANAL_APK!" >nul 2>nul
if errorlevel 1 (
  echo Criando Release publica v!VERSAO! em !CANAL_APK!...
  "%GH_EXE%" release create "v!VERSAO!" --repo "!CANAL_APK!" --title "Delivery Hub v!VERSAO!" --notes "APK operacional Delivery Hub v!VERSAO!."
  if errorlevel 1 ( popd & pause & exit /b 1 )
)

echo Enviando APK para a Release publica v!VERSAO!...
"%GH_EXE%" release upload "v!VERSAO!" "!APK!" --repo "!CANAL_APK!" --clobber
if errorlevel 1 ( popd & pause & exit /b 1 )

echo [OK] APK publicado na Release. Agora execute BAT\FIREBASE\03_SUBIR_ATUALIZACAO.bat.
popd
pause

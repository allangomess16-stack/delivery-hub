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

"%GH_EXE%" release view "v!VERSAO!" >nul 2>nul
if errorlevel 1 (
  echo [ERRO] A Release v!VERSAO! ainda nao existe.
  echo Execute BAT\GITHUB\03_PUBLICAR_VERSAO.bat antes deste arquivo.
  popd
  pause
  exit /b 1
)

echo Enviando APK para a Release v!VERSAO!...
"%GH_EXE%" release upload "v!VERSAO!" "!APK!" --clobber
if errorlevel 1 ( popd & pause & exit /b 1 )

echo [OK] APK publicado na Release. Agora execute BAT\FIREBASE\03_SUBIR_ATUALIZACAO.bat.
popd
pause

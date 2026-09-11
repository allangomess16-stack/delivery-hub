@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO FIREBASE V0.4.7.2
echo ============================================================
echo.
echo Ordem automatizada:
echo  1. ativar configuracao Firebase;
echo  2. validar projeto e backend;
echo  3. gerar APK piloto com login.
echo.

if not exist "%PROJETO_ENV%" (
  echo [INFO] Procurando configuracao Firebase de uma versao anterior...
  for %%I in ("%RAIZ%\..") do set "PAI_PROJETO=%%~fI"
  for %%I in ("!PAI_PROJETO!\..") do set "PAI_GERAL=%%~fI"
  set "CONFIG_ANTERIOR="

  for /d %%D in ("!PAI_PROJETO!\delivery-hub-v*") do (
    if not defined CONFIG_ANTERIOR if exist "%%~fD\firebase\projeto.local.env" (
      set "CONFIG_ANTERIOR=%%~fD\firebase\projeto.local.env"
    )
  )
  for /d %%D in ("!PAI_GERAL!\DeliveryHub-V*-COMPLETO\delivery-hub-v*") do (
    if not defined CONFIG_ANTERIOR if exist "%%~fD\firebase\projeto.local.env" (
      set "CONFIG_ANTERIOR=%%~fD\firebase\projeto.local.env"
    )
  )

  if defined CONFIG_ANTERIOR (
    copy /Y "!CONFIG_ANTERIOR!" "%PROJETO_ENV%" >nul
    if errorlevel 1 (
      echo [ERRO] A configuracao anterior foi encontrada, mas nao pode ser copiada.
      pause
      exit /b 1
    )
    echo [OK] Configuracao anterior reutilizada.
  ) else (
    echo [ERRO] Nenhuma configuracao Firebase anterior foi encontrada.
    echo Se este for o primeiro uso, execute BAT\FIREBASE\01_CRIAR_E_CONFIGURAR.bat.
    pause
    exit /b 1
  )
)

call "%RAIZ%\BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat"
if errorlevel 1 exit /b 1

node "%RAIZ%\scripts\node\firebase-validar-runtime-config.mjs" "%RAIZ%\public\firebase-config.json"
if errorlevel 1 (
  echo [ERRO] A configuracao Firebase nao foi ativada.
  pause
  exit /b 1
)

call "%RAIZ%\BAT\FIREBASE\04_VALIDAR_CONFIGURACAO.bat"
if errorlevel 1 exit /b 1

call "%RAIZ%\BAT\APK\03_GERAR_APK_PILOTO_FIREBASE.bat"
if errorlevel 1 exit /b 1

echo.
echo ============================================================
echo [OK] PILOTO PREPARADO
echo ============================================================
echo.
echo Proxima ordem:
echo  1. instale APK\DeliveryHub-Piloto-Firebase-v0.4.7.2.apk;
echo  2. abra BAT\01_SERVIDOR_LOCAL.bat no computador;
echo  3. entre como Admin no computador;
echo  4. entre como entregador no APK;
echo  5. siga docs\V0.4.7_ROTEIRO_PILOTO_FIREBASE.md.
echo.
pause
exit /b 0

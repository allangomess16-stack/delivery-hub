@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )
set "VERSAO_ATUAL="
if exist "%RAIZ%\VERSION" set /p "VERSAO_ATUAL="<"%RAIZ%\VERSION"
if not defined VERSAO_ATUAL set "VERSAO_ATUAL=atual"

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO FIREBASE V!VERSAO_ATUAL!
echo ============================================================
echo.
echo Ordem automatizada:
echo  1. localizar/reutilizar configuracao Firebase;
echo  2. validar projeto e backend;
echo  3. gerar APK piloto com fallback iMile.
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
  for /d %%D in ("!PAI_GERAL!\DeliveryHub-V*-COMPLETO*\delivery-hub-v*") do (
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
    echo Copie firebase\projeto.local.env da ultima versao aprovada.
    pause
    exit /b 1
  )
)

call "%RAIZ%\BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat" /silencioso
if errorlevel 1 goto :FALHOU_FIREBASE

call "%RAIZ%\BAT\FIREBASE\04_VALIDAR_CONFIGURACAO.bat"
if errorlevel 1 goto :FALHOU_VALIDACAO

call "%RAIZ%\BAT\APK\03_GERAR_APK_PILOTO_FIREBASE.bat"
if errorlevel 1 goto :FALHOU_APK

echo.
echo ============================================================
echo [OK] PILOTO V!VERSAO_ATUAL! PREPARADO
echo ============================================================
echo.
echo Instale APK\DeliveryHub-Piloto-Firebase-v!VERSAO_ATUAL!.apk sem remover a versao anterior.
echo Para criar o acesso separado do suporte, use:
echo BAT\FIREBASE\11_CRIAR_USUARIO_SUPORTE.bat
echo.
pause
exit /b 0

:FALHOU_FIREBASE
echo.
echo [ERRO] Nao foi possivel ativar a configuracao Firebase.
goto :FALHOU

:FALHOU_VALIDACAO
echo.
echo [ERRO] A validacao Firebase/projeto nao foi concluida.
goto :FALHOU

:FALHOU_APK
echo.
echo [ERRO] A geracao do APK piloto nao foi concluida.
goto :FALHOU

:FALHOU
echo.
echo A janela permanecera aberta para voce fotografar ou copiar o erro acima.
pause
exit /b 1

@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"
title Delivery Hub - Diagnostico Autofill iMile

cls
echo ============================================================
echo  DELIVERY HUB - DIAGNOSTICO AUTOFILL IMILE
echo ============================================================
echo.
echo Esta sonda coleta SOMENTE metadados tecnicos da iMile:
echo - se o Android enviou FillRequest;
echo - classe do campo, AutofillId e quantidade de hints.
echo.
echo Nao grava nome, documento, tracking, fotos, assinatura, video
echo, captura de tela ou arvore visual.
echo.

if not defined ADB_EXE (
  echo [ERRO] adb.exe nao encontrado.
  echo Execute primeiro BAT\APK\00_PREPARAR_SDK_ANDROID.bat
  pause
  exit /b 1
)

"%ADB_EXE%" start-server >nul 2>nul
set "TMP_DEVICES=%TEMP%\deliveryhub-autofill-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP_DEVICES%" 2>&1

set "SERIAL="
set "DEVICE_COUNT=0"
set "TEM_UNAUTHORIZED="
for /f "usebackq skip=1 tokens=1,2" %%A in ("%TMP_DEVICES%") do (
  if /I "%%B"=="device" (
    set /a DEVICE_COUNT+=1
    set "SERIAL=%%A"
  )
  if /I "%%B"=="unauthorized" set "TEM_UNAUTHORIZED=1"
)
del /q "%TMP_DEVICES%" >nul 2>nul

if defined TEM_UNAUTHORIZED (
  echo [ERRO] Autorize a depuracao USB na tela do celular.
  pause
  exit /b 2
)
if not "%DEVICE_COUNT%"=="1" (
  echo [ERRO] Conecte exatamente um celular autorizado. Detectados: %DEVICE_COUNT%
  pause
  exit /b 1
)

"%ADB_EXE%" -s "%SERIAL%" shell pm path com.imile.redelivery >nul 2>nul
if errorlevel 1 (
  echo [ERRO] iMile nao encontrada: com.imile.redelivery
  pause
  exit /b 1
)

set "PROVEDOR="
for /f "delims=" %%A in ('"%ADB_EXE%" -s "%SERIAL%" shell settings get secure autofill_service 2^>nul') do set "PROVEDOR=%%A"
echo(%PROVEDOR%| findstr /I /C:"com.deliveryhub.app" >nul
if errorlevel 1 goto :PROVEDOR_NAO_ATIVO
echo(%PROVEDOR%| findstr /I /C:"DeliveryHubAutofillProbe" >nul
if errorlevel 1 goto :PROVEDOR_NAO_ATIVO

set "PASTA=%RAIZ%\diagnosticos"
if not exist "%PASTA%" mkdir "%PASTA%"
set "ID=%RANDOM%%RANDOM%"
set "LOG=%PASTA%\log-autofill-imile-%ID%.txt"
set "CONTEXTO=%PASTA%\contexto-tecnico-%ID%.txt"
set "ZIP=%PASTA%\DIAGNOSTICO_AUTOFILL_IMILE-%ID%.zip"
set "TMP_PACOTE=%TEMP%\deliveryhub-autofill-package-%ID%.txt"

echo [1/4] Limpando logs antigos da sonda...
"%ADB_EXE%" -s "%SERIAL%" logcat -c >nul 2>nul

echo [2/4] Sonda armada.
echo.
echo No celular:
echo  1. Abra a iMile e navegue manualmente ate a tela Confirmar.
echo  2. Toque em Nome Completo e aguarde 3 segundos.
echo  3. Toque em Numero do Documento e aguarde 3 segundos.
echo  4. NAO digite, nao cole e nao toque em Entregue.
echo.
pause

echo [3/4] Coletando somente logs tecnicos da sonda...
"%ADB_EXE%" -s "%SERIAL%" logcat -d -v brief AutofillProbe:I *:S > "%LOG%" 2>nul
(
  echo data_utc=%DATE% %TIME%
  echo serial=%SERIAL%
  echo autofill_provider=%PROVEDOR%
  "%ADB_EXE%" -s "%SERIAL%" shell dumpsys package com.imile.redelivery > "%TMP_PACOTE%" 2^>nul
  findstr /R /C:"versionName=" /C:"versionCode=" "%TMP_PACOTE%"
) > "%CONTEXTO%"
del /q "%TMP_PACOTE%" >nul 2>nul

echo [4/4] Compactando diagnostico...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "Compress-Archive -LiteralPath '%LOG%','%CONTEXTO%' -DestinationPath '%ZIP%' -Force"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel compactar o diagnostico.
  pause
  exit /b 1
)

del /q "%LOG%" "%CONTEXTO%" >nul 2>nul
echo.
echo ============================================================
echo [OK] DIAGNOSTICO GERADO
echo ============================================================
echo.
echo Arquivo:
echo %ZIP%
echo.
echo Envie somente esse ZIP aqui.
echo Depois, restaure seu provedor normal de senhas/preenchimento
echo automatico nas configuracoes do Android.
start "" "%PASTA%"
pause
exit /b 0

:PROVEDOR_NAO_ATIVO
echo.
echo [ERRO] O Delivery Hub Autofill Test nao esta selecionado.
echo.
echo No Android, abra Configuracoes e pesquise por:
echo   Servico de preenchimento automatico
echo.
echo Selecione Delivery Hub Autofill Test, volte e execute este BAT novamente.
echo Apos o teste, restaure seu provedor normal de senhas.
pause
exit /b 1

@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"

cls
echo ============================================================
echo  DELIVERY HUB - HOMOLOGAR NAVEGACAO IMILE 2.3.18
echo ============================================================
echo.
echo Este teste envia somente:
echo   DH_TESTE_INVALIDO
echo.
echo Ele NAO usa encomenda real, foto, assinatura ou confirmacao de baixa.
echo.

if not defined ADB_EXE (
  echo [ERRO] ADB nao encontrado.
  echo Execute BAT\ANDROID\01_PREPARAR_ANDROID.bat.
  pause
  exit /b 1
)

"%ADB_EXE%" start-server >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Nao foi possivel iniciar o ADB.
  pause
  exit /b 1
)

set "TMP_DEVICES=%TEMP%\delivery-hub-imile-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP_DEVICES%" 2>nul

set "DEVICE_COUNT=0"
for /f "usebackq skip=1 tokens=1,2" %%A in ("%TMP_DEVICES%") do (
  if /I "%%B"=="device" set /a DEVICE_COUNT+=1
)
del /q "%TMP_DEVICES%" >nul 2>nul

if not "%DEVICE_COUNT%"=="1" (
  echo [ERRO] Conecte exatamente um celular autorizado. Detectados: %DEVICE_COUNT%
  pause
  exit /b 1
)

set "TMP_PACKAGE=%TEMP%\delivery-hub-imile-package-%RANDOM%.txt"
"%ADB_EXE%" shell dumpsys package com.imile.redelivery > "%TMP_PACKAGE%" 2>nul

findstr /R /C:"versionCode=458 " "%TMP_PACKAGE%" >nul
if errorlevel 1 (
  echo [ERRO] A iMile instalada nao e a versao homologavel 2.3.18 code 458.
  echo.
  findstr /I /C:"versionName=" /C:"versionCode=" "%TMP_PACKAGE%"
  del /q "%TMP_PACKAGE%" >nul 2>nul
  pause
  exit /b 1
)
del /q "%TMP_PACKAGE%" >nul 2>nul

echo [OK] iMile 2.3.18 code 458 detectada.
echo.
set "CONFIRMA="
set /p "CONFIRMA=Digite TESTAR para abrir a pesquisa sintetica: "
if /I not "%CONFIRMA%"=="TESTAR" (
  echo [INFO] Teste cancelado sem abrir a iMile.
  pause
  exit /b 0
)

echo.
echo Abrindo URI sintetica...
"%ADB_EXE%" shell am start -W -a android.intent.action.VIEW -d "crredelivery:?requestCode=DH_TESTE_INVALIDO" -p com.imile.redelivery
if errorlevel 1 (
  echo [ERRO] O Android nao conseguiu despachar o Deep Link.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  CONFERENCIA VISUAL OBRIGATORIA
echo ============================================================
echo.
echo Verifique no celular:
echo  [ ] iMile abriu sem seletor de aplicativos
echo  [ ] tela de pesquisa comum foi exibida
echo  [ ] campo recebeu DH_TESTE_INVALIDO
echo  [ ] nenhuma entrega foi alterada
echo.
echo A execucao deste BAT NAO muda automaticamente a capacidade para
echo DEVICE_VALIDATED. Registre o resultado antes da promocao.
echo.
pause
exit /b 0

@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"

cls
echo ============================================================
echo  DELIVERY HUB - VALIDAR OUTBOX OFFLINE V0.4.6.1
echo ============================================================
echo.
echo Este roteiro NAO apaga dados e NAO envia baixa real.
echo Ele fecha e reabre somente o APK de homologacao para provar
echo que a fila e o UUID continuam salvos no aparelho.
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

set "TMP_DEVICES=%TEMP%\delivery-hub-outbox-devices-%RANDOM%.txt"
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

"%ADB_EXE%" shell pm path com.deliveryhub.homologacao 2>nul | findstr /I /C:"package:" >nul
if errorlevel 1 (
  echo [ERRO] O APK com.deliveryhub.homologacao nao esta instalado.
  echo Gere e instale a V0.4.6.1 antes deste teste.
  pause
  exit /b 1
)

echo [1/3] Abrindo o Delivery Hub de homologacao...
"%ADB_EXE%" shell monkey -p com.deliveryhub.homologacao -c android.intent.category.LAUNCHER 1 >nul 2>nul
echo.
echo No celular:
echo  1. Abra uma carga ou escaneie uma etiqueta.
echo  2. Preencha o fluxo ate CONFIRMAR SIMULACAO.
echo  3. Toque em SIMULAR SEM REDE.
echo  4. Confirme o teste.
echo  5. Confira FILA = 1 e anote o UUID exibido.
echo.
pause

echo.
echo [2/3] Fechando e reabrindo o APK sem limpar os dados...
"%ADB_EXE%" shell am force-stop com.deliveryhub.homologacao
"%ADB_EXE%" shell monkey -p com.deliveryhub.homologacao -c android.intent.category.LAUNCHER 1 >nul 2>nul
echo.
echo Confira no celular:
echo  [ ] O app voltou diretamente ao resultado da operacao
echo  [ ] FILA continua = 1
echo  [ ] O UUID e exatamente o mesmo
echo.
pause

echo.
echo [3/3] No celular, toque em REATIVAR REDE E SINCRONIZAR.
echo Confira:
echo  [ ] FILA chegou a 0
echo  [ ] Estado virou AGUARDANDO INTEGRACAO
echo  [ ] O UUID permaneceu igual
echo  [ ] Tocar em SINCRONIZAR AGORA nao cria duplicidade
echo.
echo Se os quatro itens estiverem corretos, a Outbox esta DEVICE_VALIDATED.
echo.
pause
exit /b 0

@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"
title Delivery Hub - Mapear scanner iMile

cls
echo ============================================================
echo  DELIVERY HUB - MAPEAR TELA DE SCANNER IMILE
echo ============================================================
echo.
echo Teste passivo:
echo - nao escaneia pacote;
echo - nao envia baixa;
echo - nao confirma entrega;
echo - nao altera dados da iMile.
echo.

if not defined ADB_EXE (
  echo [ERRO] adb.exe nao encontrado.
  echo Execute primeiro BAT\APK\00_PREPARAR_SDK_ANDROID.bat
  pause
  exit /b 1
)

echo [OK] ADB:
echo %ADB_EXE%
if defined SDK_REUTILIZADO (
  echo [INFO] Reutilizando SDK:
  echo %SDK_REUTILIZADO%
)
echo.

rem ============================================================
rem DISPOSITIVO - sem executar ADB dentro de FOR /F
rem ============================================================
"%ADB_EXE%" start-server >nul 2>nul

set "TMP_DEVICES=%TEMP%\deliveryhub-imile-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP_DEVICES%" 2>&1

type "%TMP_DEVICES%"
echo.

set "SERIAL="
set "TEM_UNAUTHORIZED="
set "TEM_OFFLINE="

for /f "usebackq skip=1 tokens=1,2" %%A in ("%TMP_DEVICES%") do (
  if /I "%%B"=="device" if not defined SERIAL set "SERIAL=%%A"
  if /I "%%B"=="unauthorized" set "TEM_UNAUTHORIZED=1"
  if /I "%%B"=="offline" set "TEM_OFFLINE=1"
)

del /q "%TMP_DEVICES%" >nul 2>nul

if not defined SERIAL (
  if defined TEM_UNAUTHORIZED (
    echo [ERRO] Celular encontrado, mas nao autorizado.
    echo Aceite a chave RSA no celular e execute novamente.
    pause
    exit /b 2
  )
  if defined TEM_OFFLINE (
    echo [ERRO] Celular apareceu como OFFLINE.
    echo Reconecte o cabo e execute novamente.
    pause
    exit /b 3
  )
  echo [ERRO] Nenhum aparelho autorizado foi encontrado.
  pause
  exit /b 1
)

echo [OK] Aparelho autorizado: %SERIAL%
echo.

rem ============================================================
rem IMILE
rem ============================================================
set "IMILE_PACKAGE=com.imile.redelivery"
set "IMILE_COMPONENT=com.imile.redelivery/.MainActivity"

set "TMP_PKG=%TEMP%\deliveryhub-imile-pkg-%RANDOM%.txt"
"%ADB_EXE%" -s "%SERIAL%" shell pm path "%IMILE_PACKAGE%" > "%TMP_PKG%" 2>nul
findstr /I /B /C:"package:" "%TMP_PKG%" >nul
if errorlevel 1 (
  del /q "%TMP_PKG%" >nul 2>nul
  echo [ERRO] iMile nao encontrada: %IMILE_PACKAGE%
  pause
  exit /b 1
)
del /q "%TMP_PKG%" >nul 2>nul

set "PASTA_DIAG=%RAIZ%\diagnosticos-apk"
if not exist "%PASTA_DIAG%" mkdir "%PASTA_DIAG%"

set "ARQ=%PASTA_DIAG%\diagnostico-imile-scanner.txt"
set "UI_INICIAL=%PASTA_DIAG%\imile-ui-inicial.xml"
set "UI_SCANNER=%PASTA_DIAG%\imile-ui-scanner.xml"

> "%ARQ%" echo DELIVERY HUB - DIAGNOSTICO IMILE SCANNER
>>"%ARQ%" echo ======================================
>>"%ARQ%" echo Pacote: %IMILE_PACKAGE%
>>"%ARQ%" echo Aparelho: %SERIAL%
>>"%ARQ%" echo.

echo [1/4] Abrindo iMile...
"%ADB_EXE%" -s "%SERIAL%" shell am start -W -n "%IMILE_COMPONENT%" >>"%ARQ%" 2>&1
if errorlevel 1 (
  echo [ERRO] Nao foi possivel abrir a MainActivity da iMile.
  pause
  exit /b 1
)

timeout /t 2 /nobreak >nul

echo [2/4] Registrando estado inicial...
call :CAPTURAR "ETAPA 1 - TELA INICIAL IMILE" "%UI_INICIAL%"

echo.
echo ============================================================
echo AGORA NO CELULAR
echo ============================================================
echo.
echo Na tela da iMile, toque em:
echo.
echo   LEITURA DE ENTREGA
echo   (na area "Operacoes Rapidas")
echo.
echo Se a operacao habitual do entregador usar outra entrada de
echo scanner, abra essa tela no lugar desta.
echo.
echo IMPORTANTE:
echo - pare assim que a CAMERA/SCANNER abrir;
echo - NAO aponte para uma etiqueta;
echo - NAO confirme nenhuma operacao.
echo.
echo Quando a tela do scanner estiver aberta, volte ao computador
echo e pressione qualquer tecla.
echo.
pause >nul

echo [3/4] Registrando scanner...
call :CAPTURAR "ETAPA 2 - SCANNER IMILE ABERTO" "%UI_SCANNER%"

echo [4/4] Concluindo...

echo.
echo ============================================================
echo [OK] DIAGNOSTICO CONCLUIDO
echo ============================================================
echo.
echo Envie para analise:
echo %ARQ%
echo.
echo Arquivo complementar da interface:
echo %UI_SCANNER%
echo.
echo Nenhuma baixa foi enviada.
echo Nenhuma encomenda foi alterada.
echo.
start "" notepad.exe "%ARQ%"
pause
exit /b 0

:CAPTURAR
set "TITULO=%~1"
set "ARQ_UI=%~2"
set "TMP_ACT=%TEMP%\deliveryhub-imile-act-%RANDOM%.txt"
set "TMP_WIN=%TEMP%\deliveryhub-imile-win-%RANDOM%.txt"

>>"%ARQ%" echo.
>>"%ARQ%" echo ======================================
>>"%ARQ%" echo %TITULO%
>>"%ARQ%" echo ======================================

>>"%ARQ%" echo.
>>"%ARQ%" echo --- Activity em primeiro plano ---
"%ADB_EXE%" -s "%SERIAL%" shell dumpsys activity activities > "%TMP_ACT%" 2>nul
findstr /I /C:"mResumedActivity" /C:"topResumedActivity" /C:"ResumedActivity" "%TMP_ACT%" >>"%ARQ%" 2>&1

>>"%ARQ%" echo.
>>"%ARQ%" echo --- Linhas iMile na pilha de Activities ---
findstr /I /C:"com.imile.redelivery" "%TMP_ACT%" >>"%ARQ%" 2>&1

>>"%ARQ%" echo.
>>"%ARQ%" echo --- Window em foco ---
"%ADB_EXE%" -s "%SERIAL%" shell dumpsys window windows > "%TMP_WIN%" 2>nul
findstr /I /C:"mCurrentFocus" /C:"mFocusedApp" "%TMP_WIN%" >>"%ARQ%" 2>&1

>>"%ARQ%" echo.
>>"%ARQ%" echo --- Versao instalada ---
"%ADB_EXE%" -s "%SERIAL%" shell dumpsys package "%IMILE_PACKAGE%" | findstr /I /C:"versionName=" /C:"versionCode=" >>"%ARQ%" 2>&1

rem UI hierarchy complementar. Pode falhar em algumas telas; nao interrompe o teste.
"%ADB_EXE%" -s "%SERIAL%" shell uiautomator dump /sdcard/deliveryhub-imile-ui.xml >nul 2>nul
"%ADB_EXE%" -s "%SERIAL%" pull /sdcard/deliveryhub-imile-ui.xml "%ARQ_UI%" >nul 2>nul
"%ADB_EXE%" -s "%SERIAL%" shell rm /sdcard/deliveryhub-imile-ui.xml >nul 2>nul

del /q "%TMP_ACT%" >nul 2>nul
del /q "%TMP_WIN%" >nul 2>nul
goto :eof

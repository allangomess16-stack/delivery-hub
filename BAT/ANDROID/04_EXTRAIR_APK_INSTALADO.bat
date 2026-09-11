@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"
title Delivery Hub - Extrair APK instalado

cls

set "SAIDA=%RAIZ%\diagnosticos-apk"
if not exist "%SAIDA%" mkdir "%SAIDA%"

set "LOG=%SAIDA%\extracao-apk-log.txt"
> "%LOG%" echo DELIVERY HUB - LOG DE EXTRACAO APK
>>"%LOG%" echo ==================================
>>"%LOG%" echo Inicio: %DATE% %TIME%
>>"%LOG%" echo.

call :TELA "============================================================"
call :TELA " DELIVERY HUB - EXTRAIR APK INSTALADO"
call :TELA "============================================================"
call :TELA ""
call :TELA "Este BAT apenas COPIA os APKs instalados do aparelho."
call :TELA "Nao altera o aplicativo e nao executa nenhuma entrega."
call :TELA ""

if not defined ADB_EXE (
  call :TELA "[ERRO] adb nao encontrado."
  call :TELA "Execute primeiro BAT\APK\00_PREPARAR_SDK_ANDROID.bat"
  goto :FALHA
)

call :TELA "[OK] ADB:"
call :TELA "%ADB_EXE%"
if defined SDK_REUTILIZADO (
  call :TELA "[INFO] SDK reutilizado:"
  call :TELA "%SDK_REUTILIZADO%"
)
call :TELA ""

"%ADB_EXE%" start-server >>"%LOG%" 2>&1

rem ============================================================
rem APARELHO
rem ============================================================
set "TMP_DEVICES=%TEMP%\deliveryhub-extrair-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP_DEVICES%" 2>&1
>>"%LOG%" echo --- adb devices ---
type "%TMP_DEVICES%" >>"%LOG%"
>>"%LOG%" echo.

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
    call :TELA "[ERRO] Celular encontrado, mas nao autorizado."
    call :TELA "Aceite a chave RSA de depuracao USB no celular."
    goto :FALHA
  )
  if defined TEM_OFFLINE (
    call :TELA "[ERRO] Celular apareceu como OFFLINE."
    call :TELA "Reconecte o cabo USB."
    goto :FALHA
  )
  call :TELA "[ERRO] Nenhum aparelho autorizado foi encontrado."
  goto :FALHA
)

call :TELA "[OK] Aparelho autorizado: %SERIAL%"
call :TELA ""

echo 1 - Anjun
echo 2 - iMile
echo 3 - Informar package manualmente
echo 4 - Cancelar
echo.
choice /C 1234 /N /M "Escolha: "

if errorlevel 4 goto :CANCELADO
if errorlevel 3 (
  set /p "PACOTE=Package Android: "
  set "NOME=APP"
) else if errorlevel 2 (
  set "PACOTE=com.imile.redelivery"
  set "NOME=IMILE"
) else (
  set "PACOTE=com.anjun.supplierManagement"
  set "NOME=ANJUN"
)

>>"%LOG%" echo Escolha: %NOME%
>>"%LOG%" echo Package: %PACOTE%
>>"%LOG%" echo.

if not defined PACOTE (
  call :TELA "[ERRO] Package vazio."
  goto :FALHA
)

rem ============================================================
rem PM PATH
rem ============================================================
set "TMP_PATHS=%TEMP%\deliveryhub-pm-path-%RANDOM%.txt"
"%ADB_EXE%" -s "%SERIAL%" shell pm path "%PACOTE%" > "%TMP_PATHS%" 2>&1

>>"%LOG%" echo --- pm path %PACOTE% ---
type "%TMP_PATHS%" >>"%LOG%"
>>"%LOG%" echo.

findstr /I /B /C:"package:" "%TMP_PATHS%" >nul
if errorlevel 1 (
  call :TELA "[ERRO] APK nao localizado para %PACOTE%."
  type "%TMP_PATHS%"
  type "%TMP_PATHS%" >>"%LOG%"
  del /q "%TMP_PATHS%" >nul 2>nul
  goto :FALHA
)

rem ============================================================
rem VERSAO
rem ============================================================
set "TMP_DUMPSYS=%TEMP%\deliveryhub-dumpsys-pkg-%RANDOM%.txt"
"%ADB_EXE%" -s "%SERIAL%" shell dumpsys package "%PACOTE%" > "%TMP_DUMPSYS%" 2>&1

set "VERSAO=desconhecida"
set "VERSION_CODE=desconhecido"

for /f "usebackq tokens=1,* delims==" %%A in ("%TMP_DUMPSYS%") do (
  set "CHAVE=%%A"
  set "VALOR=%%B"
  for /f "tokens=* delims= " %%C in ("!CHAVE!") do set "CHAVE=%%C"
  if /I "!CHAVE!"=="versionName" if "!VERSAO!"=="desconhecida" set "VERSAO=!VALOR!"
)

for /f "usebackq tokens=*" %%L in ("%TMP_DUMPSYS%") do (
  set "LINHA=%%L"
  echo !LINHA! | findstr /I /C:"versionCode=" >nul
  if not errorlevel 1 if "!VERSION_CODE!"=="desconhecido" (
    for /f "tokens=1 delims= " %%C in ("!LINHA!") do (
      set "VC=%%C"
      set "VC=!VC:versionCode=!"
      set "VERSION_CODE=!VC!"
    )
  )
)

set "VERSAO_SAFE=%VERSAO:/=-%"
set "VERSAO_SAFE=%VERSAO_SAFE:\=-%"
set "VERSAO_SAFE=%VERSAO_SAFE::=-%"
set "VERSAO_SAFE=%VERSAO_SAFE: =_%"

set "DEST=%SAIDA%\%NOME%_%VERSAO_SAFE%_%VERSION_CODE%"
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%" >>"%LOG%" 2>&1
if errorlevel 1 (
  call :TELA "[ERRO] Nao foi possivel criar a pasta:"
  call :TELA "%DEST%"
  goto :FALHA
)

set "INFO=%DEST%\pacote-info.txt"

> "%INFO%" echo DELIVERY HUB - APK INSTALADO
>>"%INFO%" echo ===========================
>>"%INFO%" echo Nome: %NOME%
>>"%INFO%" echo Package: %PACOTE%
>>"%INFO%" echo VersionName: %VERSAO%
>>"%INFO%" echo VersionCode: %VERSION_CODE%
>>"%INFO%" echo Aparelho: %SERIAL%
>>"%INFO%" echo.
>>"%INFO%" echo Activity launcher:
"%ADB_EXE%" -s "%SERIAL%" shell cmd package resolve-activity --brief ^
  -a android.intent.action.MAIN ^
  -c android.intent.category.LAUNCHER ^
  "%PACOTE%" >>"%INFO%" 2>&1
>>"%INFO%" echo.
>>"%INFO%" echo Caminhos APK instalados:
type "%TMP_PATHS%" >>"%INFO%"

call :TELA ""
call :TELA "Package: %PACOTE%"
call :TELA "Versao: %VERSAO%"
call :TELA "VersionCode: %VERSION_CODE%"
call :TELA ""
call :TELA "Extraindo APKs instalados..."
call :TELA ""

set /a CONTADOR=0
set /a FALHAS=0

rem Cada package:/caminho vira um destino EXPLICITO.
rem Evita passar uma pasta terminada em barra invertida para adb pull.
for /f "usebackq tokens=1,* delims=:" %%A in ("%TMP_PATHS%") do (
  if /I "%%A"=="package" (
    set "REMOTO=%%B"
    if defined REMOTO (
      set /a CONTADOR+=1

      for %%F in ("!REMOTO!") do set "NOME_ARQ=%%~nxF"
      if not defined NOME_ARQ set "NOME_ARQ=apk_!CONTADOR!.apk"

      set "LOCAL=%DEST%\!NOME_ARQ!"

      call :TELA "[!CONTADOR!] !NOME_ARQ!"
      >>"%LOG%" echo REMOTO=!REMOTO!
      >>"%LOG%" echo LOCAL=!LOCAL!

      "%ADB_EXE%" -s "%SERIAL%" pull "!REMOTO!" "!LOCAL!" >>"%LOG%" 2>&1
      set "RC=!ERRORLEVEL!"

      if not "!RC!"=="0" (
        set /a FALHAS+=1
        call :TELA "    [ERRO] adb pull retornou codigo !RC!."
      ) else (
        if exist "!LOCAL!" (
          for %%S in ("!LOCAL!") do set "TAM=%%~zS"
          call :TELA "    [OK] !TAM! bytes"
          >>"%LOG%" echo TAMANHO=!TAM!
        ) else (
          set /a FALHAS+=1
          call :TELA "    [ERRO] adb informou sucesso, mas o arquivo nao existe."
          >>"%LOG%" echo ERRO: arquivo local nao encontrado apos pull.
        )
      )
      >>"%LOG%" echo.
    )
  )
)

del /q "%TMP_PATHS%" >nul 2>nul
del /q "%TMP_DUMPSYS%" >nul 2>nul

if !CONTADOR! LEQ 0 (
  call :TELA "[ERRO] Nenhum caminho package: foi interpretado."
  goto :FALHA
)

if !FALHAS! GTR 0 (
  call :TELA ""
  call :TELA "[ERRO] Houve !FALHAS! falha(s) durante adb pull."
  call :TELA "O log foi preservado em:"
  call :TELA "%LOG%"
  goto :FALHA
)

>>"%INFO%" echo.
>>"%INFO%" echo Arquivos copiados:
for %%F in ("%DEST%\*.apk") do (
  >>"%INFO%" echo %%~nxF
)

>>"%INFO%" echo.
>>"%INFO%" echo SHA256 dos APKs:
for %%F in ("%DEST%\*.apk") do (
  >>"%INFO%" echo.
  >>"%INFO%" echo [%%~nxF]
  certutil -hashfile "%%~fF" SHA256 >>"%INFO%" 2>>"%LOG%"
)

set "ZIP_OUT=%SAIDA%\%NOME%_%VERSAO_SAFE%_%VERSION_CODE%_APKS.zip"
if exist "%ZIP_OUT%" del /q "%ZIP_OUT%"

call :TELA ""
call :TELA "Compactando os APKs extraidos..."

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Compress-Archive -LiteralPath '%DEST%\*' -DestinationPath '%ZIP_OUT%' -Force" >>"%LOG%" 2>&1

if errorlevel 1 (
  call :TELA "[ATENCAO] APK extraido, mas o ZIP nao foi criado."
  call :TELA "Pode me enviar o base.apk diretamente:"
  call :TELA "%DEST%"
  goto :SUCESSO_PARCIAL
)

call :TELA ""
call :TELA "============================================================"
call :TELA "[OK] EXTRACAO CONCLUIDA"
call :TELA "============================================================"
call :TELA ""
call :TELA "APKs copiados: !CONTADOR!"
call :TELA ""
call :TELA "Arquivo para enviar:"
call :TELA "%ZIP_OUT%"
call :TELA ""
call :TELA "Log:"
call :TELA "%LOG%"
call :TELA ""
call :TELA "Nenhum dado da iMile foi alterado."

>>"%LOG%" echo.
>>"%LOG%" echo RESULTADO=SUCESSO
>>"%LOG%" echo ZIP=%ZIP_OUT%
>>"%LOG%" echo Fim: %DATE% %TIME%

explorer "%SAIDA%"
echo.
pause
exit /b 0

:SUCESSO_PARCIAL
>>"%LOG%" echo.
>>"%LOG%" echo RESULTADO=SUCESSO_PARCIAL
>>"%LOG%" echo Fim: %DATE% %TIME%
echo.
pause
exit /b 0

:FALHA
>>"%LOG%" echo.
>>"%LOG%" echo RESULTADO=FALHA
>>"%LOG%" echo Fim: %DATE% %TIME%
echo.
echo ============================================================
echo O BAT encontrou um erro.
echo A janela permanecera aberta.
echo.
echo LOG:
echo %LOG%
echo ============================================================
echo.
pause
exit /b 1

:CANCELADO
>>"%LOG%" echo.
>>"%LOG%" echo RESULTADO=CANCELADO
>>"%LOG%" echo Fim: %DATE% %TIME%
echo.
echo Operacao cancelada.
pause
exit /b 0

:TELA
echo(%~1
>>"%LOG%" echo(%~1
exit /b 0

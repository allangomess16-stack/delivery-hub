@echo off
setlocal EnableExtensions EnableDelayedExpansion

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"

cls
echo ============================================================
echo  DELIVERY HUB - ENVIAR PROJETO E GERAR APK
echo ============================================================
echo.
echo Repositorio:
echo   allangomess16-stack/delivery-hub
echo.
echo Este BAT:
echo   1. confirma login;
echo   2. valida o projeto;
echo   3. protege o historico remoto existente;
echo   4. sincroniza a versao local completa;
echo   5. gera o APK pelo GitHub Actions;
echo   6. baixa o APK para a pasta APK.
echo.

rem ============================================================
rem LOCALIZAR GH
rem ============================================================
set "GH_EXE="
set "TMP_WHERE=%TEMP%\delivery-hub-where-gh-%RANDOM%.txt"

where gh.exe > "%TMP_WHERE%" 2>nul
if not errorlevel 1 set /p "GH_EXE="<"%TMP_WHERE%"
del /q "%TMP_WHERE%" >nul 2>nul

if not defined GH_EXE if exist "%ProgramFiles%\GitHub CLI\gh.exe" (
  set "GH_EXE=%ProgramFiles%\GitHub CLI\gh.exe"
)

if not defined GH_EXE if exist "%LOCALAPPDATA%\Programs\GitHub CLI\gh.exe" (
  set "GH_EXE=%LOCALAPPDATA%\Programs\GitHub CLI\gh.exe"
)

if not defined GH_EXE (
  echo [ERRO] GitHub CLI nao encontrada.
  pause
  exit /b 1
)

where git.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao encontrado.
  pause
  exit /b 1
)

where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] NPM nao encontrado.
  pause
  exit /b 1
)

if not exist "%RAIZ%\package.json" (
  echo [ERRO] package.json nao encontrado.
  echo Este BAT deve ficar em:
  echo BAT\GITHUB\07_GERAR_APK_HOMOLOGACAO.bat
  pause
  exit /b 1
)

pushd "%RAIZ%"

set "REPO=allangomess16-stack/delivery-hub"
set "REPO_URL=https://github.com/allangomess16-stack/delivery-hub.git"
set "GH_TOKEN="
set "GITHUB_TOKEN="

rem ============================================================
rem LOGIN
rem ============================================================
echo [1/9] Confirmando login GitHub...
"%GH_EXE%" auth status --hostname github.com
if errorlevel 1 (
  echo.
  echo Abrindo login oficial...
  "%GH_EXE%" auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 goto :ERRO_LOGIN

  "%GH_EXE%" auth status --hostname github.com
  if errorlevel 1 goto :ERRO_LOGIN
)

"%GH_EXE%" auth setup-git >nul 2>nul

rem ============================================================
rem REPOSITORIO
rem ============================================================
echo.
echo [2/9] Confirmando repositorio...
set "TMP_REPO=%TEMP%\delivery-hub-repo-%RANDOM%.txt"

"%GH_EXE%" repo view "%REPO%" --json nameWithOwner --jq .nameWithOwner > "%TMP_REPO%" 2>nul
if errorlevel 1 (
  del /q "%TMP_REPO%" >nul 2>nul
  echo [ERRO] O repositorio %REPO% nao foi encontrado.
  goto :FALHOU
)

set "REPO_CONFIRMADO="
set /p "REPO_CONFIRMADO="<"%TMP_REPO%"
del /q "%TMP_REPO%" >nul 2>nul
echo [OK] !REPO_CONFIRMADO!

rem ============================================================
rem DEPENDENCIAS / TESTES
rem ============================================================
echo.
echo [3/9] Preparando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo [ERRO] npm install falhou.
  goto :FALHOU
)

echo.
echo [4/9] Validando projeto...
call npm run validate
if errorlevel 1 (
  echo [ERRO] Validacao TypeScript falhou.
  goto :FALHOU
)

call npm run test
if errorlevel 1 (
  echo [ERRO] Testes falharam.
  goto :FALHOU
)

rem ============================================================
rem GIT
rem ============================================================
echo.
echo [5/9] Preparando Git...

if not exist ".git" (
  git init
  if errorlevel 1 (
    echo [ERRO] git init falhou.
    goto :FALHOU
  )
)

git branch -M main

set "ORIGIN_ATUAL="
set "TMP_ORIGIN=%TEMP%\delivery-hub-origin-%RANDOM%.txt"
git remote get-url origin > "%TMP_ORIGIN%" 2>nul
if not errorlevel 1 set /p "ORIGIN_ATUAL="<"%TMP_ORIGIN%"
del /q "%TMP_ORIGIN%" >nul 2>nul

if not defined ORIGIN_ATUAL (
  git remote add origin "%REPO_URL%"
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel adicionar origin.
    goto :FALHOU
  )
) else (
  if /I not "!ORIGIN_ATUAL!"=="%REPO_URL%" (
    git remote set-url origin "%REPO_URL%"
    if errorlevel 1 (
      echo [ERRO] Nao foi possivel corrigir origin.
      goto :FALHOU
    )
  )
)

git config --local user.name >nul 2>nul
if errorlevel 1 git config --local user.name "allangomess16-stack"

git config --local user.email >nul 2>nul
if errorlevel 1 git config --local user.email "241206720+allangomess16-stack@users.noreply.github.com"

echo.
echo Preparando commit local...
git add .
if errorlevel 1 goto :FALHOU

git diff --cached --quiet
if errorlevel 1 (
  set "VERSAO="
  set "TMP_VERSAO=%TEMP%\delivery-hub-versao-%RANDOM%.txt"
  node -p "require('./package.json').version" > "!TMP_VERSAO!" 2>nul
  if not errorlevel 1 set /p "VERSAO="<"!TMP_VERSAO!"
  del /q "!TMP_VERSAO!" >nul 2>nul
  if not defined VERSAO set "VERSAO=atual"

  git commit -m "chore: consolidar Delivery Hub v!VERSAO!"
  if errorlevel 1 (
    echo [ERRO] git commit falhou.
    goto :FALHOU
  )
) else (
  echo [OK] Nenhuma alteracao nova para commit.
)

rem ============================================================
rem FETCH + PROTECAO DO HISTORICO
rem ============================================================
echo.
echo [6/9] Sincronizando historico remoto com seguranca...

git fetch origin main
if errorlevel 1 (
  echo [ERRO] Nao foi possivel buscar origin/main.
  goto :FALHOU
)

set "REMOTE_SHA="
set "TMP_SHA=%TEMP%\delivery-hub-remote-sha-%RANDOM%.txt"
git rev-parse origin/main > "%TMP_SHA%" 2>nul
if not errorlevel 1 set /p "REMOTE_SHA="<"%TMP_SHA%"
del /q "%TMP_SHA%" >nul 2>nul

if not defined REMOTE_SHA (
  echo [ERRO] Nao foi possivel identificar o commit remoto.
  goto :FALHOU
)

echo Commit remoto atual:
echo !REMOTE_SHA!

rem Verifica se o remoto ja e ancestral do local.
git merge-base --is-ancestor origin/main main >nul 2>nul
if not errorlevel 1 (
  echo [OK] Historicos compativeis. Push normal sera usado.
  set "MODO_PUSH=NORMAL"
) else (
  echo.
  echo [INFO] O repositorio remoto possui um historico anterior independente.
  echo        Isso ocorreu nas primeiras tentativas de configuracao.
  echo.
  echo O commit remoto sera preservado antes da atualizacao.

  rem Nome fixo + SHA curto evita depender de data/hora e evita colisao.
  set "SHA_CURTO=!REMOTE_SHA:~0,8!"
  set "BACKUP_BRANCH=backup/pre-consolidacao-!SHA_CURTO!"

  git show-ref --verify --quiet "refs/heads/!BACKUP_BRANCH!"
  if errorlevel 1 (
    git branch "!BACKUP_BRANCH!" origin/main
    if errorlevel 1 (
      echo [ERRO] Nao foi possivel criar backup local.
      goto :FALHOU
    )
  )

  echo Criando backup remoto:
  echo !BACKUP_BRANCH!

  git push origin "!BACKUP_BRANCH!:!BACKUP_BRANCH!"
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel preservar o main remoto em backup.
    echo O main NAO foi alterado.
    goto :FALHOU
  )

  echo [OK] Historico remoto preservado.
  set "MODO_PUSH=FORCE_LEASE"
)

rem ============================================================
rem PUSH
rem ============================================================
echo.
echo [7/9] Atualizando main...

if "!MODO_PUSH!"=="NORMAL" (
  git push -u origin main
) else (
  echo Usando force-with-lease protegido pelo SHA:
  echo !REMOTE_SHA!
  git push ^
    --force-with-lease=main:!REMOTE_SHA! ^
    -u origin main
)

if errorlevel 1 (
  echo.
  echo [ERRO] O main nao foi atualizado.
  echo.
  echo Nenhuma sobrescrita insegura foi realizada.
  echo Se outra alteracao chegou ao GitHub durante o processo,
  echo execute este BAT novamente.
  goto :FALHOU
)

echo [OK] main atualizado.
echo.

rem ============================================================
rem CONFIRMAR WORKFLOW NO REMOTO
rem ============================================================
echo [8/9] Iniciando GitHub Actions...

if not exist ".github\workflows\apk-homologacao.yml" (
  echo [ERRO] Workflow local nao encontrado.
  goto :FALHOU
)

"%GH_EXE%" workflow run "apk-homologacao.yml" --ref main --repo "%REPO%"
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel iniciar o workflow.
  echo Workflows disponiveis:
  "%GH_EXE%" workflow list --repo "%REPO%"
  goto :FALHOU
)

echo Aguardando o GitHub registrar a execucao...
timeout /t 8 /nobreak >nul

set "RUN_ID="
set "TMP_RUN=%TEMP%\delivery-hub-run-%RANDOM%.txt"

"%GH_EXE%" run list ^
  --repo "%REPO%" ^
  --workflow "apk-homologacao.yml" ^
  --limit 1 ^
  --json databaseId ^
  --jq ".[0].databaseId" > "%TMP_RUN%" 2>nul

if not errorlevel 1 set /p "RUN_ID="<"%TMP_RUN%"
del /q "%TMP_RUN%" >nul 2>nul

if not defined RUN_ID (
  echo [ERRO] O RUN_ID nao foi localizado.
  "%GH_EXE%" run list --repo "%REPO%" --workflow "apk-homologacao.yml"
  goto :FALHOU
)

echo.
echo Acompanhando build #!RUN_ID!...
"%GH_EXE%" run watch "!RUN_ID!" --repo "%REPO%" --exit-status
if errorlevel 1 (
  echo.
  echo [INFO] O acompanhamento em tempo real foi interrompido.
  echo        Isso pode ser apenas uma oscilacao da internet local.
  echo        Confirmando o resultado diretamente no GitHub...
  call :AGUARDAR_RESULTADO_RUN "!RUN_ID!"
  if errorlevel 2 (
    echo.
    echo [ATENCAO] Nao foi possivel consultar o GitHub apos varias tentativas.
    echo O workflow pode continuar executando normalmente no GitHub.
    echo Run: !RUN_ID!
    goto :FALHOU
  )
  if errorlevel 1 (
    echo.
    echo [ERRO] O GitHub confirmou falha no build do APK.
    echo Abrindo detalhes...
    "%GH_EXE%" run view "!RUN_ID!" --repo "%REPO%" --web
    goto :FALHOU
  )
  echo [OK] GitHub confirmou build concluido com sucesso.
)

rem ============================================================
rem DOWNLOAD
rem ============================================================
echo.
echo [9/9] Baixando APK...

if not exist "%RAIZ%\APK" mkdir "%RAIZ%\APK"

"%GH_EXE%" run download "!RUN_ID!" ^
  --repo "%REPO%" ^
  --name "DeliveryHub-Homologacao" ^
  --dir "%RAIZ%\APK"

if errorlevel 1 (
  echo [ERRO] O build terminou, mas o APK nao foi baixado.
  goto :FALHOU
)

echo.
echo ============================================================
echo [OK] APK DE HOMOLOGACAO GERADO
echo ============================================================
echo.
echo Projeto:
echo %REPO%
echo.
echo Pasta:
echo %RAIZ%\APK
echo.
echo Se houve consolidacao de historico, a versao anterior foi
echo preservada em uma branch backup/pre-consolidacao-XXXXXXXX.
echo.
start "" "%RAIZ%\APK"

popd
pause
exit /b 0


:AGUARDAR_RESULTADO_RUN
setlocal EnableDelayedExpansion
set "RUN_CONSULTA=%~1"
set /a TENTATIVA_RUN=0

:CONSULTAR_RESULTADO_RUN
set /a TENTATIVA_RUN+=1
set "STATUS_RUN="
set "CONCLUSAO_RUN="
set "TMP_STATUS=%TEMP%\delivery-hub-status-%RANDOM%.txt"
set "TMP_CONCLUSAO=%TEMP%\delivery-hub-conclusao-%RANDOM%.txt"

"%GH_EXE%" run view "%RUN_CONSULTA%" --repo "%REPO%" --json status --jq .status > "%TMP_STATUS%" 2>nul
if not errorlevel 1 set /p "STATUS_RUN="<"%TMP_STATUS%"

"%GH_EXE%" run view "%RUN_CONSULTA%" --repo "%REPO%" --json conclusion --jq .conclusion > "%TMP_CONCLUSAO%" 2>nul
if not errorlevel 1 set /p "CONCLUSAO_RUN="<"%TMP_CONCLUSAO%"

del /q "%TMP_STATUS%" >nul 2>nul
del /q "%TMP_CONCLUSAO%" >nul 2>nul

if /I "!STATUS_RUN!"=="completed" (
  if /I "!CONCLUSAO_RUN!"=="success" (
    endlocal & exit /b 0
  )
  endlocal & exit /b 1
)

if !TENTATIVA_RUN! GEQ 60 (
  endlocal & exit /b 2
)

echo GitHub ainda executando ou temporariamente inacessivel. Tentativa !TENTATIVA_RUN!/60...
timeout /t 10 /nobreak >nul
goto :CONSULTAR_RESULTADO_RUN


:ERRO_LOGIN
echo.
echo [ERRO] Login GitHub nao confirmado.
goto :FALHOU

:FALHOU
popd
echo.
echo O processo foi interrompido sem apagar o projeto.
pause
exit /b 1

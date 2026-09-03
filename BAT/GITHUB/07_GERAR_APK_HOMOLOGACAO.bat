@echo off
setlocal EnableExtensions EnableDelayedExpansion

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"

cls
echo ============================================================
echo  DELIVERY HUB - ENVIAR PROJETO E GERAR APK
echo ============================================================
echo.
echo Este BAT foi preparado para o repositorio:
echo   allangomess16-stack/delivery-hub
echo.
echo Ele:
echo   1. confirma o login GitHub;
echo   2. conecta o projeto ao repositorio existente;
echo   3. valida e envia a branch main;
echo   4. inicia o GitHub Actions;
echo   5. baixa o APK de homologacao.
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
  echo.
  echo Este BAT deve ficar em:
  echo BAT\GITHUB\07_GERAR_APK_HOMOLOGACAO.bat
  pause
  exit /b 1
)

pushd "%RAIZ%"

rem ============================================================
rem LOGIN
rem ============================================================
set "GH_TOKEN="
set "GITHUB_TOKEN="

echo [1/8] Confirmando login GitHub...
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
rem REPOSITORIO EXISTENTE
rem ============================================================
echo.
echo [2/8] Confirmando repositorio remoto...

set "REPO=allangomess16-stack/delivery-hub"
set "REPO_URL=https://github.com/allangomess16-stack/delivery-hub.git"
set "TMP_REPO=%TEMP%\delivery-hub-repo-%RANDOM%.txt"

"%GH_EXE%" repo view "%REPO%" --json nameWithOwner --jq .nameWithOwner > "%TMP_REPO%" 2>nul
if errorlevel 1 (
  del /q "%TMP_REPO%" >nul 2>nul
  echo.
  echo [ERRO] O repositorio %REPO% nao foi encontrado pela GitHub CLI.
  echo O login esta correto; verifique permissao da conta.
  goto :FALHOU
)

set "REPO_CONFIRMADO="
set /p "REPO_CONFIRMADO="<"%TMP_REPO%"
del /q "%TMP_REPO%" >nul 2>nul

echo [OK] !REPO_CONFIRMADO!

rem ============================================================
rem DEPENDENCIAS / VALIDACAO
rem ============================================================
echo.
echo [3/8] Preparando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo [ERRO] npm install falhou.
  goto :FALHOU
)

echo.
echo [4/8] Validando projeto...
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
rem GIT LOCAL
rem ============================================================
echo.
echo [5/8] Preparando Git...

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
    echo [INFO] Ajustando origin existente:
    echo        !ORIGIN_ATUAL!
    echo     -^> %REPO_URL%
    git remote set-url origin "%REPO_URL%"
    if errorlevel 1 (
      echo [ERRO] Nao foi possivel corrigir origin.
      goto :FALHOU
    )
  )
)

rem Identidade Git local
set "GIT_NOME="
set "GIT_EMAIL="
git config --local user.name > "%TEMP%\dh-git-name-%RANDOM%.txt" 2>nul
for %%F in ("%TEMP%\dh-git-name-*.txt") do (
  if exist "%%F" (
    set /p "GIT_NOME="<"%%F"
    del /q "%%F" >nul 2>nul
  )
)
git config --local user.email > "%TEMP%\dh-git-email-%RANDOM%.txt" 2>nul
for %%F in ("%TEMP%\dh-git-email-*.txt") do (
  if exist "%%F" (
    set /p "GIT_EMAIL="<"%%F"
    del /q "%%F" >nul 2>nul
  )
)

if not defined GIT_NOME git config --local user.name "allangomess16-stack"
if not defined GIT_EMAIL git config --local user.email "241206720+allangomess16-stack@users.noreply.github.com"

rem ============================================================
rem COMMIT / PUSH
rem ============================================================
echo.
echo [6/8] Enviando projeto ao GitHub...

git add .
if errorlevel 1 (
  echo [ERRO] git add falhou.
  goto :FALHOU
)

git diff --cached --quiet
if errorlevel 1 (
  set "VERSAO="
  set "TMP_VERSAO=%TEMP%\delivery-hub-versao-%RANDOM%.txt"
  node -p "require('./package.json').version" > "!TMP_VERSAO!" 2>nul
  if not errorlevel 1 set /p "VERSAO="<"!TMP_VERSAO!"
  del /q "!TMP_VERSAO!" >nul 2>nul
  if not defined VERSAO set "VERSAO=atual"

  git commit -m "chore: preparar homologacao Delivery Hub v!VERSAO!"
  if errorlevel 1 (
    echo [ERRO] git commit falhou.
    goto :FALHOU
  )
) else (
  echo [OK] Nenhuma alteracao nova para commit.
)

git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERRO] Push para o GitHub falhou.
  echo Veja a mensagem do Git acima.
  goto :FALHOU
)

echo [OK] Projeto enviado para %REPO%.

rem ============================================================
rem WORKFLOW
rem ============================================================
echo.
echo [7/8] Iniciando compilacao do APK...

if not exist ".github\workflows\apk-homologacao.yml" (
  echo.
  echo [ERRO] Workflow nao encontrado:
  echo .github\workflows\apk-homologacao.yml
  echo.
  echo Copie o arquivo de workflow fornecido junto com este BAT
  echo antes de executar novamente.
  goto :FALHOU
)

rem Garante que o workflow mais recente foi enviado
git add ".github\workflows\apk-homologacao.yml"
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "ci: ajustar build APK homologacao"
  if errorlevel 1 goto :FALHOU
  git push origin main
  if errorlevel 1 goto :FALHOU
)

"%GH_EXE%" workflow run "apk-homologacao.yml" --ref main --repo "%REPO%"
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel iniciar o GitHub Actions.
  echo.
  echo Verificando workflows disponiveis:
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
  echo.
  echo [ERRO] A execucao foi solicitada, mas o RUN_ID nao apareceu.
  "%GH_EXE%" run list --repo "%REPO%" --workflow "apk-homologacao.yml"
  goto :FALHOU
)

echo.
echo Acompanhando GitHub Actions #!RUN_ID!...
"%GH_EXE%" run watch "!RUN_ID!" --repo "%REPO%" --exit-status
if errorlevel 1 (
  echo.
  echo [ERRO] O build falhou.
  echo Abrindo detalhes no navegador...
  "%GH_EXE%" run view "!RUN_ID!" --repo "%REPO%" --web
  goto :FALHOU
)

rem ============================================================
rem DOWNLOAD
rem ============================================================
echo.
echo [8/8] Baixando APK...

if not exist "%RAIZ%\APK" mkdir "%RAIZ%\APK"

"%GH_EXE%" run download "!RUN_ID!" ^
  --repo "%REPO%" ^
  --name "DeliveryHub-Homologacao" ^
  --dir "%RAIZ%\APK"

if errorlevel 1 (
  echo.
  echo [ERRO] O build terminou, mas o APK nao foi baixado.
  goto :FALHOU
)

echo.
echo ============================================================
echo [OK] APK DE HOMOLOGACAO GERADO
echo ============================================================
echo.
echo Pasta:
echo %RAIZ%\APK
echo.
echo Esse e o arquivo que pode ser enviado ao socio.
echo.
start "" "%RAIZ%\APK"

popd
pause
exit /b 0

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

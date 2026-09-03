@echo off
setlocal EnableExtensions EnableDelayedExpansion

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"

cls
echo ============================================================
echo  DELIVERY HUB - CONFIGURAR REPOSITORIO GITHUB
echo ============================================================
echo.
echo Este BAT nao grava senha ou token no projeto.
echo.

rem ------------------------------------------------------------
rem 1. Localizar GitHub CLI sem guardar aspas dentro da variavel
rem ------------------------------------------------------------
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
  echo [ERRO] GitHub CLI ^(gh^) nao foi encontrada.
  echo.
  echo Instale a GitHub CLI e execute novamente.
  echo https://cli.github.com/
  pause
  exit /b 1
)

echo [OK] GitHub CLI:
echo %GH_EXE%
echo.

rem ------------------------------------------------------------
rem 2. Verificar Git / Node / NPM
rem ------------------------------------------------------------
where git.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao foi encontrado no PATH.
  pause
  exit /b 1
)

where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] NPM nao foi encontrado no PATH.
  pause
  exit /b 1
)

rem ------------------------------------------------------------
rem 3. Login GitHub
rem ------------------------------------------------------------
set "GH_TOKEN="
set "GITHUB_TOKEN="

echo [1/7] Verificando login GitHub...
"%GH_EXE%" auth status --hostname github.com
if errorlevel 1 (
  echo.
  echo Login necessario. Abrindo autenticacao oficial...
  "%GH_EXE%" auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 (
    echo.
    echo [ERRO] Login GitHub nao foi concluido.
    pause
    exit /b 1
  )

  "%GH_EXE%" auth status --hostname github.com
  if errorlevel 1 (
    echo.
    echo [ERRO] A GitHub CLI ainda nao confirmou a autenticacao.
    pause
    exit /b 1
  )
)

"%GH_EXE%" auth setup-git >nul 2>nul

rem ------------------------------------------------------------
rem 4. Obter usuario - apenas informativo, sem FOR /F com gh.exe
rem ------------------------------------------------------------
echo.
echo [2/7] Identificando conta...
set "GITHUB_LOGIN="
set "GITHUB_ID="
set "TMP_LOGIN=%TEMP%\delivery-hub-gh-login-%RANDOM%.txt"
set "TMP_ID=%TEMP%\delivery-hub-gh-id-%RANDOM%.txt"

"%GH_EXE%" api user --jq .login > "%TMP_LOGIN%" 2>nul
if not errorlevel 1 set /p "GITHUB_LOGIN="<"%TMP_LOGIN%"

"%GH_EXE%" api user --jq .id > "%TMP_ID%" 2>nul
if not errorlevel 1 set /p "GITHUB_ID="<"%TMP_ID%"

del /q "%TMP_LOGIN%" >nul 2>nul
del /q "%TMP_ID%" >nul 2>nul

if defined GITHUB_LOGIN (
  echo [OK] Conta: !GITHUB_LOGIN!
) else (
  echo [OK] Login confirmado pela GitHub CLI.
  echo [INFO] O nome da conta nao foi necessario para continuar.
)

rem ------------------------------------------------------------
rem 5. Entrar na raiz do projeto
rem ------------------------------------------------------------
if not exist "%RAIZ%\package.json" (
  echo.
  echo [ERRO] package.json nao encontrado em:
  echo %RAIZ%
  echo.
  echo Coloque este BAT em:
  echo BAT\GITHUB\01_CONFIGURAR_REPOSITORIO.bat
  pause
  exit /b 1
)

pushd "%RAIZ%"

echo.
echo [3/7] Preparando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (
  popd
  echo [ERRO] npm install falhou.
  pause
  exit /b 1
)

echo.
echo [4/7] Validando projeto...
call npm run validate
if errorlevel 1 (
  popd
  echo [ERRO] A validacao do projeto falhou.
  pause
  exit /b 1
)

call npm run test
if errorlevel 1 (
  popd
  echo [ERRO] Os testes do projeto falharam.
  pause
  exit /b 1
)

rem ------------------------------------------------------------
rem 6. Inicializar Git
rem ------------------------------------------------------------
echo.
echo [5/7] Preparando Git...

if not exist ".git" (
  git init
  if errorlevel 1 (
    popd
    echo [ERRO] git init falhou.
    pause
    exit /b 1
  )
)

git branch -M main

set "GIT_NOME="
set "GIT_EMAIL="

for /f "delims=" %%N in ('git config --local user.name 2^>nul') do set "GIT_NOME=%%N"
for /f "delims=" %%E in ('git config --local user.email 2^>nul') do set "GIT_EMAIL=%%E"

if not defined GIT_NOME (
  if defined GITHUB_LOGIN (
    git config --local user.name "!GITHUB_LOGIN!"
  ) else (
    git config --local user.name "Delivery Hub"
  )
)

if not defined GIT_EMAIL (
  if defined GITHUB_ID if defined GITHUB_LOGIN (
    git config --local user.email "!GITHUB_ID!+!GITHUB_LOGIN!@users.noreply.github.com"
  ) else (
    git config --local user.email "delivery-hub@users.noreply.github.com"
  )
)

git add .
if errorlevel 1 (
  popd
  echo [ERRO] git add falhou.
  pause
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  set "VERSAO="
  for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "VERSAO=%%V"
  if not defined VERSAO set "VERSAO=atual"

  git commit -m "chore: preparar Delivery Hub v!VERSAO!"
  if errorlevel 1 (
    popd
    echo [ERRO] Nao foi possivel criar o commit.
    pause
    exit /b 1
  )
) else (
  echo [OK] Nao existem alteracoes novas para commit.
)

rem ------------------------------------------------------------
rem 7. Configurar/criar remoto
rem ------------------------------------------------------------
echo.
echo [6/7] Configurando repositorio remoto...

set "ORIGIN="
set "TMP_ORIGIN=%TEMP%\delivery-hub-origin-%RANDOM%.txt"
git remote get-url origin > "%TMP_ORIGIN%" 2>nul
if not errorlevel 1 set /p "ORIGIN="<"%TMP_ORIGIN%"
del /q "%TMP_ORIGIN%" >nul 2>nul

if defined ORIGIN (
  echo [OK] Remote origin ja configurado:
  echo !ORIGIN!
) else (
  set "REPO_NOME=delivery-hub"
  echo.
  set /p "REPO_NOME=Nome do repositorio [delivery-hub]: "
  if not defined REPO_NOME set "REPO_NOME=delivery-hub"

  echo.
  echo Visibilidade:
  echo   P = Privado ^(recomendado^)
  echo   U = Publico
  echo.
  choice /C PU /N /M "Escolha [P/U]: "

  if errorlevel 2 (
    set "VISIBILIDADE=public"
  ) else (
    set "VISIBILIDADE=private"
  )

  echo.
  echo Criando repositorio "!REPO_NOME!" como !VISIBILIDADE!...
  "%GH_EXE%" repo create "!REPO_NOME!" ^
    --!VISIBILIDADE! ^
    --source . ^
    --remote origin

  if errorlevel 1 (
    echo.
    echo [ATENCAO] Nao foi possivel criar automaticamente.
    echo Verificando se o repositorio ja existe na sua conta...

    if defined GITHUB_LOGIN (
      "%GH_EXE%" repo view "!GITHUB_LOGIN!/!REPO_NOME!" >nul 2>nul
      if not errorlevel 1 (
        git remote add origin "https://github.com/!GITHUB_LOGIN!/!REPO_NOME!.git"
      )
    )
  )

  git remote get-url origin >nul 2>nul
  if errorlevel 1 (
    popd
    echo.
    echo [ERRO] O remote origin ainda nao foi configurado.
    echo.
    echo O login esta correto; o problema agora e somente a criacao
    echo ou localizacao do repositorio.
    pause
    exit /b 1
  )
)

echo.
echo [7/7] Enviando main ao GitHub...
git push -u origin main
if errorlevel 1 (
  popd
  echo.
  echo [ERRO] Nao foi possivel enviar a branch main.
  echo.
  echo Verifique a mensagem do Git acima.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo [OK] REPOSITORIO GITHUB CONFIGURADO
echo ============================================================
echo.

set "TMP_FINAL=%TEMP%\delivery-hub-origin-final-%RANDOM%.txt"
git remote get-url origin > "%TMP_FINAL%" 2>nul
set "ORIGIN_FINAL="
set /p "ORIGIN_FINAL="<"%TMP_FINAL%"
del /q "%TMP_FINAL%" >nul 2>nul

if defined ORIGIN_FINAL echo Remote: !ORIGIN_FINAL!
echo Branch: main
echo.
echo Proximo passo para gerar o APK:
echo BAT\GITHUB\07_GERAR_APK_HOMOLOGACAO.bat
echo.

popd
pause
exit /b 0

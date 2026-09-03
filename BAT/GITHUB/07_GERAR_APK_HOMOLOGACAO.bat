@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_GITHUB.bat"
if errorlevel 1 ( pause & exit /b 1 )

pushd "%RAIZ%"

if not exist ".git" (
  echo [ERRO] GitHub ainda nao foi configurado neste projeto.
  echo Execute primeiro:
  echo BAT\GITHUB\01_CONFIGURAR_REPOSITORIO.bat
  popd
  pause
  exit /b 1
)

call "%RAIZ%\BAT\GITHUB\00_LOGIN_GITHUB.bat"
if errorlevel 1 (
  popd
  echo [ERRO] Login GitHub nao foi concluido.
  pause
  exit /b 1
)

set "GH_TOKEN="
set "GITHUB_TOKEN="

set "REPO="
for /f "delims=" %%R in ('"%GH_EXE%" repo view --json nameWithOwner --jq ".nameWithOwner"') do set "REPO=%%R"

if not defined REPO (
  echo [ERRO] Repositorio remoto nao identificado.
  popd
  pause
  exit /b 1
)

echo ============================================================
echo  DELIVERY HUB - APK HOMOLOGACAO VIA GITHUB
echo ============================================================
echo.
echo Repositorio: !REPO!
echo.
echo O GitHub ira compilar o APK em um runner Android.
echo Nenhum dado real de entrega sera usado.
echo.

echo [1/4] Enviando alteracoes pendentes...
git status --porcelain > "%TEMP%\delivery-hub-git-status.txt"
for %%A in ("%TEMP%\delivery-hub-git-status.txt") do set "STATUS_SIZE=%%~zA"
del /q "%TEMP%\delivery-hub-git-status.txt" >nul 2>nul

if not "!STATUS_SIZE!"=="0" (
  echo.
  echo Existem alteracoes locais ainda nao enviadas.
  echo Execute BAT\GITHUB\02_SALVAR_TRABALHO.bat e rode este BAT novamente.
  popd
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo [2/4] Iniciando workflow...
"%GH_EXE%" workflow run "apk-homologacao.yml" --ref main --repo "!REPO!"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel iniciar a compilacao.
  popd
  pause
  exit /b 1
)

echo Aguardando o GitHub registrar a execucao...
timeout /t 6 /nobreak >nul

set "RUN_ID="
for /f "delims=" %%R in ('"%GH_EXE%" run list --repo "!REPO!" --workflow "apk-homologacao.yml" --limit 1 --json databaseId --jq ".[0].databaseId"') do set "RUN_ID=%%R"

if not defined RUN_ID (
  echo [ERRO] Execucao do GitHub Actions nao foi localizada.
  popd
  pause
  exit /b 1
)

echo.
echo [3/4] Acompanhando build #%RUN_ID%...
"%GH_EXE%" run watch "!RUN_ID!" --repo "!REPO!" --exit-status
if errorlevel 1 (
  echo.
  echo [ERRO] O build falhou.
  echo Abrindo detalhes...
  "%GH_EXE%" run view "!RUN_ID!" --repo "!REPO!" --web
  popd
  pause
  exit /b 1
)

echo.
echo [4/4] Baixando APK...
if not exist "%RAIZ%\APK" mkdir "%RAIZ%\APK"

"%GH_EXE%" run download "!RUN_ID!" ^
  --repo "!REPO!" ^
  --name "DeliveryHub-Homologacao-v0.3.3" ^
  --dir "%RAIZ%\APK"

if errorlevel 1 (
  echo [ERRO] Build terminou, mas o artefato nao foi baixado.
  popd
  pause
  exit /b 1
)

echo.
echo ============================================================
echo [OK] APK BAIXADO
echo ============================================================
echo.
echo Pasta:
echo %RAIZ%\APK
echo.
start "" "%RAIZ%\APK"

popd
pause

@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_GITHUB.bat"
if errorlevel 1 ( pause & exit /b 1 )

pushd "%RAIZ%"

call "%RAIZ%\BAT\GITHUB\00_LOGIN_GITHUB.bat"
if errorlevel 1 (
  popd
  pause
  exit /b 1
)
set "GH_TOKEN="
set "GITHUB_TOKEN="

if not exist ".git" (
  popd
  echo [ERRO] Git ainda nao configurado.
  echo Execute 01_CONFIGURAR_REPOSITORIO.bat.
  pause
  exit /b 1
)

git status --short
echo.

set "MENSAGEM="
set /p "MENSAGEM=Descricao curta da alteracao: "
if not defined MENSAGEM (
  popd
  echo [ERRO] Informe uma descricao.
  pause
  exit /b 1
)

git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo [INFO] Nenhuma alteracao para salvar.
  popd
  pause
  exit /b 0
)

git commit -m "chore: !MENSAGEM!"
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
git push -u origin "!BRANCH!"

if errorlevel 1 (
  popd
  echo [ERRO] Commit criado localmente, mas push falhou.
  pause
  exit /b 1
)

echo.
echo [OK] Trabalho salvo no GitHub.
popd
pause

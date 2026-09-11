@echo off
if defined DELIVERY_HUB_GITHUB_COMUM exit /b 0
set "DELIVERY_HUB_GITHUB_COMUM=1"

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"
set "GH_EXE="

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao foi encontrado no Windows.
  echo Instale o Git for Windows antes de continuar.
  exit /b 1
)

where gh >nul 2>nul
if not errorlevel 1 (
  set "GH_EXE=gh"
  exit /b 0
)

if exist "%ProgramFiles%\GitHub CLI\gh.exe" (
  set "GH_EXE=%ProgramFiles%\GitHub CLI\gh.exe"
  exit /b 0
)

echo [INFO] GitHub CLI nao encontrada.

where winget >nul 2>nul
if errorlevel 1 (
  echo [ERRO] winget tambem nao esta disponivel.
  echo Instale GitHub CLI: https://cli.github.com/
  exit /b 1
)

echo.
choice /C SN /N /M "Instalar GitHub CLI automaticamente pelo winget? [S/N]: "
if errorlevel 2 exit /b 1

winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo [ERRO] A instalacao da GitHub CLI falhou.
  exit /b 1
)

if exist "%ProgramFiles%\GitHub CLI\gh.exe" (
  set "GH_EXE=%ProgramFiles%\GitHub CLI\gh.exe"
  exit /b 0
)

where gh >nul 2>nul
if not errorlevel 1 (
  set "GH_EXE=gh"
  exit /b 0
)

echo [ERRO] GitHub CLI foi instalada, mas ainda nao foi localizada.
echo Feche este prompt, abra outro e execute novamente.
exit /b 1

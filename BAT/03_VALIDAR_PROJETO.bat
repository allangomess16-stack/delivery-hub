@echo off
setlocal EnableExtensions
set "RAIZ=%~dp0.."
for %%I in ("%RAIZ%") do set "RAIZ=%%~fI"
cd /d "%RAIZ%" || (
  echo [ERRO] Nao foi possivel abrir a pasta do projeto.
  pause
  exit /b 1
)

cls
echo ============================================================
echo   DELIVERY HUB - VALIDAR PROJETO
echo ============================================================
echo.

call "%~dp002_PREPARAR_AMBIENTE.bat" /interno
if errorlevel 1 (
  echo.
  echo [ERRO] Preparacao falhou.
  pause
  exit /b 1
)

echo.
echo Executando TypeScript + testes + build...
call npm run check
if errorlevel 1 (
  echo.
  echo [ERRO] Validacao falhou.
  pause
  exit /b 1
)

echo.
echo [OK] Projeto validado.
pause

@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_GITHUB.bat"
if errorlevel 1 ( pause & exit /b 1 )

pushd "%RAIZ%"

if not exist ".git" (
  echo [ERRO] Git ainda nao configurado.
  popd
  pause
  exit /b 1
)

git diff --quiet
if errorlevel 1 (
  echo [ERRO] Existem alteracoes locais nao salvas.
  echo Use 02_SALVAR_TRABALHO.bat antes de atualizar.
  popd
  pause
  exit /b 1
)

git pull --ff-only
if errorlevel 1 (
  echo.
  echo [ERRO] Atualizacao nao pode ser aplicada automaticamente.
  popd
  pause
  exit /b 1
)

echo.
echo [OK] Projeto local atualizado.
popd
pause

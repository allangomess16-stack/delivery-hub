@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_GITHUB.bat"
if errorlevel 1 ( pause & exit /b 1 )

pushd "%RAIZ%"

if not exist ".git" (
  echo [ERRO] Git ainda nao configurado.
  popd
  pause
  exit /b 1
)

set "NOME="
set /p "NOME=Nome curto da branch (ex.: scanner-nativo): "
if not defined NOME (
  popd
  exit /b 1
)

set "NOME=!NOME: =-!"
set "BRANCH=feature/!NOME!"

git switch -c "!BRANCH!"
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

git push -u origin "!BRANCH!"
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo [OK] Branch criada: !BRANCH!
popd
pause

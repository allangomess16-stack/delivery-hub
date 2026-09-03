@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_GITHUB.bat"
if errorlevel 1 ( pause & exit /b 1 )

pushd "%RAIZ%"

if not exist ".git" (
  echo Git ainda nao configurado.
  popd
  pause
  exit /b 1
)

echo ============================================================
echo  DELIVERY HUB - STATUS GITHUB
echo ============================================================
echo.

echo Branch:
git branch --show-current
echo.

echo Remote:
git remote -v
echo.

echo Alteracoes:
git status --short
echo.

echo Ultimos commits:
git --no-pager log --oneline -5
echo.

echo Ultimas tags:
git tag --sort=-version:refname | more +0
echo.

popd
pause

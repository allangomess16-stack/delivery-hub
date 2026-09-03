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
  pause
  exit /b 1
)

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if /I not "!BRANCH!"=="main" (
  echo [ERRO] Publicacao de versao deve ocorrer na branch main.
  echo Branch atual: !BRANCH!
  popd
  pause
  exit /b 1
)

echo ============================================================
echo  DELIVERY HUB - PUBLICAR VERSAO
echo ============================================================
echo.

echo [1/5] Validando projeto...
call "%RAIZ%\BAT\03_VALIDAR_PROJETO.bat" /interno
if errorlevel 1 (
  popd
  echo [ERRO] Versao nao sera publicada.
  pause
  exit /b 1
)

set "VERSAO="
for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "VERSAO=%%V"

if not defined VERSAO (
  popd
  echo [ERRO] Versao nao encontrada.
  pause
  exit /b 1
)

git rev-parse "v!VERSAO!" >nul 2>nul
if not errorlevel 1 (
  popd
  echo [ERRO] A tag v!VERSAO! ja existe.
  echo Atualize a versao no package.json antes de publicar outra release.
  pause
  exit /b 1
)

echo.
echo [2/5] Commit de release...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "release: v!VERSAO!"
  if errorlevel 1 (
    popd
    pause
    exit /b 1
  )
)

echo.
echo [3/5] Enviando main...
git push origin main
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo [4/5] Criando tag v!VERSAO!...
git tag -a "v!VERSAO!" -m "Delivery Hub v!VERSAO!"
git push origin "v!VERSAO!"
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo [5/5] Criando GitHub Release...
"%GH_EXE%" release create "v!VERSAO!" ^
  --title "Delivery Hub v!VERSAO!" ^
  --generate-notes

if errorlevel 1 (
  echo [ATENCAO] Codigo e tag foram publicados, mas a pagina Release nao foi criada.
) else (
  echo [OK] GitHub Release criada.
)

echo.
echo [OK] Delivery Hub v!VERSAO! publicado.
popd
pause

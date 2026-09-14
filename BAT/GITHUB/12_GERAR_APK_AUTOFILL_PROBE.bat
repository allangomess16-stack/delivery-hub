@echo off
setlocal EnableExtensions EnableDelayedExpansion

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"
set "REPO=allangomess16-stack/delivery-hub"
set "BRANCH=v0591-autofill-probe"

cls
echo ============================================================
echo  DELIVERY HUB - GERAR APK AUTOFILL PROBE
echo ============================================================
echo.
echo Esta versao e somente de diagnostico da iMile.
echo Ela nao habilita Acessibilidade e nao preenche campos.
echo.

set "GH_EXE="
set "TMP_GH=%TEMP%\deliveryhub-gh-%RANDOM%.txt"
where gh.exe > "%TMP_GH%" 2>nul
if not errorlevel 1 set /p "GH_EXE="<"%TMP_GH%"
del /q "%TMP_GH%" >nul 2>nul
if not defined GH_EXE if exist "%ProgramFiles%\GitHub CLI\gh.exe" set "GH_EXE=%ProgramFiles%\GitHub CLI\gh.exe"
if not defined GH_EXE if exist "%LOCALAPPDATA%\Programs\GitHub CLI\gh.exe" set "GH_EXE=%LOCALAPPDATA%\Programs\GitHub CLI\gh.exe"

if not defined GH_EXE (
  echo [ERRO] GitHub CLI nao encontrada.
  pause
  exit /b 1
)
if not exist "%RAIZ%\package.json" (
  echo [ERRO] package.json nao encontrado.
  echo Este BAT deve ficar em BAT\GITHUB.
  pause
  exit /b 1
)

pushd "%RAIZ%"
set "TMP_STATUS=%TEMP%\deliveryhub-status-%RANDOM%.txt"
git status --porcelain > "%TMP_STATUS%"
set "TEM_ALTERACAO="
for /f "usebackq delims=" %%A in ("%TMP_STATUS%") do set "TEM_ALTERACAO=1"
del /q "%TMP_STATUS%" >nul 2>nul
if defined TEM_ALTERACAO (
  echo [ERRO] Existem alteracoes locais. Este BAT nao publica nem sobrescreve arquivos.
  echo Salve ou descarte suas alteracoes antes de continuar.
  popd
  pause
  exit /b 1
)

echo [1/6] Atualizando a branch de diagnostico...
git pull --ff-only origin "%BRANCH%"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel atualizar a base de diagnostico.
  echo Nao force o Git. Envie esta tela para analise.
  popd
  pause
  exit /b 1
)

echo [2/6] Confirmando login GitHub...
"%GH_EXE%" auth status --hostname github.com
if errorlevel 1 (
  echo [ERRO] Faca login com BAT\GITHUB\00_LOGIN_GITHUB.bat e tente novamente.
  popd
  pause
  exit /b 1
)

echo [3/6] Validando o projeto...
call npm install --no-audit --no-fund
if errorlevel 1 goto :FALHOU
call npm run validate
if errorlevel 1 goto :FALHOU
call npm run test
if errorlevel 1 goto :FALHOU

echo [4/6] Iniciando GitHub Actions na branch de diagnostico...
"%GH_EXE%" workflow run "apk-homologacao.yml" --repo "%REPO%" --ref "%BRANCH%"
if errorlevel 1 goto :FALHOU

timeout /t 6 /nobreak >nul
set "RUN_ID="
set "TMP_RUN=%TEMP%\deliveryhub-autofill-run-%RANDOM%.txt"
"%GH_EXE%" run list --repo "%REPO%" --workflow "apk-homologacao.yml" --branch "%BRANCH%" --limit 1 --json databaseId --jq ".[0].databaseId" > "%TMP_RUN%" 2>nul
if not errorlevel 1 set /p "RUN_ID="<"%TMP_RUN%"
del /q "%TMP_RUN%" >nul 2>nul
if not defined RUN_ID (
  echo [ERRO] O GitHub nao retornou o identificador da compilacao.
  goto :FALHOU
)

echo [5/6] Acompanhando build #!RUN_ID!...
"%GH_EXE%" run watch "!RUN_ID!" --repo "%REPO%" --exit-status
if errorlevel 1 (
  echo [ERRO] O GitHub informou falha na compilacao.
  "%GH_EXE%" run view "!RUN_ID!" --repo "%REPO%" --web
  goto :FALHOU
)

echo [6/6] Baixando APK...
set "TEMP_DOWNLOAD=%TEMP%\deliveryhub-autofill-apk-!RUN_ID!"
if exist "!TEMP_DOWNLOAD!" rmdir /s /q "!TEMP_DOWNLOAD!"
mkdir "!TEMP_DOWNLOAD!"
if not exist "%RAIZ%\APK" mkdir "%RAIZ%\APK"

"%GH_EXE%" run download "!RUN_ID!" --repo "%REPO%" --name "DeliveryHub-Homologacao" --dir "!TEMP_DOWNLOAD!"
if errorlevel 1 (
  if exist "!TEMP_DOWNLOAD!" rmdir /s /q "!TEMP_DOWNLOAD!"
  goto :FALHOU
)

set "APK_OK="
for /r "!TEMP_DOWNLOAD!" %%F in (*.apk) do (
  copy /Y "%%~fF" "%RAIZ%\APK\" >nul
  set "APK_OK=1"
)
if exist "!TEMP_DOWNLOAD!" rmdir /s /q "!TEMP_DOWNLOAD!"
if not defined APK_OK (
  echo [ERRO] O artefato foi baixado, mas nenhum APK foi localizado.
  goto :FALHOU
)

echo.
echo ============================================================
echo [OK] APK AUTOFILL PROBE GERADO
echo ============================================================
echo.
echo Instale o APK manualmente e depois execute:
echo BAT\ANDROID\11_TESTAR_AUTOFILL_IMILE.bat
echo.
start "" "%RAIZ%\APK"
popd
pause
exit /b 0

:FALHOU
echo.
echo O processo foi interrompido sem alterar a branch main.
popd
pause
exit /b 1

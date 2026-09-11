@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_GITHUB.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

cls
echo ============================================================
echo  DELIVERY HUB - LOGIN GITHUB
echo ============================================================
echo.
echo A conexao GitHub do ChatGPT e independente da GitHub CLI
echo instalada neste computador.
echo.
echo Este BAT usa somente a GitHub CLI oficial.
echo Nenhuma senha ou token e gravado no projeto.
echo.

rem Tokens definidos no ambiente podem ter prioridade sobre o keyring.
rem Para este projeto queremos usar a conta persistida pelo "gh auth login".
set "GH_TOKEN="
set "GITHUB_TOKEN="

echo [1/4] Verificando autenticacao atual...
"%GH_EXE%" auth status --hostname github.com
if not errorlevel 1 goto :AUTENTICADO

echo.
echo [2/4] Login pelo navegador...
echo.
echo Se aparecer um codigo temporario:
echo   1. copie o codigo;
echo   2. abra/autorize no navegador;
echo   3. volte para esta janela.
echo.

"%GH_EXE%" auth login ^
  --hostname github.com ^
  --git-protocol https ^
  --web

if errorlevel 1 (
  echo.
  echo [ERRO] O login nao foi concluido.
  pause
  exit /b 1
)

echo.
echo Confirmando novamente...
"%GH_EXE%" auth status --hostname github.com
if errorlevel 1 (
  echo.
  echo [ERRO] A GitHub CLI ainda informa que nao esta autenticada.
  pause
  exit /b 1
)

:AUTENTICADO
echo.
echo [3/4] Configurando Git para usar a GitHub CLI...
"%GH_EXE%" auth setup-git
if errorlevel 1 (
  echo [ATENCAO] O login esta valido, mas "gh auth setup-git" retornou aviso.
  echo O restante do processo continuara.
)

echo.
echo [4/4] Identificando conta...
set "LOGIN_GITHUB="
set "TMP_LOGIN=%TEMP%\delivery-hub-gh-login-%RANDOM%.txt"

"%GH_EXE%" api user --jq .login > "%TMP_LOGIN%" 2>nul
if not errorlevel 1 (
  set /p "LOGIN_GITHUB="<"%TMP_LOGIN%"
)
del /q "%TMP_LOGIN%" >nul 2>nul

echo.
echo ============================================================
echo [OK] GITHUB AUTENTICADO
echo ============================================================
echo.
if defined LOGIN_GITHUB (
  echo Conta: %LOGIN_GITHUB%
) else (
  echo Conta: autenticada no GitHub CLI
  echo [INFO] A API nao retornou o login para exibicao, mas
  echo        "gh auth status" confirmou a autenticacao.
)
echo.
echo Agora voce pode executar:
echo   01_CONFIGURAR_REPOSITORIO.bat
echo.
echo ou, se o repositorio ja estiver configurado:
echo   07_GERAR_APK_HOMOLOGACAO.bat
echo.
exit /b 0

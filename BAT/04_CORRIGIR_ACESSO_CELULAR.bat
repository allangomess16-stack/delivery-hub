@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "REGRA=Delivery Hub - Porta 5173"
set "PORTA=5173"

if /I "%~1"=="/firewall" goto :FIREWALL

cls
echo ============================================================
echo   DELIVERY HUB - ACESSO PELO CELULAR
echo ============================================================
echo.
echo Este assistente libera a porta %PORTA% somente em redes privadas
echo e depois executa um diagnostico da rede.
echo.
choice /C SN /N /M "Continuar? [S/N]: "
if errorlevel 2 exit /b 0

echo.
echo [1/2] Configurando Firewall...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process -FilePath 'cmd.exe' -Verb RunAs -Wait -ArgumentList '/c ""%~f0"" /firewall'"
if errorlevel 1 (
  echo [ATENCAO] A configuracao do Firewall pode nao ter sido concluida.
)

echo.
echo [2/2] Diagnostico...
call :DIAGNOSTICO
echo.
pause
exit /b 0

:FIREWALL
netsh advfirewall firewall delete rule name="%REGRA%" >nul 2>nul
netsh advfirewall firewall add rule ^
  name="%REGRA%" ^
  dir=in ^
  action=allow ^
  protocol=TCP ^
  localport=%PORTA% ^
  profile=private ^
  enable=yes
exit /b %errorlevel%

:DIAGNOSTICO
set "IP_PREF="
for /f "tokens=4" %%I in ('route print -4 0.0.0.0 ^| findstr /R /C:"^[ ]*0\.0\.0\.0[ ]*0\.0\.0\.0"') do (
  if not defined IP_PREF set "IP_PREF=%%I"
)

echo.
echo IP preferencial:
if defined IP_PREF (echo   !IP_PREF!) else (echo   Nao identificado.)

echo.
echo IPv4 detectados:
ipconfig | findstr /I /C:"IPv4"

echo.
echo Porta %PORTA%:
netstat -ano | findstr /R /C:":%PORTA% .*LISTENING" >nul 2>nul
if errorlevel 1 (
  echo   [ERRO] Servidor nao esta ouvindo na porta %PORTA%.
  echo   Deixe BAT\01_SERVIDOR_LOCAL.bat aberto durante o teste.
) else (
  echo   [OK] Porta %PORTA% em LISTENING.
)

echo.
echo Firewall:
netsh advfirewall firewall show rule name="%REGRA%" | findstr /I /C:"%REGRA%" >nul 2>nul
if errorlevel 1 (echo   [ATENCAO] Regra dedicada nao encontrada.) else (echo   [OK] Regra encontrada.)

echo.
echo Perfil de rede do Windows:
powershell.exe -NoProfile -Command "Get-NetConnectionProfile | Where-Object {$_.IPv4Connectivity -ne 'Disconnected'} | Select-Object InterfaceAlias,NetworkCategory,IPv4Connectivity | Format-Table -AutoSize" 2>nul

echo.
if defined IP_PREF (
  echo Teste no celular, com PC e celular na mesma rede:
  echo   http://!IP_PREF!:%PORTA%
)
exit /b 0

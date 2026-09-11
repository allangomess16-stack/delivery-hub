@echo off
if defined DELIVERY_HUB_APK_COMUM exit /b 0
set "DELIVERY_HUB_APK_COMUM=1"

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"
for %%I in ("%RAIZ%\..") do set "PAI_PROJETO=%%~fI"
for %%I in ("%PAI_PROJETO%\..") do set "PAI_GERAL=%%~fI"
set "FERRAMENTAS=%RAIZ%\.ferramentas"
set "SDK_LOCAL=%FERRAMENTAS%\android-sdk"
set "CONFIG_HOMOLOGACAO=%RAIZ%\public\homologacao-config.json"
set "SAIDA_APK=%RAIZ%\APK"

if not exist "%FERRAMENTAS%" mkdir "%FERRAMENTAS%" >nul 2>nul
if not exist "%SAIDA_APK%" mkdir "%SAIDA_APK%" >nul 2>nul

exit /b 0

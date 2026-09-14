param(
  [Parameter(Mandatory = $true)]
  [string]$AdbPath,

  [Parameter(Mandatory = $true)]
  [string]$Serial,

  [Parameter(Mandatory = $true)]
  [string]$ProjectRoot
)

$ErrorActionPreference = "Stop"
$ImilePackage = "com.imile.redelivery"
$DeliveryHubPackages = @("com.deliveryhub.app", "com.deliveryhub.homologacao")
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputDirectory = Join-Path $ProjectRoot "diagnosticos-apk\imile-real-$Timestamp"
$RawLog = Join-Path $env:TEMP "deliveryhub-imile-logcat-$Timestamp.txt"
$RawError = Join-Path $env:TEMP "deliveryhub-imile-logcat-$Timestamp.err.txt"
$SummaryFile = Join-Path $OutputDirectory "RESUMO-DIAGNOSTICO.txt"
$EventsFile = Join-Path $OutputDirectory "eventos-android-mascarados.txt"
$LogProcess = $null

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Protect-SensitiveText {
  param([AllowEmptyString()][string]$Text)

  if ($null -eq $Text) { return "" }

  $protected = $Text -replace '(?i)(requestCode=)[A-Za-z0-9_-]{1,64}', '$1[MASCARADO]'
  $protected = $protected -replace '(?i)\bAJ[0-9]{10,20}\b', '[TRACKING_MASCARADO]'
  $protected = $protected -replace '\b[0-9]{12,20}\b', '[CODIGO_MASCARADO]'
  $protected = $protected -replace '(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', '[EMAIL_MASCARADO]'
  $protected = $protected -replace '(?i)(Bearer\s+)[A-Za-z0-9._~-]+', '$1[TOKEN_MASCARADO]'
  $protected = $protected -replace '(?i)((auth|token|idToken|refreshToken|accessToken)=)[^&\s]+', '$1[MASCARADO]'
  $protected = $protected -replace '(?i)("(?:firebaseAuthenticationToken|authorization|idToken|refreshToken|accessToken|token)"\s*:\s*")[^"]+', '$1[MASCARADO]'
  $protected = $protected -replace '\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b', '[JWT_MASCARADO]'
  return $protected
}

function Invoke-AdbText {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  $result = & $AdbPath -s $Serial @Arguments 2>&1 | Out-String
  return (Protect-SensitiveText $result.Trim())
}

function Get-PackageVersion {
  param([string]$PackageName)

  $packageDump = Invoke-AdbText shell dumpsys package $PackageName
  $versionLines = $packageDump -split "`r?`n" |
    Where-Object { $_ -match 'versionName=|versionCode=' } |
    Select-Object -First 4

  if (-not $versionLines) { return "${PackageName}: nao encontrado" }
  return "$PackageName`r`n$($versionLines -join "`r`n")"
}

function Save-Stage {
  param(
    [string]$FileName,
    [string]$Title
  )

  $activityDump = Invoke-AdbText shell dumpsys activity activities
  $windowDump = Invoke-AdbText shell dumpsys window windows

  $activityLines = $activityDump -split "`r?`n" |
    Where-Object {
      $_ -match 'topResumedActivity|mResumedActivity|ResumedActivity|com\.imile\.redelivery|com\.deliveryhub\.(app|homologacao)'
    } |
    Select-Object -First 160

  $windowLines = $windowDump -split "`r?`n" |
    Where-Object { $_ -match 'mCurrentFocus|mFocusedApp' } |
    Select-Object -First 20

  $content = @(
    "DELIVERY HUB - $Title",
    "Capturado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "",
    "ACTIVITY / PILHA",
    ($activityLines -join "`r`n"),
    "",
    "JANELA EM FOCO",
    ($windowLines -join "`r`n")
  ) -join "`r`n"

  Protect-SensitiveText $content |
    Set-Content -LiteralPath (Join-Path $OutputDirectory $FileName) -Encoding UTF8
}

function Ask-Observation {
  param([string]$Prompt)

  $answer = Read-Host "$Prompt [S/N/NA]"
  if ([string]::IsNullOrWhiteSpace($answer)) { return "NA" }
  return (Protect-SensitiveText $answer.Trim().ToUpperInvariant())
}

try {
  Write-Host "[1/5] Registrando versoes instaladas..."
  $deviceInfo = Invoke-AdbText shell getprop ro.product.model
  $androidVersion = Invoke-AdbText shell getprop ro.build.version.release
  $imileVersion = Get-PackageVersion $ImilePackage
  $hubVersions = foreach ($packageName in $DeliveryHubPackages) {
    $path = Invoke-AdbText shell pm path $packageName
    if ($path -match '^package:') { Get-PackageVersion $packageName }
  }

  & $AdbPath -s $Serial logcat -c 2>$null
  $LogProcess = Start-Process -FilePath $AdbPath `
    -ArgumentList @("-s", $Serial, "logcat", "-v", "threadtime") `
    -RedirectStandardOutput $RawLog `
    -RedirectStandardError $RawError `
    -PassThru `
    -WindowStyle Hidden

  Write-Host "[2/5] Captura Android iniciada."
  Write-Host ""
  Write-Host "NO CELULAR:"
  Write-Host "1. Abra o Delivery Hub."
  Write-Host "2. Deixe a tela pronta imediatamente antes de escanear."
  Write-Host "3. Volte ao computador e pressione ENTER."
  Read-Host | Out-Null
  Start-Sleep -Milliseconds 1200
  Save-Stage "01-antes-do-scan.txt" "ANTES DO SCAN"

  Write-Host ""
  Write-Host "AGORA NO CELULAR:"
  Write-Host "1. Escaneie a etiqueta real no Delivery Hub."
  Write-Host "2. Aguarde a iMile abrir e concluir apenas a pesquisa."
  Write-Host "3. PARE nessa tela. NAO confirme entrega, POD, foto ou assinatura."
  Write-Host "4. Com a iMile ainda aberta, volte ao computador e pressione ENTER."
  Read-Host | Out-Null
  Start-Sleep -Milliseconds 1200
  Save-Stage "02-imile-aberta.txt" "IMILE ABERTA APOS O SCAN"

  $openedImile = Ask-Observation "A iMile abriu automaticamente"
  $filledAutomatically = Ask-Observation "Sem tocar, digitar ou colar, o campo da iMile ja abriu com o tracking correto"
  $searchedAutomatically = Ask-Observation "Sem acao manual, a iMile iniciou a pesquisa da encomenda"
  $usedManualPaste = Ask-Observation "Foi necessario entrar na busca manual e colar o tracking"
  $searchedPackage = Ask-Observation "Depois do caminho usado, a iMile encontrou a encomenda"
  $noConfirmation = Ask-Observation "Voce parou antes de confirmar qualquer baixa"

  Write-Host ""
  Write-Host "RETORNO:"
  Write-Host "1. Use Voltar ate retornar ao Delivery Hub."
  Write-Host "2. Confira se o scanner ficou utilizavel."
  Write-Host "3. Pressione ENTER no computador."
  Read-Host | Out-Null
  Start-Sleep -Milliseconds 1500
  Save-Stage "03-retorno-delivery-hub.txt" "RETORNO AO DELIVERY HUB"
  $returnedHub = Ask-Observation "O retorno ao Delivery Hub ocorreu corretamente"
  $scannerReady = Ask-Observation "O scanner permaneceu pronto para a proxima leitura"

  Write-Host "[4/5] Encerrando e filtrando a captura..."
  if ($LogProcess -and -not $LogProcess.HasExited) {
    $LogProcess.Kill()
    $LogProcess.WaitForExit()
  }

  $eventPattern = 'ActivityTaskManager|ActivityManager|AndroidRuntime|Capacitor|NativeBridge|com\.imile\.redelivery|com\.deliveryhub\.(app|homologacao)|crredelivery|requestCode'
  $rawEvents = if (Test-Path -LiteralPath $RawLog) {
    Get-Content -LiteralPath $RawLog -ErrorAction SilentlyContinue
  } else {
    @()
  }
  $usedDeepLink = [bool]($rawEvents | Where-Object { $_ -match 'methodName:\s*openDeepLink|methodName"\s*:\s*"openDeepLink' } | Select-Object -First 1)
  $usedOpenApp = [bool]($rawEvents | Where-Object { $_ -match 'methodName:\s*openApp|methodName"\s*:\s*"openApp' } | Select-Object -First 1)
  $usedClipboard = [bool]($rawEvents | Where-Object { $_ -match 'methodName:\s*copyText|methodName"\s*:\s*"copyText' } | Select-Object -First 1)
  $observedStrategy = if ($usedDeepLink) {
    "DEEPLINK"
  } elseif ($usedOpenApp -and $usedClipboard) {
    "FALLBACK_CLIPBOARD_APP"
  } elseif ($usedOpenApp) {
    "ABERTURA_DO_APP"
  } else {
    "NAO_IDENTIFICADA"
  }

  $events = if ($rawEvents.Count -gt 0) {
    $rawEvents |
      Where-Object { $_ -match $eventPattern } |
      ForEach-Object { Protect-SensitiveText $_ } |
      Select-Object -Last 2500
  } else {
    @("Logcat nao produziu saida.")
  }
  $events | Set-Content -LiteralPath $EventsFile -Encoding UTF8

  $summary = @(
    "DELIVERY HUB - DIAGNOSTICO CONTROLADO IMILE",
    "Data UTC/local do computador: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')",
    "Aparelho: $deviceInfo",
    "Android: $androidVersion",
    "",
    "VERSOES",
    $imileVersion,
    ($hubVersions -join "`r`n"),
    "",
    "OBSERVACOES DO TESTE",
    "Estrategia observada no NativeBridge: $observedStrategy",
    "NativeBridge.openDeepLink detectado: $usedDeepLink",
    "NativeBridge.copyText detectado: $usedClipboard",
    "NativeBridge.openApp detectado: $usedOpenApp",
    "iMile abriu automaticamente: $openedImile",
    "Tracking foi preenchido automaticamente: $filledAutomatically",
    "Pesquisa iniciou automaticamente: $searchedAutomatically",
    "Foi necessario colar manualmente: $usedManualPaste",
    "Encomenda foi encontrada: $searchedPackage",
    "Teste parou antes da baixa: $noConfirmation",
    "Retorno ao Delivery Hub: $returnedHub",
    "Scanner pronto apos retorno: $scannerReady",
    "",
    "PRIVACIDADE",
    "Tracking e codigos longos foram mascarados automaticamente.",
    "Nenhuma captura de tela ou hierarquia visual foi coletada.",
    "O script nao desinstalou apps, nao limpou dados e nao confirmou entrega.",
    "",
    "ARQUIVOS",
    "01-antes-do-scan.txt",
    "02-imile-aberta.txt",
    "03-retorno-delivery-hub.txt",
    "eventos-android-mascarados.txt"
  ) -join "`r`n"

  Protect-SensitiveText $summary | Set-Content -LiteralPath $SummaryFile -Encoding UTF8

  Write-Host "[5/5] Relatorio criado:"
  Write-Host $OutputDirectory
  Write-Host ""
  Write-Host "Envie a pasta inteira para analise."
  Start-Process explorer.exe -ArgumentList @($OutputDirectory)
} finally {
  if ($LogProcess -and -not $LogProcess.HasExited) {
    $LogProcess.Kill()
    $LogProcess.WaitForExit()
  }

  Remove-Item -LiteralPath $RawLog -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $RawError -Force -ErrorAction SilentlyContinue
}

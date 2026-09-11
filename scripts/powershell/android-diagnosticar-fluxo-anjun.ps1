param(
  [Parameter(Mandatory = $true)][string]$AdbPath,
  [Parameter(Mandatory = $true)][string]$Serial,
  [Parameter(Mandatory = $true)][string]$ProjectRoot
)

$ErrorActionPreference = "Stop"
$AnjunPackage = "com.anjun.supplierManagement"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputDirectory = Join-Path $ProjectRoot "diagnosticos-apk\anjun-real-$Timestamp"
$SummaryFile = Join-Path $OutputDirectory "RESUMO-DIAGNOSTICO.txt"

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Protect-SensitiveText {
  param([AllowEmptyString()][string]$Text)
  if ($null -eq $Text) { return "" }
  $safe = $Text -replace '(?i)\bAJ[0-9]{10,20}\b', '[TRACKING_MASCARADO]'
  $safe = $safe -replace '\b[0-9]{12,20}\b', '[CODIGO_MASCARADO]'
  $safe = $safe -replace '(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', '[EMAIL_MASCARADO]'
  return $safe
}

function Invoke-AdbText {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  return (Protect-SensitiveText ((& $AdbPath -s $Serial @Arguments 2>&1 | Out-String).Trim()))
}

function Save-Stage {
  param([string]$Name, [string]$Title)
  $activity = Invoke-AdbText shell dumpsys activity activities
  $window = Invoke-AdbText shell dumpsys window windows
  $lines = @($activity, $window) -join "`r`n"
  $filtered = $lines -split "`r?`n" | Where-Object {
    $_ -match 'topResumedActivity|mResumedActivity|mCurrentFocus|mFocusedApp|com\.anjun\.supplierManagement|com\.deliveryhub\.(app|homologacao)'
  } | Select-Object -First 180
  @("DELIVERY HUB - $Title", "Capturado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')", "", ($filtered -join "`r`n")) |
    Set-Content -LiteralPath (Join-Path $OutputDirectory $Name) -Encoding UTF8
}

function Ask {
  param([string]$Question)
  $answer = Read-Host "$Question [S/N/NA]"
  if ([string]::IsNullOrWhiteSpace($answer)) { return "NA" }
  return (Protect-SensitiveText $answer.Trim().ToUpperInvariant())
}

try {
  Write-Host "[1/4] Registrando versoes e estado inicial..."
  $device = Invoke-AdbText shell getprop ro.product.model
  $android = Invoke-AdbText shell getprop ro.build.version.release
  $anjunVersion = (Invoke-AdbText shell dumpsys package $AnjunPackage) -split "`r?`n" |
    Where-Object { $_ -match 'versionName=|versionCode=' } | Select-Object -First 4
  Save-Stage "01-antes-da-leitura.txt" "ANTES DA LEITURA"

  Write-Host ""
  Write-Host "NO CELULAR: leia uma etiqueta Anjun (AJ...) no Delivery Hub."
  Write-Host "O Hub deve copiar o codigo e abrir a Anjun. Nao confirme entrega, POD, foto ou assinatura."
  Read-Host "Com a Anjun aberta, pressione ENTER" | Out-Null
  Start-Sleep -Milliseconds 1200
  Save-Stage "02-anjun-aberta.txt" "ANJUN ABERTA APOS A LEITURA"

  $opened = Ask "A Anjun abriu automaticamente"
  $clipboard = Ask "O codigo foi copiado para a area de transferencia"
  $foundSearch = Ask "Voce encontrou a busca manual no aplicativo"
  $pasteWorked = Ask "Ao colar, a Anjun encontrou a encomenda"
  $stopped = Ask "Voce parou antes de qualquer baixa"

  Write-Host ""
  Write-Host "Use Voltar ate retornar ao Delivery Hub, sem confirmar baixa."
  Read-Host "Quando voltar ao Hub, pressione ENTER" | Out-Null
  Start-Sleep -Milliseconds 1000
  Save-Stage "03-retorno-delivery-hub.txt" "RETORNO AO DELIVERY HUB"
  $returned = Ask "O retorno ao Delivery Hub ocorreu corretamente"

  $summary = @(
    "DELIVERY HUB - DIAGNOSTICO CONTROLADO ANJUN NIVEL 1",
    "Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')",
    "Aparelho: $device",
    "Android: $android",
    "",
    "VERSAO ANJUN",
    ($anjunVersion -join "`r`n"),
    "",
    "OBSERVACOES",
    "Anjun abriu automaticamente: $opened",
    "Codigo copiado pelo Hub: $clipboard",
    "Busca manual encontrada: $foundSearch",
    "Colar encontrou a encomenda: $pasteWorked",
    "Teste parou antes da baixa: $stopped",
    "Retorno ao Delivery Hub: $returned",
    "",
    "LIMITES E PRIVACIDADE",
    "O script nao confirma baixa, nao abre Activity interna, nao captura tela e nao coleta hierarquia visual.",
    "Trackings e codigos longos sao mascarados automaticamente.",
    "",
    "ARQUIVOS",
    "01-antes-da-leitura.txt",
    "02-anjun-aberta.txt",
    "03-retorno-delivery-hub.txt"
  ) -join "`r`n"
  Protect-SensitiveText $summary | Set-Content -LiteralPath $SummaryFile -Encoding UTF8
  Write-Host "[4/4] Relatorio criado: $OutputDirectory"
  Start-Process explorer.exe -ArgumentList @($OutputDirectory)
} catch {
  throw "Diagnostico Anjun falhou: $($_.Exception.Message)"
}

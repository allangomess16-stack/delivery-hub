param(
  [Parameter(Mandatory = $true)]
  [string]$SdkRoot
)

$ErrorActionPreference = "Stop"
$SdkRoot = [IO.Path]::GetFullPath($SdkRoot)
$diretorioLicencas = Join-Path $SdkRoot "licenses"
$arquivoLicenca = Join-Path $diretorioLicencas "android-sdk-license"

# Estes identificadores sao os registros reconhecidos pelas ferramentas Android
# para as revisoes publicadas da licenca SDK. A aceitacao ocorre expressamente
# no BAT antes de este arquivo ser criado.
$identificadores = @(
  "8933bad161af4178b1185d1a37fbf41ea5269c55",
  "d56f5187479451eabf01fb78af6dfcb131a6481e",
  "24333f8a63b6825ea9c5514f83c2829b004d1fee"
)

New-Item -ItemType Directory -Path $diretorioLicencas -Force | Out-Null
[IO.File]::WriteAllLines($arquivoLicenca, $identificadores, [Text.UTF8Encoding]::new($false))

if (-not (Test-Path $arquivoLicenca)) {
  throw "O arquivo de licenca Android nao foi criado."
}

Write-Host "[OK] Licenca Android registrada no SDK local."

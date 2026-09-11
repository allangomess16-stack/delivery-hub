param(
  [Parameter(Mandatory = $true)]
  [string]$SdkRoot
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Obter-TextoNo($No, [string]$XPath) {
  $filho = $No.SelectSingleNode($XPath)
  if ($null -eq $filho) { return "" }
  return [string]$filho.InnerText
}

function Obter-Pacote([xml]$Repositorio, [string]$Caminho) {
  $nos = @($Repositorio.SelectNodes("//*[local-name()='remotePackage' and @path='$Caminho']"))
  $estaveis = @($nos | Where-Object {
    $canal = $_.SelectSingleNode("./*[local-name()='channelRef']")
    $null -eq $canal -or $canal.ref -eq "channel-0"
  })
  if ($estaveis.Count -eq 0) { return $null }
  return $estaveis[0]
}

function Selecionar-ArquivoWindows($Pacote) {
  $arquivos = @($Pacote.SelectNodes("./*[local-name()='archives']/*[local-name()='archive']"))
  return $arquivos | Where-Object {
    $hostOs = Obter-TextoNo $_ "./*[local-name()='host-os']"
    [string]::IsNullOrWhiteSpace($hostOs) -or $hostOs -eq "windows"
  } | Select-Object -First 1
}

function Instalar-PacoteDireto(
  [xml]$Repositorio,
  [string]$CaminhoPacote,
  [string]$Destino,
  [string]$ArquivoMarcador
) {
  $pacote = Obter-Pacote $Repositorio $CaminhoPacote
  if ($null -eq $pacote) {
    throw "Pacote $CaminhoPacote nao encontrado no repositorio oficial."
  }

  $arquivo = Selecionar-ArquivoWindows $pacote
  if ($null -eq $arquivo) {
    throw "Arquivo compativel com Windows nao encontrado para $CaminhoPacote."
  }

  $completo = $arquivo.SelectSingleNode("./*[local-name()='complete']")
  $urlRelativa = Obter-TextoNo $completo "./*[local-name()='url']"
  $tamanhoEsperado = Obter-TextoNo $completo "./*[local-name()='size']"
  $checksumNo = $completo.SelectSingleNode("./*[local-name()='checksum']")
  if ([string]::IsNullOrWhiteSpace($urlRelativa)) {
    throw "URL de download ausente para $CaminhoPacote."
  }

  $temporario = Join-Path ([IO.Path]::GetTempPath()) ("delivery-hub-android-" + [guid]::NewGuid())
  $zip = Join-Path $temporario "pacote.zip"
  $extraido = Join-Path $temporario "extraido"
  New-Item -ItemType Directory -Path $extraido -Force | Out-Null

  try {
    $url = "https://dl.google.com/android/repository/$urlRelativa"
    Write-Host "[INFO] Baixando $CaminhoPacote do repositorio oficial..."
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip

    if ($tamanhoEsperado -match '^\d+$') {
      $tamanhoReal = (Get-Item $zip).Length
      if ($tamanhoReal -ne [long]$tamanhoEsperado) {
        throw "Download incompleto de $CaminhoPacote ($tamanhoReal de $tamanhoEsperado bytes)."
      }
    }

    if ($null -ne $checksumNo -and -not [string]::IsNullOrWhiteSpace($checksumNo.InnerText)) {
      $tipo = ([string]$checksumNo.type).ToUpperInvariant()
      if ($tipo -notin @("SHA1", "SHA256")) { $tipo = "SHA1" }
      $hashReal = (Get-FileHash -Path $zip -Algorithm $tipo).Hash
      if ($hashReal -ne ([string]$checksumNo.InnerText).Trim().ToUpperInvariant()) {
        throw "Checksum invalido no download de $CaminhoPacote."
      }
    }

    Expand-Archive -LiteralPath $zip -DestinationPath $extraido -Force
    $marcador = Get-ChildItem -Path $extraido -Filter $ArquivoMarcador -File -Recurse | Select-Object -First 1
    if ($null -eq $marcador) {
      throw "$ArquivoMarcador nao foi encontrado no pacote $CaminhoPacote."
    }

    New-Item -ItemType Directory -Path $Destino -Force | Out-Null
    Copy-Item -Path (Join-Path $marcador.Directory.FullName "*") -Destination $Destino -Recurse -Force

    $instalado = Join-Path $Destino $ArquivoMarcador
    if (-not (Test-Path $instalado)) {
      throw "A instalacao de $CaminhoPacote nao criou $instalado."
    }
    Write-Host "[OK] $CaminhoPacote instalado."
  }
  finally {
    if (Test-Path $temporario) {
      Remove-Item -LiteralPath $temporario -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

$SdkRoot = [IO.Path]::GetFullPath($SdkRoot)
New-Item -ItemType Directory -Path $SdkRoot -Force | Out-Null

$repositorio = $null
foreach ($indice in @(3, 1)) {
  try {
    $urlRepositorio = "https://dl.google.com/android/repository/repository2-$indice.xml"
    Write-Host "[INFO] Consultando catalogo Android oficial..."
    $conteudo = (Invoke-WebRequest -UseBasicParsing -Uri $urlRepositorio).Content
    $candidato = [xml]$conteudo
    if ($null -ne (Obter-Pacote $candidato "platforms;android-35")) {
      $repositorio = $candidato
      break
    }
  }
  catch {
    Write-Host "[ATENCAO] Catalogo repository2-$indice.xml indisponivel."
  }
}

if ($null -eq $repositorio) {
  throw "Nao foi possivel consultar o catalogo oficial do Android."
}

$androidJar = Join-Path $SdkRoot "platforms\android-35\android.jar"
if (-not (Test-Path $androidJar)) {
  Instalar-PacoteDireto $repositorio "platforms;android-35" (Join-Path $SdkRoot "platforms\android-35") "android.jar"
}

$aapt2 = Join-Path $SdkRoot "build-tools\34.0.0\aapt2.exe"
if (-not (Test-Path $aapt2)) {
  Instalar-PacoteDireto $repositorio "build-tools;34.0.0" (Join-Path $SdkRoot "build-tools\34.0.0") "aapt2.exe"
}

if (-not (Test-Path $androidJar) -or -not (Test-Path $aapt2)) {
  throw "Os componentes Android obrigatorios continuam incompletos."
}

Write-Host "[OK] Plataforma Android 35 e Build Tools 34.0.0 validados."

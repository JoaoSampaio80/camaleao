param(
  [bool]$StartFrontend = $true,
  [bool]$StartMobile = $false
)

# =========================
# Paths
# =========================
$ProjectRoot = "C:\Dev\camaleao"
$Backend = "$ProjectRoot\backend"
$Frontend = "$ProjectRoot\frontend"
$Mobile = "$ProjectRoot\mobile"

$BackendEnv = "$Backend\.env.prod"
$FrontendEnv = "$Frontend\.env.production"
$MobileEnv = "$Mobile\.env.prod"

$UserTemp = [System.IO.Path]::GetTempPath()
$CloudflaredOut = Join-Path $UserTemp "cf_out.txt"
$CloudflaredErr = Join-Path $UserTemp "cf_err.txt"

# =========================
# Helpers
# =========================
function Set-EnvVarInFile {
  param(
    [string]$File,
    [string]$Key,
    [string]$Value
  )
  if (-not (Test-Path $File)) {
    New-Item -ItemType File -Path $File -Force | Out-Null
  }

  # Lê todo o conteúdo do arquivo, preservando linhas e formato
  $lines = Get-Content -Path $File -ErrorAction SilentlyContinue

  # Expressão para localizar a chave (ex: ^VITE_API_URL=)
  $escaped = [regex]::Escape($Key)
  $found = $false

  # Atualiza a linha existente, se encontrada
  $newLines = @()
  foreach ($line in $lines) {
    if ($line -match "^\s*$escaped\s*=") {
      $newLines += "$Key=$Value"
      $found = $true
    }
    else {
      $newLines += $line
    }
  }

  # Se não encontrou, adiciona no final (sem pular linha extra)
  if (-not $found) {
    if ($newLines.Count -gt 0) {
      $newLines[-1] = $newLines[-1].TrimEnd()
    }
    $newLines += "$Key=$Value"
  }

  # Regrava o arquivo sem inserir linhas em branco adicionais
  Set-Content -Path $File -Value ($newLines -join "`n") -Encoding UTF8
}


function Start-NewWindow {
  param($Title, $Cmd)
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '[$Title]'; $Cmd" -WindowStyle Normal
}

Write-Host "Iniciando ambiente de PRODUCAO simulada..."
Write-Host ""

# =========================
# 1) Detecta cloudflared
# =========================
Write-Host "Verificando tunel Cloudflare..."
$CloudflaredPath = $null
$CloudflaredUser = Join-Path $env:USERPROFILE ".cloudflared\cloudflared.exe"
if (Test-Path $CloudflaredUser) {
  $CloudflaredPath = $CloudflaredUser
}
else {
  try { $CloudflaredPath = (Get-Command cloudflared -ErrorAction Stop).Source }
  catch {
    Write-Host "ERRO: cloudflared.exe nao encontrado. Instale o tunel Cloudflare e tente novamente."
    exit 1
  }
}

# =========================
# 2) Cria túnel primeiro (para backend)
# =========================
Write-Host ""
Write-Host "Criando tunel Cloudflare apontando para o backend (porta 8000)..."
if (Test-Path $CloudflaredOut) { Remove-Item $CloudflaredOut -ErrorAction SilentlyContinue }
if (Test-Path $CloudflaredErr) { Remove-Item $CloudflaredErr -ErrorAction SilentlyContinue }

$cfArgs = @("tunnel", "--url", "http://127.0.0.1:8000")
$CloudflaredProc = Start-Process -FilePath $CloudflaredPath -ArgumentList $cfArgs `
  -RedirectStandardOutput $CloudflaredOut -RedirectStandardError $CloudflaredErr `
  -PassThru

Write-Host "Aguardando URL do tunel..."
$Url = $null
$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline -and -not $Url) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $CloudflaredOut) {
    $txt = Get-Content -Path $CloudflaredOut -Raw -ErrorAction SilentlyContinue
    if ($txt -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { $Url = $Matches[0]; break }
  }
  if (-not $Url -and (Test-Path $CloudflaredErr)) {
    $err = Get-Content -Path $CloudflaredErr -Raw -ErrorAction SilentlyContinue
    if ($err -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { $Url = $Matches[0]; break }
  }
}

if (-not $Url) {
  Write-Host "Falha ao capturar a URL do tunel Cloudflare."
  Stop-Process -Id $CloudflaredProc.Id -Force
  exit 1
}

Write-Host "Tunel ativo: $Url"
$HostOnly = $Url -replace '^https://', ''

# =========================
# 3) Atualiza .env antes de subir o backend
# =========================
Write-Host ""
Write-Host "Atualizando variaveis de ambiente..."

Set-EnvVarInFile $BackendEnv  "ALLOWED_HOSTS" "127.0.0.1,localhost,$HostOnly"
Set-EnvVarInFile $BackendEnv  "TUNNEL_URL"    $Url
Set-EnvVarInFile $BackendEnv  "BACKEND_URL"   $Url
Set-EnvVarInFile $FrontendEnv "VITE_API_URL"  "$Url/api/v1/"
Set-EnvVarInFile $MobileEnv   "API_URL"       "$Url/api/v1/"

Write-Host "Env files atualizados:"
Write-Host " - $BackendEnv"
Write-Host " - $FrontendEnv"
Write-Host " - $MobileEnv"

# =========================
# 4) Inicia Django backend
# =========================
Write-Host ""
Write-Host "Iniciando backend Django..."
$venv = "$Backend\venv\Scripts\Activate"
if (Test-Path $venv) {
  $djangoCmd = "cd `"$Backend`"; . `"$venv`"; `$env:DJANGO_SETTINGS_MODULE='camaleao.settings.prod'; python manage.py runserver 127.0.0.1:8000"
}
else {
  $djangoCmd = "cd `"$Backend`"; `$env:DJANGO_SETTINGS_MODULE='camaleao.settings.prod'; python manage.py runserver 127.0.0.1:8000"
}
Start-NewWindow "Django (prod)" $djangoCmd

Write-Host "Aguardando backend iniciar..."
Start-Sleep -Seconds 10

# =========================
# 5) Builda e inicia frontend (modo produção real)
# =========================
if ($StartFrontend) {
  Write-Host ""
  Write-Host "Compilando frontend para producao..."
  Push-Location $Frontend
  npm install
  npm run build
  Write-Host "Iniciando servidor preview (porta 5173)..."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$Frontend`"; npm run preview" -WindowStyle Normal
  Pop-Location
}

# =========================
# 6) Inicia mobile (opcional)
# =========================
if ($StartMobile) {
  $mob = "cd `"$Mobile`"; npm run dev"
  Start-NewWindow "Mobile (prod)" $mob
}

# =========================
# 7) Exibe status final
# =========================
Write-Host ""
Write-Host "==============================="
Write-Host "Ambiente Camaleao pronto!"
Write-Host "Tunel ativo: $Url"
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "==============================="
Write-Host ""
Write-Host "Acesse a aplicacao em: $Url"
Write-Host "Pressione CTRL + C aqui para encerrar o tunel Cloudflare."
Write-Host ""

# Mantém o túnel ativo até interrupção manual
Wait-Process -Id $CloudflaredProc.Id

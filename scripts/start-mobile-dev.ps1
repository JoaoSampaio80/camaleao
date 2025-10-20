param(
  [ValidateSet("dev", "prod")][string]$Env = "dev"
)

# =====================================
# Caminhos principais
# =====================================
$ProjectRoot = "C:\Dev\camaleao"
$Backend = "$ProjectRoot\backend"
$Mobile = "$ProjectRoot\mobile"

if ($Env -eq "dev") {
  $BackendEnv = "$Backend\.env.development"
}
else {
  $BackendEnv = "$Backend\.env.prod"
}

if ($Env -eq "dev") {
  $MobileEnv = "$Mobile\.env.dev"
}
else {
  $MobileEnv = "$Mobile\.env.prod"
}

$UserTemp = [System.IO.Path]::GetTempPath()
$CloudflaredOut = Join-Path $UserTemp "cf_out.txt"
$CloudflaredErr = Join-Path $UserTemp "cf_err.txt"

# =====================================
# Função auxiliar para atualizar variáveis
# =====================================
function Set-EnvVarInFile {
  param([string]$File, [string]$Key, [string]$Value)

  if (-not (Test-Path $File)) {
    New-Item -ItemType File -Path $File -Force | Out-Null
  }

  $lines = Get-Content -Path $File -ErrorAction SilentlyContinue
  $escaped = [regex]::Escape($Key)
  $found = $false
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

  if (-not $found) {
    if ($newLines.Count -gt 0) {
      $newLines[-1] = $newLines[-1].TrimEnd()
    }
    $newLines += "$Key=$Value"
  }

  # usar newline do PowerShell e forçar UTF8
  Set-Content -Path $File -Value ($newLines -join "`n") -Encoding UTF8
}

Write-Host "Iniciando ambiente MOBILE ($Env)..."

# =====================================
# 1) Criar túnel Cloudflare
# =====================================
Write-Host "Criando tunel Cloudflare..."
$CloudflaredPath = $null
$CloudflaredUser = Join-Path $env:USERPROFILE ".cloudflared\cloudflared.exe"

if (Test-Path $CloudflaredUser) {
  $CloudflaredPath = $CloudflaredUser
}
else {
  try {
    $CloudflaredPath = (Get-Command cloudflared -ErrorAction Stop).Source
  }
  catch {
    Write-Host "ERRO: cloudflared.exe nao encontrado. Instale o Cloudflared e tente novamente."
    exit 1
  }
}

if (Test-Path $CloudflaredOut) { Remove-Item $CloudflaredOut -ErrorAction SilentlyContinue }
if (Test-Path $CloudflaredErr) { Remove-Item $CloudflaredErr -ErrorAction SilentlyContinue }

$cfArgs = @("tunnel", "--url", "http://0.0.0.0:8000", "--no-autoupdate")
$CloudflaredProc = Start-Process -FilePath $CloudflaredPath -ArgumentList $cfArgs `
  -RedirectStandardOutput $CloudflaredOut -RedirectStandardError $CloudflaredErr -PassThru

Write-Host "Aguardando URL do tunel..."
$Url = $null
$deadline = (Get-Date).AddSeconds(30)
$pattern = 'https?://[a-z0-9\-]+\.trycloudflare\.com'

while ((Get-Date) -lt $deadline -and -not $Url) {
  Start-Sleep -Milliseconds 400
  if (Test-Path $CloudflaredOut) {
    $txt = Get-Content -Path $CloudflaredOut -Raw -ErrorAction SilentlyContinue
    if ($txt -match $pattern) { $Url = $Matches[0]; break }
  }
  if (-not $Url -and (Test-Path $CloudflaredErr)) {
    $err = Get-Content -Path $CloudflaredErr -Raw -ErrorAction SilentlyContinue
    if ($err -match $pattern) { $Url = $Matches[0]; break }
  }
  if (-not $Url -and $CloudflaredProc.HasExited) { break }
}

if (-not $Url) {
  Write-Host "Falha ao capturar a URL do tunel Cloudflare."
  exit 1
}

Write-Host "Tunel ativo: $Url"
$HostOnly = $Url -replace '^https://', ''

# =====================================
# 2) Atualizar arquivos .env
# =====================================
Write-Host "Atualizando variaveis de ambiente..."
Set-EnvVarInFile $BackendEnv "ALLOWED_HOSTS" "0.0.0.0,localhost,$HostOnly"
Set-EnvVarInFile $BackendEnv "BACKEND_URL" $Url
Set-EnvVarInFile $MobileEnv "API_URL" "$Url/api/v1/"
Set-EnvVarInFile $MobileEnv "APP_ENV" $Env
Set-EnvVarInFile $MobileEnv "JWT_COOKIE" "true"

Write-Host "Arquivos atualizados:"
Write-Host " - $BackendEnv"
Write-Host " - $MobileEnv"

# =====================================
# 3) Iniciar backend Django
# =====================================
$djangoCmd = "cd `"$Backend`"; `$env:DJANGO_SETTINGS_MODULE='camaleao.settings.dev';python manage.py runserver 0.0.0.0:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '[Django ($Env)]'; $djangoCmd" -WindowStyle Normal
Start-Sleep -Seconds 5

# =====================================
# 4) Iniciar Metro + build Android
# =====================================
Write-Host "Iniciando Expo Mobile (modo $Env)..."

# Encerrar Metro antigo
Write-Host "Encerrando processos Metro antigos..."
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
  # cuidado: alguns nós podem não ter Path definido, por isso protegemos com try/catch implícito
  ($_.Path -and ($_.Path -like "*expo*" -or $_.Path -like "*node*"))
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Configurar ambiente do Expo
Write-Host "Definindo variaveis de ambiente Expo..."
$env:APP_ENV = $Env
$env:NODE_ENV = "development"
$env:EXPO_NO_TUNNEL = "true"
$env:EXPO_DEBUG = "true"

# Verificar emulador
Write-Host "Verificando status do emulador..."
$adbPath = "C:\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adbPath)) {
  Write-Host "ERRO: adb.exe nao encontrado."
  exit 1
}

$devices = & $adbPath devices | Select-String "emulator"
if (-not $devices) {
  Write-Host "Nenhum emulador ativo. Iniciando Pixel_6a..."
  Start-Process -FilePath "C:\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd Pixel_6a" -WindowStyle Hidden
}

# Esperar até 20s para o emulador iniciar
$maxWait = 60
$elapsed = 0
$emulatorReady = $false
while ($elapsed -lt $maxWait) {
  $devices = & $adbPath devices | Select-String "emulator"
  if ($devices) {
    Write-Host "Emulador detectado."
    $emulatorReady = $true
    break
  }
  Start-Sleep -Seconds 3
  $elapsed += 3
  Write-Host "Aguardando inicializacao do emulador... ($elapsed s)"
}

if (-not $emulatorReady) {
  Write-Host "Timeout: o emulador não iniciou dentro do tempo limite."
  exit 1
}

Write-Host "Aguardando ADB conectar ao emulador..."
& $adbPath wait-for-device
& $adbPath reverse tcp:8081 tcp:8081
Write-Host "Conexao ADB configurada (porta 8081 redirecionada)."

# Iniciar Expo
Set-Location $Mobile
Write-Host "Limpando cache do Metro Bundler..."

# Define variáveis de ambiente para Babel e Expo
$env:APP_ENV = "dev"
$env:NODE_ENV = "development"
$env:EXPO_ENVFILE = ".env.dev"

Write-Host "Carregando Babel/Expo com APP_ENV=$env:APP_ENV e EXPO_ENVFILE=$env:EXPO_ENVFILE"

# 1) Garante que a porta 8081 esteja livre
Write-Host "Verificando porta 8081..."
try {
  $portProc = netstat -ano | Select-String ":8081" | ForEach-Object {
    ($_ -split '\s+')[-1]
  } | Select-Object -Unique
  if ($portProc) {
    Write-Host "Encerrando processo que estava usando a porta 8081 (PID: $portProc)..."
    foreach ($procId in $portProc) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
  }
}
catch {
  Write-Host "Aviso: falha ao verificar porta 8081, prosseguindo mesmo assim..."
}

# 2) Inicia o Metro Bundler com cache limpo (modo dev-client)
Write-Host "Iniciando Metro Bundler..."

# 3) Realiza o build automático e instala o app no emulador (sem precisar 'a' ou 'r')
Write-Host "Iniciando build e instalacao automatica no emulador..."
$expoRunArgs = @("expo", "run", "android")
Start-Process -FilePath "npx.cmd" -ArgumentList $expoRunArgs -WorkingDirectory $Mobile -NoNewWindow -Wait

Write-Host "Build concluido e app iniciado no emulador."

# =====================================
# 5) Status final
# =====================================
Write-Host ""
Write-Host "==============================="
Write-Host "Ambiente MOBILE pronto!"
Write-Host "Túnel ativo: $Url"
Write-Host "Backend: http://0.0.0.0:8000"
Write-Host "==============================="
Write-Host "Pressione CTRL + C para encerrar o tunel."
Write-Host ""

Wait-Process -Id $CloudflaredProc.Id

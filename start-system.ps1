$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$apiDir = Join-Path $root 'backend\src\NurturedChoice.Api'
$apiProject = Join-Path $apiDir 'NurturedChoice.Api.csproj'
$apiDll = Join-Path $apiDir 'bin\Debug\net9.0\NurturedChoice.Api.dll'
$apiRunner = Join-Path $root 'run-api.cmd'
$frontend = Join-Path $root 'frontend'
$frontendRunner = Join-Path $root 'run-frontend.cmd'
$envLoader = Join-Path $root 'scripts\load-local-env.ps1'
$setupScript = Join-Path $root 'setup-local.ps1'
$frontendUrl = 'http://localhost:5173'
$apiHealthUrl = 'http://localhost:5276/api/v1/health'

function Test-Port([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $async = $client.BeginConnect('127.0.0.1', $port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(500)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch { return $false } finally { $client.Dispose() }
}

function Wait-Port([int]$port, [int]$seconds = 30) {
  for ($attempt = 1; $attempt -le $seconds; $attempt++) {
    if (Test-Port $port) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Test-ApiHealth {
  try {
    $response = Invoke-WebRequest -Uri $apiHealthUrl -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Ensure-FrontendBuild {
  Write-Host 'Building the frontend with current local settings...' -ForegroundColor Yellow
  Push-Location $frontend
  try {
    npm.cmd run build | Out-Host
  } finally {
    Pop-Location
  }
}

$envLoaded = & $envLoader -Root $root
if (-not $envLoaded) {
  throw "Local settings are missing. Run '$root\setup-local.cmd' once, then run start-system.cmd again. Auto-start will not open a hidden database setup prompt."
}

if (-not (Test-Port 5276)) {
  if (-not (Test-Path $apiDll)) {
    Write-Host 'Building the API...' -ForegroundColor Yellow
    dotnet build $apiProject | Out-Host
  }
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/c', "call `"$apiRunner`"") -WorkingDirectory $apiDir -WindowStyle Hidden
  if (-not (Wait-Port 5276)) {
    throw 'The API did not start on http://localhost:5276. Check backend\api.log for details.'
  }
}

if (-not (Test-ApiHealth)) {
  throw 'The API is listening but did not pass its health check. Check backend\api.log for details.'
}

Ensure-FrontendBuild

if (-not (Test-Port 5173)) {
  Push-Location $frontend
  try { & cmd.exe /c start "" /b cmd.exe /c call "$frontendRunner" | Out-Null } finally { Pop-Location }
  if (-not (Wait-Port 5173)) {
    throw 'The frontend did not start on http://localhost:5173. Check frontend.log for details.'
  }
}

Start-Sleep -Seconds 1
Start-Process $frontendUrl
Write-Host "Nurtured Choice is running at $frontendUrl" -ForegroundColor Green

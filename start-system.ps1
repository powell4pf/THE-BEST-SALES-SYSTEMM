$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$apiDir = Join-Path $root 'backend\src\NurturedChoice.Api'
$apiProject = Join-Path $apiDir 'NurturedChoice.Api.csproj'
$apiDll = Join-Path $apiDir 'bin\Debug\net9.0\NurturedChoice.Api.dll'
$apiRunner = Join-Path $root 'run-api.cmd'
$frontend = Join-Path $root 'frontend'
$frontendRunner = Join-Path $root 'run-frontend.cmd'

function Test-Port([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $async = $client.BeginConnect('127.0.0.1', $port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(500)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch { return $false } finally { $client.Dispose() }
}

if (-not (Test-Port 5276)) {
  if (-not (Test-Path $apiDll)) {
    Write-Host 'Building the API...' -ForegroundColor Yellow
    dotnet build $apiProject --no-restore
  }
  Push-Location $apiDir
  try { & cmd.exe /c start "" /b cmd.exe /c call "$apiRunner" | Out-Null } finally { Pop-Location }
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-Port 5276) { break }
  }
}

if (-not (Test-Port 5276)) {
  throw 'The API did not start on http://localhost:5276. Check the database service and API logs.'
}

if (-not (Test-Port 5173)) {
  Push-Location $frontend
  try { & cmd.exe /c start "" /b cmd.exe /c call "$frontendRunner" | Out-Null } finally { Pop-Location }
}

Start-Sleep -Seconds 2
Start-Process 'http://localhost:5173'
Write-Host 'Nurtured Choice is starting at http://localhost:5173'

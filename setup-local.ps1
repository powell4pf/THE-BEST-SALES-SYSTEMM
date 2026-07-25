param(
  [string]$PostgresPassword
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$envFile = Join-Path $root '.env.local'
$apiProject = Join-Path $root 'backend\src\NurturedChoice.Api\NurturedChoice.Api.csproj'
$dbName = 'nurtured_choice_sales'
$dbUser = 'postgres'
$dbHost = 'localhost'
$dbPort = 5432

function Get-PsqlPath {
  $command = Get-Command psql -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @(
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe',
    'C:\Program Files\PostgreSQL\15\bin\psql.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }

  throw 'PostgreSQL psql.exe was not found. Install PostgreSQL or add psql to PATH.'
}

function Get-PostgresPassword {
  param([string]$Provided)

  if (-not [string]::IsNullOrWhiteSpace($Provided)) {
    return $Provided
  }

  if ([Environment]::UserInteractive) {
    $credential = Get-Credential -UserName $dbUser -Message 'Enter your local PostgreSQL password for the Nurtured Choice sales system.'
    if ($null -eq $credential) {
      throw 'Setup cancelled. A PostgreSQL password is required.'
    }
    return $credential.GetNetworkCredential().Password
  }

  throw 'Local database setup is required. Run setup-local.cmd in a normal PowerShell or Command Prompt window and enter your PostgreSQL password.'
}

function Invoke-Psql {
  param(
    [string]$PsqlPath,
    [string]$Password,
    [string]$Database,
    [string]$Sql
  )

  $env:PGPASSWORD = $Password
  try {
    $output = & $PsqlPath -X -v ON_ERROR_STOP=1 -h $dbHost -p $dbPort -U $dbUser -d $Database -c $Sql 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw ($output | Out-String).Trim()
    }
    return $output
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

$psqlPath = Get-PsqlPath
$password = Get-PostgresPassword -Provided $PostgresPassword

try {
  Invoke-Psql -PsqlPath $psqlPath -Password $password -Database 'postgres' -Sql 'select 1;' | Out-Null
} catch {
  throw "Could not connect to PostgreSQL. $($_.Exception.Message)"
}

$exists = & {
  $env:PGPASSWORD = $password
  try {
    & $psqlPath -X -h $dbHost -p $dbPort -U $dbUser -d postgres -tAc "select 1 from pg_database where datname = '$dbName';"
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

if ($exists -ne '1') {
  Invoke-Psql -PsqlPath $psqlPath -Password $password -Database 'postgres' -Sql "create database $dbName;" | Out-Null
}

$appConnectionString = "Host=$dbHost;Port=$dbPort;Database=$dbName;Username=$dbUser;Password=$password"
@(
  '# Local machine settings for Nurtured Choice. Do not commit this file.'
  "POSTGRES_PASSWORD=$password"
  "ConnectionStrings__DefaultConnection=$appConnectionString"
) | Set-Content -LiteralPath $envFile -Encoding UTF8

dotnet user-secrets set 'ConnectionStrings:DefaultConnection' $appConnectionString --project $apiProject | Out-Null

Write-Host 'Local setup complete.' -ForegroundColor Green
Write-Host "Saved database settings to $envFile"
Write-Host 'You can now run start-system.cmd to launch the sales system.'

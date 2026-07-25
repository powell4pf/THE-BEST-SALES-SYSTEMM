param([string]$ConnectionString = $env:NURTURED_CHOICE_CONNECTION_STRING, [string]$OutputDirectory = ".\backups")
if ([string]::IsNullOrWhiteSpace($ConnectionString)) { throw "Provide -ConnectionString or NURTURED_CHOICE_CONNECTION_STRING." }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$output = Join-Path $OutputDirectory ("nurtured-choice-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".dump")
pg_dump $ConnectionString --format=custom --file=$output
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE." }
Write-Output "Backup created: $output"

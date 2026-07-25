param([Parameter(Mandatory=$true)][string]$BackupFile, [Parameter(Mandatory=$true)][string]$ConnectionString)
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Backup file not found: $BackupFile" }
pg_restore --clean --if-exists --no-owner --dbname=$ConnectionString $BackupFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE." }

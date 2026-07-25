$taskName = 'Nurtured Choice Sales System'
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) "$taskName.lnk"
if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }
Write-Host 'Auto-start removed.' -ForegroundColor Green

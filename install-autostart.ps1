$ErrorActionPreference = 'Stop'
$taskName = 'Nurtured Choice Sales System'
$script = Join-Path $PSScriptRoot 'start-system.ps1'
$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

# Remove the older Startup-folder shortcut if it exists, preventing duplicate launches.
$oldShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) "$taskName.lnk"
if (Test-Path -LiteralPath $oldShortcut) { Remove-Item -LiteralPath $oldShortcut -Force }

Write-Host 'Auto-start installed successfully.' -ForegroundColor Green
Write-Host "Windows will start the system automatically when you sign in."

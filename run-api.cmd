@echo off
setlocal
set "ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "& '%ROOT%scripts\load-local-env.ps1' -Root '%ROOT%' | Out-Null;" ^
  "if (-not $env:ConnectionStrings__DefaultConnection) { Write-Error 'Missing database settings. Run setup-local.cmd first.' };" ^
  "Set-Location '%ROOT%backend\src\NurturedChoice.Api';" ^
  "$env:ASPNETCORE_ENVIRONMENT='Development';" ^
  "dotnet '%ROOT%backend\src\NurturedChoice.Api\bin\Debug\net9.0\NurturedChoice.Api.dll' --urls http://localhost:5276 *> '%ROOT%backend\api.log'"

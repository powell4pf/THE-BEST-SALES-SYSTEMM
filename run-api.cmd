@echo off
set "ROOT=%~dp0"
cd /d "%ROOT%backend\src\NurturedChoice.Api"
dotnet "%ROOT%backend\src\NurturedChoice.Api\bin\Debug\net8.0\NurturedChoice.Api.dll" --urls http://localhost:5276 > "%ROOT%backend\api.log" 2>&1
if errorlevel 1 (
  echo The API stopped. See backend\api.log for details.
  pause
)

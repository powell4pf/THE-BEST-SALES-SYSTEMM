@echo off
set "ROOT=%~dp0"
cd /d "%ROOT%frontend"
npm.cmd run preview -- --host 0.0.0.0 --port 5173 > "%ROOT%frontend.log" 2>&1
if errorlevel 1 (
  echo The frontend stopped. See frontend.log for details.
  pause
)

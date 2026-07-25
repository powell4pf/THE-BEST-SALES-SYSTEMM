@echo off
set "ROOT=%~dp0"
cd /d "%ROOT%frontend"
set "VITE_API_BASE_URL=http://localhost:5276"
npm.cmd run build
npm.cmd run preview -- --host 0.0.0.0 --port 5173 > "%ROOT%frontend.log" 2>&1
if errorlevel 1 (
  echo The frontend stopped. See frontend.log for details.
  pause
)

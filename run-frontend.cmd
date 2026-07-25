@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%frontend"
set "VITE_API_BASE_URL=http://localhost:5276"

if not exist "dist\index.html" (
  call npm.cmd run build
  if errorlevel 1 (
    echo Frontend build failed.
    exit /b 1
  )
)

npm.cmd run preview -- --host 127.0.0.1 --port 5173 --strictPort > "%ROOT%frontend.log" 2>&1
if errorlevel 1 (
  echo The frontend stopped. See frontend.log for details.
  pause
)

@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"

echo ============================================
echo  GameStop Intel Platform - Start
echo ============================================
echo.
echo Local mode uses SQLite, so no MySQL/XAMPP service is required.
echo.

echo Starting backend API on port 8000...
start "GameStop Backend" cmd /k "cd /d %ROOT_DIR%backend && ..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo Starting frontend on port 3000...
start "GameStop Frontend" cmd /k "cd /d %ROOT_DIR%frontend && npm run dev"

echo.
echo ============================================
echo  Services are starting.
echo  Backend API: http://localhost:8000
echo  Frontend:    http://localhost:3000
echo  API docs:    http://localhost:8000/docs
echo ============================================
echo.
powershell -NoProfile -Command "Start-Sleep -Seconds 5"
start http://localhost:3000

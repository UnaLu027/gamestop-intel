@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%" >nul

if /I "%~1"=="--check" (
    echo Reinstall script is available.
    popd >nul
    exit /b 0
)

echo ============================================
echo  GameStop Intel Platform - Windows Reinstall
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python was not found. Install Python and make sure it is in PATH.
    goto fail
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found. Install Node.js and make sure npm is in PATH.
    goto fail
)

echo [1/5] Installing backend packages...
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Could not create Python virtual environment.
        goto fail
    )
)
".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: Backend package installation failed.
    goto fail
)

echo.
echo [2/5] Resetting local SQLite database...
pushd backend >nul
"..\.venv\Scripts\python.exe" -c "from database import engine, Base; from database.models import *; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine); print('Database reset complete')"
if errorlevel 1 (
    popd >nul
    echo ERROR: Database reset failed.
    goto fail
)
popd >nul

echo.
echo [3/5] Seeding GameStop demo data...
".venv\Scripts\python.exe" scripts\seed_gamestop_data.py
if errorlevel 1 (
    echo ERROR: Seed data import failed.
    goto fail
)

echo.
echo [4/5] Installing frontend packages...
pushd frontend >nul
npm install
if errorlevel 1 (
    popd >nul
    echo ERROR: Frontend package installation failed.
    goto fail
)
popd >nul

echo.
echo [5/5] Done.
echo.
echo Next command:
echo   start.bat
echo.
echo Frontend: http://localhost:3000
echo API docs: http://localhost:8000/docs
echo.
popd >nul
exit /b 0

:fail
echo.
echo Reinstall did not finish. Fix the error above and run this again:
echo   C:\Projects\gamestop-platform\reinstall.bat
echo.
popd >nul
exit /b 1

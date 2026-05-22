@echo off
setlocal EnableExtensions

echo ============================================
echo  GameStop Intel Platform - Setup
echo ============================================
echo.

echo [1/3] Installing backend packages...
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Could not create Python virtual environment.
        pause
        exit /b 1
    )
)
".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed. Check that Python is installed and in PATH.
    pause
    exit /b 1
)

echo.
echo [2/3] Installing frontend packages...
pushd frontend >nul
npm install
if errorlevel 1 (
    popd >nul
    echo ERROR: npm install failed. Check that Node.js is installed and in PATH.
    pause
    exit /b 1
)
popd >nul

echo.
echo [3/3] Creating local SQLite tables and seed data...
echo.
pushd backend >nul
"..\.venv\Scripts\python.exe" -c "from database import engine, Base; from database.models import *; Base.metadata.create_all(bind=engine); print('Database tables created')"
if errorlevel 1 (
    popd >nul
    echo ERROR: Database setup failed.
    pause
    exit /b 1
)
popd >nul
".venv\Scripts\python.exe" scripts\seed_gamestop_data.py
if errorlevel 1 (
    echo ERROR: Seed data import failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Setup complete. Run start.bat to launch.
echo ============================================
pause

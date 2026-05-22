@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%" >nul

echo ============================================
echo  Build Apache + PHP release
echo ============================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo ERROR: Python virtual environment not found. Run reinstall.bat first.
    goto fail
)

if not exist "gamestop.db" (
    echo ERROR: gamestop.db not found. Run reinstall.bat first.
    goto fail
)

echo [1/4] Exporting demo data for PHP API...
".venv\Scripts\python.exe" scripts\export_php_data.py
if errorlevel 1 goto fail

echo.
echo [2/4] Building React frontend...
pushd frontend >nul
set "VITE_API_BASE=./api/index.php"
call npm run build
set "VITE_API_BASE="
if errorlevel 1 (
    popd >nul
    goto fail
)
popd >nul

echo.
echo [3/4] Copying built frontend into apache-php...
if exist apache-php\assets rmdir /s /q apache-php\assets
if exist apache-php\index.html del /q apache-php\index.html
robocopy frontend\dist apache-php /E /NFL /NDL /NJH /NJS /NC /NS >nul
if %errorlevel% GEQ 8 goto fail

echo.
echo [4/4] Done.
echo Apache/PHP publish folder:
echo   C:\Projects\gamestop-platform\apache-php
echo.
echo Local Apache target:
echo   C:\Apache24\htdocs\gamestop
echo.
popd >nul
exit /b 0

:fail
echo.
echo Build failed. Fix the error above and run:
echo   scripts\build_apache_php.bat
echo.
popd >nul
exit /b 1

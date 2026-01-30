@echo off
echo ========================================
echo  Pushing Liturgia to GitHub
echo ========================================
echo.

cd /d "c:\vidya\Documents\GitHub\Liturgia"

echo Cleaning up any git lock files...
if exist .git\index.lock del /f .git\index.lock 2>nul
if exist .git\config.lock del /f .git\config.lock 2>nul
if exist .git\HEAD.lock del /f .git\HEAD.lock 2>nul
echo.

echo Staging files...
git add .
if errorlevel 1 (
    echo ERROR: Failed to stage files
    pause
    exit /b 1
)
echo Files staged successfully!
echo.

echo Creating commit...
git commit -m "Initial commit: Liturgia Flask application with mass scheduling and member management"
if errorlevel 1 (
    echo ERROR: Failed to create commit
    pause
    exit /b 1
)
echo Commit created successfully!
echo.

echo Pushing to GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo ERROR: Push failed. This could be due to:
    echo   1. Authentication required (you may need to enter credentials)
    echo   2. Network connection issues
    echo   3. Repository already has content
    echo.
    echo If authentication is needed, Git may have opened a separate window.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  SUCCESS! Code pushed to GitHub
echo ========================================
echo.
echo Repository: https://github.com/vidyageorge/Liturgia
echo.
pause

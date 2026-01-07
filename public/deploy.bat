@echo off
echo ---------------------------------------
echo 🚀 Crunchy Waffle Deployment Started...
echo ---------------------------------------

:: Step 1: Add all changes
git add .
if %errorlevel% neq 0 (
    echo ❌ Git Add failed!
    pause
    exit /b
)

:: Step 2: Commit with a timestamp
set commit_msg="Update: %date% %time%"
git commit -m %commit_msg%
if %errorlevel% neq 0 (
    echo ❌ Git Commit failed! (Maybe no changes to commit?)
    pause
    exit /b
)

:: Step 3: Push to Render
echo ⬆️ Pushing code to Render...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ Git Push failed!
    pause
    exit /b
)

echo ---------------------------------------
echo ✅ Deployment Successful!
echo 🌐 Website will be Live in a few minutes.
echo ---------------------------------------
pause
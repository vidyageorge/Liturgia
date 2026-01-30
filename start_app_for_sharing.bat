@echo off
echo ========================================
echo   Starting Liturgia App for Testing
echo ========================================
echo.

cd /d C:\vidya\Documents\GitHub\Liturgia

echo Starting Flask app on http://127.0.0.1:5000
echo.
echo IMPORTANT: After this starts, open ANOTHER command prompt and run:
echo    C:\ngrok\ngrok.exe http 5000
echo.
echo Then share the ngrok URL with your friend!
echo.

call venv\Scripts\activate.bat
python app.py

pause

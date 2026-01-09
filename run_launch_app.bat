@echo off
echo ===================================================
echo MariaDB Local Pilot - Start Script
echo ===================================================

:: Ports clean up
echo [1/3] Nettoyage des processus existants...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -match 'python|node|uvicorn'} | Stop-Process -Force -ErrorAction SilentlyContinue"
timeout /t 2 /nobreak >nul

:: Backend launch
:: NOTE: The Query Poller (generation of slow queries) is disabled by default
:: To enable it, modify ENABLE_QUERY_POLLER=true in backend\.env
echo [2/3] Lancement du Backend (MariaDB AI Service)...
cd backend
start "MariaDB-Backend" /min cmd /c "python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
cd ..

:: Frontend launch
echo [3/3] Lancement du Frontend (Dashboard)...
cd frontend
start "MariaDB-Frontend" /min cmd /k "npx next dev -p 3000"
cd ..

echo ===================================================
echo Everything is starting up !
echo The dashboard will open in a few seconds at http://localhost:3000
echo ===================================================

timeout /t 8
start http://localhost:3000
pause

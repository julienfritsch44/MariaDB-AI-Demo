@echo off
echo ===================================================
echo MariaDB FinOps Auditor - Start Script
echo ===================================================

:: Nettoyage des ports au cas où
echo [1/3] Nettoyage des processus existants...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -match 'python|node|uvicorn'} | Stop-Process -Force -ErrorAction SilentlyContinue"
timeout /t 2 /nobreak >nul

:: Lancement du Backend
echo [2/3] Lancement du Backend (MariaDB AI Service)...
cd backend
start "MariaDB-Backend" /min cmd /c "venv\Scripts\python.exe main.py"
cd ..

:: Lancement du Frontend
echo [3/3] Lancement du Frontend (Dashboard)...
cd frontend
start "MariaDB-Frontend" /min cmd /k "npx next dev -p 3000"
cd ..

echo ===================================================
echo Tout est en cours de lancement !
echo Le dashboard ouvrira dans quelques secondes sur http://localhost:3000
echo ===================================================

timeout /t 8
start http://localhost:3000
pause

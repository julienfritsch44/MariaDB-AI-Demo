@echo off
echo ===================================================
echo MariaDB FinOps Auditor - Start Script
echo ===================================================

:: Nettoyage des ports au cas où
echo [1/3] Nettoyage des processus existants...
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"

:: Lancement du Backend
echo [2/3] Lancement du Backend (MariaDB AI Service)...
cd backend
start "MariaDB-Backend" /min cmd /c "uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
cd ..

:: Lancement du Frontend
echo [3/3] Lancement du Frontend (Dashboard)...
cd frontend
start "MariaDB-Frontend" /min cmd /c "npx next dev -p 3000"
cd ..

echo ===================================================
echo Tout est en cours de lancement !
echo Le dashboard ouvrira dans quelques secondes sur http://localhost:3000
echo ===================================================

timeout /t 8
start http://localhost:3000
pause

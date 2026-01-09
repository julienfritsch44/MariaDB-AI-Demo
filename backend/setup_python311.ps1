# Script de configuration Python 3.11 pour le backend MariaDB Local Pilot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Configuration Python 3.11 - Backend Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier la version de Python
Write-Host "[1/5] Vérification de Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "Version détectée: $pythonVersion" -ForegroundColor Green

if ($pythonVersion -notmatch "3\.11") {
    Write-Host "ERREUR: Python 3.11 n'est pas détecté comme version par défaut" -ForegroundColor Red
    Write-Host "Assurez-vous que Python 3.11 est installé et dans le PATH" -ForegroundColor Red
    exit 1
}

# Supprimer l'ancien environnement virtuel s'il existe
Write-Host ""
Write-Host "[2/5] Nettoyage de l'ancien environnement virtuel..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Remove-Item -Recurse -Force "venv"
    Write-Host "Ancien venv supprimé" -ForegroundColor Green
} else {
    Write-Host "Pas d'ancien venv à supprimer" -ForegroundColor Green
}

# Créer un nouvel environnement virtuel
Write-Host ""
Write-Host "[3/5] Création d'un nouvel environnement virtuel..." -ForegroundColor Yellow
python -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Échec de la création du venv" -ForegroundColor Red
    exit 1
}
Write-Host "Environnement virtuel créé avec succès" -ForegroundColor Green

# Activer l'environnement virtuel
Write-Host ""
Write-Host "[4/5] Activation de l'environnement virtuel..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
Write-Host "Environnement virtuel activé" -ForegroundColor Green

# Mettre à jour pip
Write-Host ""
Write-Host "[4.5/5] Mise à jour de pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
Write-Host "pip mis à jour" -ForegroundColor Green

# Installer les dépendances
Write-Host ""
Write-Host "[5/5] Installation des dépendances depuis requirements.txt..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Échec de l'installation des dépendances" -ForegroundColor Red
    exit 1
}
Write-Host "Dépendances installées avec succès" -ForegroundColor Green

# Test de l'environnement
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Test de l'environnement" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
python test_env.py

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Configuration terminée avec succès!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pour démarrer le backend:" -ForegroundColor Yellow
Write-Host "  1. Assure-toi que l'environnement virtuel est activé" -ForegroundColor White
Write-Host "     .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
Write-Host "  2. Lance le serveur:" -ForegroundColor White
Write-Host "     python main.py" -ForegroundColor Cyan
Write-Host ""

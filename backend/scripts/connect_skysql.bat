@echo off
echo ========================================
echo Connexion a MariaDB SkySQL
echo ========================================
echo.
echo Host: serverless-us-central1.sysp0000.db2.skysql.com
echo Port: 4049
echo User: dbpgf35856331
echo.
echo Entrez le mot de passe par defaut quand demande.
echo.
echo Pour changer le mot de passe une fois connecte:
echo   SET PASSWORD = PASSWORD('VotreNouveauMotDePasse');
echo.
echo ========================================
echo.

"C:\Program Files\MariaDB 12.1\bin\mariadb.exe" --host=serverless-us-central1.sysp0000.db2.skysql.com --port=4049 --user=dbpgf35856331 -p --ssl-verify-server-cert=false

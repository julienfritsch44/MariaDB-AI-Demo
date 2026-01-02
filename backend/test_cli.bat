@echo off
echo Test de connexion MariaDB CLI
echo.
echo Entrez le mot de passe quand demande: 2Gqi9AQ5pNS0J10Vch(lNz
echo.
mariadb --host=serverless-us-central1.sysp0000.db2.skysql.com --port=4049 --user=dbpgf35856331 --password=2Gqi9AQ5pNS0J10Vch(lNz --ssl-verify-server-cert=false -e "SELECT VERSION();"

@echo off
echo Tentative de connexion via MariaDB CLI...
echo.
mariadb --host serverless-us-central1.sysp0000.db2.skysql.com --port 4049 --user dbpgf35856331 -p --ssl-verify-server-cert=false

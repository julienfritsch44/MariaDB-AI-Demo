# Installation du client MariaDB sur Windows

## Méthode 1 : Via Chocolatey (recommandé)
```powershell
choco install mariadb
```

## Méthode 2 : Téléchargement direct
1. Allez sur https://mariadb.com/downloads/
2. Téléchargez "MariaDB Server" pour Windows
3. Installez uniquement le client (décochez le serveur si vous ne voulez que le client)

## Méthode 3 : Via winget
```powershell
winget install MariaDB.Server
```

## Après installation
Redémarrez votre terminal et testez :
```bash
mariadb --version
```

## Connexion à SkySQL
```bash
mariadb --host=serverless-us-central1.sysp0000.db2.skysql.com --port=4049 --user=dbpgf35856331 -p --ssl-verify-server-cert=false
```

Entrez le mot de passe par défaut quand demandé.

## Changer le mot de passe
Une fois connecté :
```sql
SET PASSWORD = PASSWORD('VotreNouveauMotDePasse');
```

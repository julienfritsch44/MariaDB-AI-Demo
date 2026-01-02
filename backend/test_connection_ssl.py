import os
import mariadb
from dotenv import load_dotenv

load_dotenv()

def test_connection_variants():
    """Teste différentes configurations SSL"""
    
    host = os.getenv("SKYSQL_HOST")
    port = int(os.getenv("SKYSQL_PORT", 4049))
    user = os.getenv("SKYSQL_USERNAME")
    password = os.getenv("SKYSQL_PASSWORD")
    
    print("=== Test de connexion MariaDB SkySQL ===\n")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"User: {user}")
    print(f"Password: {password[:5]}...{password[-3:]}\n")
    
    # Configuration 1: SSL avec vérification désactivée
    configs = [
        {
            "name": "SSL sans vérification (ssl_verify_cert=False)",
            "params": {
                "host": host,
                "port": port,
                "user": user,
                "password": password,
                "ssl_verify_cert": False,
                "connect_timeout": 10
            }
        },
        {
            "name": "SSL activé (ssl=True)",
            "params": {
                "host": host,
                "port": port,
                "user": user,
                "password": password,
                "ssl": True,
                "connect_timeout": 10
            }
        },
        {
            "name": "Sans SSL (ssl=False)",
            "params": {
                "host": host,
                "port": port,
                "user": user,
                "password": password,
                "ssl": False,
                "connect_timeout": 10
            }
        },
        {
            "name": "SSL avec dictionnaire vide",
            "params": {
                "host": host,
                "port": port,
                "user": user,
                "password": password,
                "ssl": {},
                "connect_timeout": 10
            }
        }
    ]
    
    for config in configs:
        print(f"\n--- Test: {config['name']} ---")
        try:
            conn = mariadb.connect(**config['params'])
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION(), CURRENT_USER()")
            version, current_user = cursor.fetchone()
            
            print(f"✅ CONNEXION RÉUSSIE!")
            print(f"   Version: {version}")
            print(f"   User: {current_user}")
            
            cursor.close()
            conn.close()
            
            print(f"\n🎉 Configuration fonctionnelle trouvée!")
            print(f"   Utilisez ces paramètres dans database.py")
            return True
            
        except mariadb.Error as e:
            error_msg = str(e)
            if "Access denied" in error_msg:
                print(f"❌ Accès refusé - Mot de passe incorrect")
            elif "Lost connection" in error_msg:
                print(f"❌ Connexion perdue - Problème SSL/réseau")
            else:
                print(f"❌ Erreur: {error_msg[:100]}")
    
    print("\n\n❌ Aucune configuration ne fonctionne.")
    print("\n💡 Le problème vient du mot de passe.")
    print("   Actions à faire:")
    print("   1. Dans l'interface SkySQL, cliquez sur l'icône 👁️ pour voir le mot de passe")
    print("   2. Copiez-le avec l'icône 📋")
    print("   3. OU réinitialisez le mot de passe via l'interface web")
    
    return False

if __name__ == "__main__":
    test_connection_variants()

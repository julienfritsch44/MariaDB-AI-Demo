import os
import requests
import mariadb
from dotenv import load_dotenv

load_dotenv()

def get_service_id():
    """Récupère l'ID du service SkySQL"""
    api_key = os.getenv("SKYSQL_API_KEY")
    host = os.getenv("SKYSQL_HOST")
    
    if not api_key:
        print("❌ SKYSQL_API_KEY non trouvé dans .env")
        return None
    
    headers = {
        "X-API-Key": api_key.strip('"'),
        "Content-Type": "application/json"
    }
    
    try:
        print("Récupération de l'ID du service...")
        resp = requests.get("https://api.skysql.com/provisioning/v1/services", headers=headers, timeout=30)
        
        if resp.status_code == 200:
            services = resp.json()
            for s in services:
                fqdn = s.get('fqdn', '')
                if host in fqdn:
                    service_id = s.get('id', '')
                    print(f"✅ Service trouvé: {s.get('name')} (ID: {service_id})")
                    return service_id
            print("❌ Aucun service correspondant trouvé")
        else:
            print(f"❌ Erreur API: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    return None

def reset_password_via_api(service_id, new_password):
    """Réinitialise le mot de passe via l'API SkySQL"""
    api_key = os.getenv("SKYSQL_API_KEY")
    username = os.getenv("SKYSQL_USERNAME")
    
    headers = {
        "X-API-Key": api_key.strip('"'),
        "Content-Type": "application/json"
    }
    
    # Note: L'API SkySQL ne permet pas directement de changer le mot de passe utilisateur
    # Il faut passer par la console ou se connecter avec le mot de passe actuel
    print("\n⚠️ L'API SkySQL ne permet pas de réinitialiser directement le mot de passe utilisateur.")
    print("Vous devez utiliser l'interface web SkySQL ou vous connecter avec le mot de passe actuel.")
    return False

def test_and_change_password():
    """Teste différents mots de passe et change si connexion réussie"""
    print("=== Test et changement de mot de passe MariaDB SkySQL ===\n")
    
    # Liste de mots de passe à tester
    passwords_to_test = [
        "2Gqi9AQ5pNS0J10Vch(lNz",  # l minuscule
        "2Gqi9AQ5pNS0J10Vch(INz",  # I majuscule
        "2Gqi9AQ5pNS0J10Vch(1Nz",  # 1 chiffre
    ]
    
    host = os.getenv("SKYSQL_HOST")
    port = int(os.getenv("SKYSQL_PORT", 4049))
    user = os.getenv("SKYSQL_USERNAME")
    
    working_password = None
    
    print("Test des différentes variantes du mot de passe...\n")
    for pwd in passwords_to_test:
        try:
            print(f"Test: {pwd[:10]}... ", end="")
            conn = mariadb.connect(
                host=host,
                port=port,
                user=user,
                password=pwd,
                ssl_verify_cert=False,
                connect_timeout=5
            )
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            cursor.close()
            conn.close()
            
            print(f"✅ SUCCÈS! Version: {version[0]}")
            working_password = pwd
            break
            
        except mariadb.Error as e:
            print(f"❌ {str(e)[:50]}")
    
    if not working_password:
        print("\n❌ Aucun mot de passe ne fonctionne.")
        print("\n💡 Solutions possibles:")
        print("1. Vérifiez le mot de passe dans l'interface SkySQL (cliquez sur 👁️)")
        print("2. Réinitialisez le mot de passe via l'interface web SkySQL")
        print("3. Contactez le support SkySQL si le problème persiste")
        return False
    
    # Demander le nouveau mot de passe
    print("\n--- Changement du mot de passe ---")
    new_password = input("Entrez le nouveau mot de passe (ou appuyez sur Entrée pour garder l'actuel): ").strip()
    
    if not new_password:
        print(f"\n✅ Mot de passe actuel conservé: {working_password}")
        print(f"\nMettez à jour le fichier .env:")
        print(f"SKYSQL_PASSWORD={working_password}")
        return True
    
    confirm = input("Confirmez le nouveau mot de passe: ").strip()
    
    if new_password != confirm:
        print("❌ Les mots de passe ne correspondent pas!")
        return False
    
    # Changer le mot de passe
    try:
        print("\nChangement du mot de passe...")
        conn = mariadb.connect(
            host=host,
            port=port,
            user=user,
            password=working_password,
            ssl_verify_cert=False,
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        cursor.execute(f"SET PASSWORD = PASSWORD('{new_password}')")
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Mot de passe changé avec succès!")
        
        # Vérifier
        print("\nVérification...")
        conn = mariadb.connect(
            host=host,
            port=port,
            user=user,
            password=new_password,
            ssl_verify_cert=False,
            connect_timeout=5
        )
        conn.close()
        
        print("✅ Connexion vérifiée avec le nouveau mot de passe!")
        print(f"\nMettez à jour le fichier .env:")
        print(f"SKYSQL_PASSWORD={new_password}")
        
        # Mise à jour automatique du .env
        update = input("\nMettre à jour automatiquement le .env? (o/n): ").strip().lower()
        if update == 'o':
            env_path = os.path.join(os.path.dirname(__file__), '.env')
            with open(env_path, 'r') as f:
                lines = f.readlines()
            
            with open(env_path, 'w') as f:
                for line in lines:
                    if line.startswith('SKYSQL_PASSWORD='):
                        f.write(f'SKYSQL_PASSWORD={new_password}\n')
                    else:
                        f.write(line)
            
            print("✅ Fichier .env mis à jour!")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    test_and_change_password()

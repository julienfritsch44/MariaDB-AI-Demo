import os
import subprocess
import mariadb
from dotenv import load_dotenv

load_dotenv()

def test_connection_with_password(password):
    """Teste la connexion avec un mot de passe donné"""
    try:
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 4049)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=password,
            ssl_verify_cert=False,
            connect_timeout=5
        )
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        cursor.close()
        conn.close()
        return True, version[0]
    except Exception as e:
        return False, str(e)

def change_password_interactive():
    """Change le mot de passe de manière interactive"""
    print("=== Connexion et changement de mot de passe MariaDB SkySQL ===\n")
    
    # Demander le mot de passe actuel
    print("Cliquez sur l'icône 👁️ dans l'interface SkySQL pour voir le mot de passe par défaut")
    current_password = input("Entrez le mot de passe actuel (par défaut): ").strip()
    
    if not current_password:
        print("❌ Mot de passe vide, abandon.")
        return False
    
    # Tester la connexion
    print("\nTest de connexion avec le mot de passe fourni...")
    success, result = test_connection_with_password(current_password)
    
    if not success:
        print(f"❌ Échec de connexion: {result}")
        return False
    
    print(f"✅ Connexion réussie! Version MariaDB: {result}")
    
    # Demander le nouveau mot de passe
    print("\n--- Changement du mot de passe ---")
    new_password = input("Entrez le nouveau mot de passe: ").strip()
    confirm_password = input("Confirmez le nouveau mot de passe: ").strip()
    
    if new_password != confirm_password:
        print("❌ Les mots de passe ne correspondent pas!")
        return False
    
    if not new_password:
        print("❌ Le nouveau mot de passe ne peut pas être vide!")
        return False
    
    # Se connecter et changer le mot de passe
    try:
        print("\nChangement du mot de passe...")
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 4049)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=current_password,
            ssl_verify_cert=False,
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        cursor.execute(f"SET PASSWORD = PASSWORD('{new_password}')")
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n✅ Mot de passe changé avec succès!")
        
        # Vérifier la connexion avec le nouveau mot de passe
        print("\nVérification de la connexion avec le nouveau mot de passe...")
        success, result = test_connection_with_password(new_password)
        
        if success:
            print(f"✅ Connexion vérifiée! Version: {result}")
            print(f"\n📝 Mettez à jour le fichier .env avec:")
            print(f"SKYSQL_PASSWORD={new_password}")
            
            # Proposer de mettre à jour automatiquement le .env
            update = input("\nVoulez-vous mettre à jour automatiquement le fichier .env? (o/n): ").strip().lower()
            if update == 'o':
                env_path = os.path.join(os.path.dirname(__file__), '.env')
                with open(env_path, 'r') as f:
                    content = f.read()
                
                # Remplacer le mot de passe
                import re
                content = re.sub(r'SKYSQL_PASSWORD=.*', f'SKYSQL_PASSWORD={new_password}', content)
                
                with open(env_path, 'w') as f:
                    f.write(content)
                
                print("✅ Fichier .env mis à jour!")
        else:
            print(f"⚠️ Attention: Le mot de passe a été changé mais la vérification a échoué: {result}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du changement de mot de passe: {e}")
        return False

if __name__ == "__main__":
    change_password_interactive()

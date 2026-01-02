import os
import mariadb
from dotenv import load_dotenv

load_dotenv()

def change_password():
    new_password = input("Entrez le nouveau mot de passe: ")
    confirm_password = input("Confirmez le nouveau mot de passe: ")
    
    if new_password != confirm_password:
        print("❌ Les mots de passe ne correspondent pas!")
        return False
    
    try:
        print("\nConnexion avec le mot de passe par défaut...")
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 4049)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=os.getenv("SKYSQL_PASSWORD"),
            ssl_verify_cert=False,
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        
        # Changer le mot de passe
        print("Changement du mot de passe...")
        cursor.execute(f"SET PASSWORD = PASSWORD('{new_password}')")
        conn.commit()
        
        print("\n✅ Mot de passe changé avec succès!")
        print(f"\nMettez à jour le fichier .env avec:")
        print(f"SKYSQL_PASSWORD={new_password}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    print("=== Changement du mot de passe MariaDB SkySQL ===\n")
    change_password()

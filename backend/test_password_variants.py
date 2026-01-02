import os
import mariadb
from dotenv import load_dotenv

load_dotenv()

def test_password(password_to_test, description):
    try:
        conn = mariadb.connect(
            host=os.getenv("SKYSQL_HOST"),
            port=int(os.getenv("SKYSQL_PORT", 4049)),
            user=os.getenv("SKYSQL_USERNAME"),
            password=password_to_test,
            ssl_verify_cert=False,
            connect_timeout=5
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        
        print(f"✅ {description}: SUCCÈS! Version: {version[0]}")
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ {description}: {str(e)[:80]}")
        return False

if __name__ == "__main__":
    print("Test de différentes variantes du mot de passe...\n")
    
    variants = [
        ("2Gqi9AQ5pNS0J10Vch(INz", "Original (I majuscule, N majuscule, z minuscule)"),
        ("2Gqi9AQ5pNS0J10Vch(lNz", "Variante 1 (l minuscule au lieu de I)"),
        ("2Gqi9AQ5pNS0J10Vch(1Nz", "Variante 2 (1 chiffre au lieu de I)"),
        ("2Gqi9AQ5pNS0J10Vch(INZ", "Variante 3 (Z majuscule)"),
    ]
    
    for password, desc in variants:
        if test_password(password, desc):
            print(f"\n🎉 Mot de passe correct trouvé: {password}")
            print(f"\nMettez à jour le .env avec:")
            print(f"SKYSQL_PASSWORD={password}")
            break

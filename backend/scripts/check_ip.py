import requests

def get_public_ip():
    try:
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        ip = response.json()['ip']
        print(f"Votre IP publique actuelle: {ip}")
        return ip
    except Exception as e:
        print(f"Erreur lors de la récupération de l'IP: {e}")
        return None

if __name__ == "__main__":
    get_public_ip()

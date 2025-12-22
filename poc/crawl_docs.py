import requests
from bs4 import BeautifulSoup
import os
import sys
from dotenv import load_dotenv

# Add paths
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
load_dotenv()

from rag.gemini_service import GeminiService
from rag.vector_store import VectorStore

def crawl_mariadb_docs():
    print("Starting MariaDB Documentation Crawler...")
    
    # Target URLs (Knowledge Base)
    urls = [
        "https://mariadb.com/kb/en/slow-query-log-overview/",
        "https://mariadb.com/kb/en/slow-query-log-extended-statistics/",
        "https://mariadb.com/kb/en/mariadb-slow-log-table-and-mysql-slow_log-table/"
    ]
    
    # Init Services
    gemini = GeminiService()
    vs = VectorStore({
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True
    })
    vs.init_schema()

    for url in urls:
        print(f"Crawling: {url}")
        
        try:
            response = requests.get(url)
            if response.status_code != 200:
                print(f"Failed to fetch {url}: {response.status_code}")
                continue
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract content from KB
            content_div = soup.find('div', class_='node-article') or soup.find('div', id='content')
            if not content_div:
                print(f"Could not find main content for {url}")
                continue
                
            text = content_div.get_text(separator='\n', strip=True)
            # Basic cleaning: remove navigation/footer noise
            lines = [line.strip() for line in text.split('\n') if len(line.strip()) > 20]
            clean_text = "\n".join(lines[:30]) # Sub-section for embedding
            
            print(f"Generating embedding for {len(clean_text)} chars...")
            embedding = gemini.get_embedding(clean_text)
            
            if not embedding:
                print(f"Failed to generate embedding for {url}")
                continue

            print(f"Ingesting into Vector Store (Source ID: {url})...")
            vs.add_document(
                source_type="documentation",
                source_id=url,
                content=clean_text,
                embedding=embedding
            )
            
        except Exception as e:
            print(f"Error crawling {url}: {e}")

    print("Documentation ingestion complete!")

if __name__ == "__main__":
    crawl_mariadb_docs()

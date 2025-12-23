"""
Data Ingestion Script for MariaDB Vector Store
Reads Jira CSV and populates doc_embeddings table
"""

import os
import csv
import sys
from typing import List, Dict

# Add parent dir to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.vector_store import VectorStore
from rag.embedding_service import EmbeddingService
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

def get_db_params():
    return {
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True
    }

import json

def process_jira_json(file_path: str) -> List[Dict]:
    """Read and parse Jira JSON for relevant tickets"""
    tickets = []
    print(f"Reading {file_path}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        issues = data.get('issues', [])
        print(f"Found {len(issues)} tickets in JSON.")
        
        for issue in issues:
            key = issue.get('key')
            fields = issue.get('fields', {})
            summary = fields.get('summary', '')
            description = fields.get('description', '') or ''
            
            # Combine text for embedding
            full_text = f"Title: {summary}\n\nDescription: {description}"
            
            tickets.append({
                "source_type": "jira",
                "source_id": key,
                "content": full_text
            })
            
        return tickets
        
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return []

def main():
    print("Starting ingestion process...")
    
    # 1. Init Services
    try:
        store = VectorStore(get_db_params())
        store.init_schema()
        print("Vector Store schema initialized.")
    except Exception as e:
        print(f"Failed to connect/init DB: {e}")
        return

    embedding_service = EmbeddingService()
    
    # 2. Process Jira Data
    jira_path = os.path.join(os.path.dirname(__file__), "..", "jira_sample.json")
    documents = process_jira_json(jira_path)
    
    # 3. Embed and Store
    print(f"Embedding and storing {len(documents)} documents...")
    for doc in documents:
        print(f"Processing {doc['source_id']}...")
        embedding = embedding_service.get_embedding(doc['content'])
        
        if embedding:
            try:
                store.add_document(
                    source_type=doc['source_type'],
                    source_id=doc['source_id'],
                    content=doc['content'],
                    embedding=embedding
                )
            except Exception as e:
                print(f"Error storing {doc['source_id']}: {e}")
        else:
            print(f"Skipping {doc['source_id']} (no embedding generated)")
            
    print("Ingestion complete!")

if __name__ == "__main__":
    main()

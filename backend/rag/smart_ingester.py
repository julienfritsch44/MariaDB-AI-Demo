#!/usr/bin/env python3
"""
Smart Jira Ingester with SQL Extraction
Extracts SQL queries from Jira tickets for better embedding quality
"""

import os
import re
import json
import sys
from typing import List, Dict, Tuple

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.vector_store import VectorStore
from rag.embedding_service import EmbeddingService
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))


# Regex patterns for SQL extraction
SQL_BLOCK_PATTERN = re.compile(
    r'\{code(?::sql)?\}(.*?)\{code\}',
    re.IGNORECASE | re.DOTALL
)

SQL_KEYWORD_PATTERN = re.compile(
    r'(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|EXPLAIN|ANALYZE)\s+',
    re.IGNORECASE
)


def get_db_params():
    return {
        "host": os.getenv("SKYSQL_HOST"),
        "port": int(os.getenv("SKYSQL_PORT", 3306)),
        "user": os.getenv("SKYSQL_USERNAME"),
        "password": os.getenv("SKYSQL_PASSWORD"),
        "ssl": True
    }


def extract_sql_from_text(text: str) -> List[str]:
    """Extract SQL statements from Jira-formatted text"""
    sql_statements = []
    
    # 1. Extract from {code} or {code:sql} blocks
    for match in SQL_BLOCK_PATTERN.finditer(text):
        block = match.group(1).strip()
        # Check if it looks like SQL
        if SQL_KEYWORD_PATTERN.search(block):
            sql_statements.append(block)
    
    return sql_statements


def clean_jira_text(text: str) -> str:
    """Remove Jira formatting noise"""
    if not text:
        return ""
    
    # Remove code blocks (we extract SQL separately)
    text = SQL_BLOCK_PATTERN.sub('', text)
    
    # Remove common Jira formatting
    text = re.sub(r'\{noformat\}.*?\{noformat\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\[~[\w.]+\]', '', text)  # User mentions
    text = re.sub(r'https?://\S+', '', text)  # URLs
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)  # Multiple newlines
    
    return text.strip()


def process_jira_issue(issue: dict) -> List[Dict]:
    """
    Process a Jira issue and create multiple embedding chunks:
    1. Main issue (title + description summary)
    2. SQL queries found in description
    3. SQL queries found in comments (with context)
    """
    chunks = []
    key = issue.get('key', 'unknown')
    fields = issue.get('fields', {})
    
    summary = fields.get('summary', '')
    description = fields.get('description', '') or ''
    
    # Chunk 1: Main issue summary
    main_text = f"[{key}] {summary}"
    clean_desc = clean_jira_text(description)[:800]  # Limit description
    if clean_desc:
        main_text += f"\n\n{clean_desc}"
    
    chunks.append({
        "source_type": "jira",
        "source_id": key,
        "chunk_type": "summary",
        "content": main_text
    })
    
    # Chunk 2: SQL from description
    sql_in_desc = extract_sql_from_text(description)
    for i, sql in enumerate(sql_in_desc[:3]):  # Max 3 SQL per description
        chunks.append({
            "source_type": "jira",
            "source_id": f"{key}#sql-desc-{i+1}",
            "chunk_type": "sql",
            "content": f"[{key}] SQL in description:\n{sql[:500]}"
        })
    
    # Chunk 3: SQL from comments (often contains solutions)
    comments = fields.get('comment', {}).get('comments', [])
    for j, comment in enumerate(comments[:10]):  # Max 10 comments
        comment_body = comment.get('body', '')
        sql_in_comment = extract_sql_from_text(comment_body)
        
        for k, sql in enumerate(sql_in_comment[:2]):  # Max 2 SQL per comment
            author = comment.get('author', {}).get('displayName', 'unknown')
            chunks.append({
                "source_type": "jira",
                "source_id": f"{key}#comment-{j+1}-sql-{k+1}",
                "chunk_type": "sql",
                "content": f"[{key}] SQL in comment by {author}:\n{sql[:500]}"
            })
    
    return chunks


def main():
    print("=" * 60)
    print("Smart Jira Ingester - SQL Extraction Edition")
    print("=" * 60)
    
    # Init services
    try:
        store = VectorStore(get_db_params())
        store.init_schema()
        print("✅ Vector Store connected")
    except Exception as e:
        print(f"❌ Failed to connect to DB: {e}")
        return
    
    embedding_service = EmbeddingService()
    print(f"✅ Embedding model loaded: {embedding_service.model_name}")
    
    # Load Jira data
    jira_path = os.path.join(os.path.dirname(__file__), "..", "jira_sample.json")
    print(f"\n📂 Loading: {jira_path}")
    
    try:
        with open(jira_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        issues = data.get('issues', [])
        print(f"📋 Found {len(issues)} Jira issues")
    except Exception as e:
        print(f"❌ Error loading JSON: {e}")
        return
    
    # Process all issues
    all_chunks = []
    for issue in issues:
        chunks = process_jira_issue(issue)
        all_chunks.extend(chunks)
    
    print(f"\n📊 Statistics:")
    summary_count = sum(1 for c in all_chunks if c['chunk_type'] == 'summary')
    sql_count = sum(1 for c in all_chunks if c['chunk_type'] == 'sql')
    print(f"   - Summary chunks: {summary_count}")
    print(f"   - SQL chunks: {sql_count}")
    print(f"   - Total chunks: {len(all_chunks)}")
    
    # Embed and store
    print(f"\n🔄 Embedding and storing...")
    success = 0
    errors = 0
    
    for i, chunk in enumerate(all_chunks):
        try:
            embedding = embedding_service.get_embedding(chunk['content'])
            if embedding:
                store.add_document(
                    source_type=chunk['source_type'],
                    source_id=chunk['source_id'],
                    content=chunk['content'],
                    embedding=embedding
                )
                success += 1
            else:
                errors += 1
        except Exception as e:
            errors += 1
            if errors <= 5:  # Only print first 5 errors
                print(f"   ⚠️ Error on {chunk['source_id']}: {e}")
        
        # Progress
        if (i + 1) % 20 == 0:
            print(f"   Processed {i+1}/{len(all_chunks)}...")
    
    print(f"\n✅ Complete!")
    print(f"   - Successfully stored: {success}")
    print(f"   - Errors: {errors}")
    
    # Verify
    try:
        count = store.get_document_count()
        print(f"   - Total documents in DB: {count}")
    except:
        pass


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--clear', action='store_true', help='Clear existing documents before ingestion')
    args = parser.parse_args()
    
    if args.clear:
        print("🗑️ Clearing existing documents...")
        try:
            import mariadb
            conn = mariadb.connect(
                host=os.getenv("SKYSQL_HOST"),
                port=int(os.getenv("SKYSQL_PORT", 3306)),
                user=os.getenv("SKYSQL_USERNAME"),
                password=os.getenv("SKYSQL_PASSWORD"),
                database="finops_auditor",
                ssl=True
            )
            cursor = conn.cursor()
            cursor.execute("DELETE FROM doc_embeddings")
            conn.commit()
            conn.close()
            print("✅ All existing documents cleared")
        except Exception as e:
            print(f"⚠️ Could not clear: {e}")
    
    main()

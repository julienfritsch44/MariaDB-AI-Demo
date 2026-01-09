
import os
import re
import json
import sys
from typing import List, Dict, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
    sql_statements = []
    for match in SQL_BLOCK_PATTERN.finditer(text):
        block = match.group(1).strip()
        if SQL_KEYWORD_PATTERN.search(block):
            sql_statements.append(block)
    return sql_statements

def clean_jira_text(text: str) -> str:
    if not text:
        return ""
    text = SQL_BLOCK_PATTERN.sub('', text)
    text = re.sub(r'\{noformat\}.*?\{noformat\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\[~[\w.]+\]', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def process_jira_issue(issue: dict) -> List[Dict]:
    chunks = []
    key = issue.get('key', 'unknown')
    fields = issue.get('fields', {})
    summary = fields.get('summary', '')
    description = fields.get('description', '') or ''
    main_text = f"[{key}] {summary}"
    clean_desc = clean_jira_text(description)[:800]
    if clean_desc:
        main_text += f"\n\n{clean_desc}"
    chunks.append({
        "source_type": "jira",
        "source_id": key,
        "chunk_type": "summary",
        "content": main_text
    })
    sql_in_desc = extract_sql_from_text(description)
    for i, sql in enumerate(sql_in_desc[:3]):
        chunks.append({
            "source_type": "jira",
            "source_id": f"{key}#sql-desc-{i+1}",
            "chunk_type": "sql",
            "content": f"[{key}] SQL in description:\n{sql[:500]}"
        })
    comments = fields.get('comment', {}).get('comments', [])
    for j, comment in enumerate(comments[:10]):
        comment_body = comment.get('body', '')
        sql_in_comment = extract_sql_from_text(comment_body)
        for k, sql in enumerate(sql_in_comment[:2]):
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
    print("Smart Jira Ingester - Batch Mode")
    print("=" * 60)
    try:
        from database import get_db_connection
        conn_test = get_db_connection()
        if hasattr(conn_test, 'cursor'):
            print("OK - Database connection test passed")
            conn_test.close()
        store = VectorStore(get_db_params())
        store.init_schema()
        print("OK - Vector Store schema initialized")
    except Exception as e:
        print(f"FAILED to connect to DB: {e}")
        return
    embedding_service = EmbeddingService()
    print(f"OK - Embedding model loaded: {embedding_service.model_name}")
    jira_path = os.path.join(os.path.dirname(__file__), "..", "jira_optimizer_issues.json")
    print(f"Loading: {jira_path}")
    try:
        with open(jira_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        issues = data.get('issues', [])
        print(f"Found {len(issues)} Jira issues")
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return
    all_chunks = []
    for issue in issues:
        all_chunks.extend(process_jira_issue(issue))
    print(f"Total chunks to process: {len(all_chunks)}")
    batch_size = 32
    print(f"Embedding and storing in batches of {batch_size}...")
    success = 0
    errors = 0
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]
        batch_texts = [c['content'] for c in batch]
        try:
            embeddings = embedding_service.get_embeddings_batch(batch_texts)
            if len(embeddings) == len(batch):
                for chunk, emb in zip(batch, embeddings):
                    try:
                        store.add_document(
                            source_type=chunk['source_type'],
                            source_id=chunk['source_id'],
                            content=chunk['content'],
                            embedding=emb
                        )
                        success += 1
                    except Exception as e:
                        errors += 1
            else:
                errors += len(batch)
        except Exception as e:
            errors += len(batch)
        if (i + batch_size) % 128 == 0 or (i + batch_size) >= len(all_chunks):
            print(f"Processed {min(i + batch_size, len(all_chunks))}/{len(all_chunks)}...")
    print(f"Ingestion Complete!")
    print(f"Successfully stored: {success}")
    print(f"Errors: {errors}")
    try:
        count = store.get_document_count()
        print(f"Total documents in DB: {count}")
    except Exception as e:
        print(f"Could not verify count: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--clear', action='store_true')
    args = parser.parse_args()
    if args.clear:
        print("Clearing existing documents...")
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
            print("OK - Documents cleared")
        except Exception as e:
            print(f"Error clearing: {e}")
    main()

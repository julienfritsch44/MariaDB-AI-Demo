
import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load env variables
load_dotenv(override=True)

from rag.vector_store import VectorStore

def main():
    print("Initializing Vector Store Schema...")
    
    # Init VectorStore - it will read params from env via get_db_connection internally 
    # but we need to pass something to constructor 
    vs = VectorStore({})
    
    try:
        vs.init_schema()
        print("Vector Store Schema initialized successfully!")
    except Exception as e:
        print(f"Error initializing vector store: {e}")
        # Print full stack trace
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

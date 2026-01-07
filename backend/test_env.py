import sys
print(f"Python {sys.version}")
try:
    import pydantic
    print(f"Pydantic: {pydantic.VERSION}")
except ImportError as e:
    print(f"Pydantic import failed: {e}")

try:
    import typing_extensions
    print(f"typing_extensions: {typing_extensions.__version__}")
except ImportError as e:
    print(f"typing_extensions import failed: {e}")

try:
    import fastapi
    print(f"FastAPI: {fastapi.__version__}")
    from fastapi import FastAPI
    print("FastAPI class imported successfully")
except Exception as e:
    print(f"FastAPI import failed: {e}")
    import traceback
    traceback.print_exc()

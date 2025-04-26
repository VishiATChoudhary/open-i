import chromadb
import json
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import threading
import time

def setup_vector_db():
    # Create Vector Database
    client = chromadb.PersistentClient()
    
    # Create or get collection
    collection = client.get_or_create_collection(name="vdb_collection", metadata={"hnsw:space": "cosine"})
    
    # Load JSON data
    with open('logs/gemini-responses1.json', 'r') as f:
        data = json.load(f)
    
    # Setup text splitter
    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        model_name="gpt-4",
        chunk_size=800,
        chunk_overlap=400,
    )
    
    # Split text into chunks
    chunks = text_splitter.split_text(str(data))
    
    # Insert chunks into collection
    for i, chunk in enumerate(chunks):
        collection.add(
            documents=[chunk],
            ids=[f"chunk_{i}"]
        )
    
    # Add the first json object to the collection again
    collection.add(
        documents=[str(data)],
        ids=["chunk_0"]
    )
    
    return collection

def create_fastapi_app(collection):
    app = FastAPI()
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Define request model
    class QueryRequest(BaseModel):
        query: str

    class StoreDocumentRequest(BaseModel):
        document: str
    
    # Define query endpoint
    @app.post("/query")
    async def query_chroma(request: QueryRequest):
        results = collection.query(query_texts=[request.query], n_results=5)
        return {"results": results['documents'][0]}
    
    # Define store document endpoint
    @app.post("/store")
    async def store_document(request: StoreDocumentRequest):
        # Generate a unique ID based on timestamp
        doc_id = f"gemini_{int(time.time() * 1000)}"
        collection.add(
            documents=[request.document],
            ids=[doc_id]
        )
        return {"status": "success", "id": doc_id}
    
    return app

def run_api(app):
    uvicorn.run(app, host="0.0.0.0", port=8000)

def main():
    # Setup vector database
    collection = setup_vector_db()
    
    # Create FastAPI app
    app = create_fastapi_app(collection)
    
    # Run the API
    run_api(app)

if __name__ == "__main__":
    main() 
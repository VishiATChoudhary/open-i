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
        try:
            # Get all documents and sort by timestamp
            results = collection.get(
                include=["documents", "metadatas"]
            )
            
            # Filter out documents without a timestamp
            filtered = [
                (doc, meta) for doc, meta in zip(results['documents'], results['metadatas'])
                if meta and 'timestamp' in meta
            ]
            # Sort by timestamp in descending order
            sorted_results = sorted(
                filtered,
                key=lambda x: x[1]['timestamp'],
                reverse=True
            )
            
            # Return the 5 most recent documents
            recent_docs = [doc for doc, _ in sorted_results[:5]]
            return {"results": recent_docs}
        except Exception as e:
            print(f"Error querying documents: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    # Define store document endpoint
    @app.post("/store")
    async def store_document(request: StoreDocumentRequest):
        try:
            # Generate a unique ID based on timestamp
            timestamp = int(time.time() * 1000)
            doc_id = f"gemini_{timestamp}"
            print(f"Attempting to store document with ID: {doc_id}")
            print(f"Document content: {request.document[:100]}...")  # Print first 100 chars
            
            # Validate document content
            if not request.document or len(request.document.strip()) == 0:
                raise ValueError("Document content cannot be empty")
            
            # Store in collection with metadata
            collection.add(
                documents=[request.document],
                ids=[doc_id],
                metadatas=[{"timestamp": timestamp}]
            )
            print(f"Successfully stored document with ID: {doc_id}")
            return {"status": "success", "id": doc_id, "message": "Document stored successfully"}
        except ValueError as ve:
            print(f"Validation error: {str(ve)}")
            return {"status": "error", "message": str(ve)}
        except Exception as e:
            print(f"Error storing document: {str(e)}")
            print(f"Error type: {type(e)}")
            return {"status": "error", "message": f"Failed to store document: {str(e)}"}
    
    # Print available routes for debugging
    print("Available routes:")
    for route in app.routes:
        print(f"  {route.path} [{route.methods}]")
    
    return app

def run_api(app):
    print("Starting FastAPI server...")
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
"""
txtai FastAPI service for Cora RAG implementation
Provides document processing and vector search capabilities
"""

import io
import hashlib
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pypdf
from docx import Document
import openpyxl
import markdown

from txtai import Embeddings

# Download NLTK data
import nltk
nltk.download('punkt', quiet=True)

app = FastAPI(title="Cora RAG Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize txtai components
embeddings = Embeddings({
    "path": "sentence-transformers/all-MiniLM-L6-v2",
    "content": True,
    "format": "json"
})

# Initialize segmentation with fallback
segmentation = None

def get_segmentation():
    global segmentation
    if segmentation is None:
        try:
            from txtai.pipeline import Segmentation
            segmentation = Segmentation(sentences=True)
        except ImportError:
            # Fallback to simple sentence splitting if NLTK not available
            class SimpleSegmentation:
                def __call__(self, text):
                    import re
                    sentences = re.split(r'[.!?]+', text)
                    return [s.strip() for s in sentences if s.strip()]
            segmentation = SimpleSegmentation()
    return segmentation

# In-memory storage (will be replaced with persistent storage)
documents_store = {}


class DocumentRequest(BaseModel):
    """Document upload request model"""
    content: str
    title: str
    metadata: Optional[Dict[str, Any]] = {}


class SearchRequest(BaseModel):
    """Search request model"""
    query: str
    limit: int = 5
    threshold: float = 0.5


class ChunkRequest(BaseModel):
    """Document chunking request"""
    content: str
    chunk_size: int = 500
    overlap: int = 50


class ProcessResponse(BaseModel):
    """Document processing response"""
    doc_id: str
    chunks: int
    title: str
    status: str = "success"


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "txtai-rag"}


@app.post("/process/text", response_model=ProcessResponse)
async def process_text(request: DocumentRequest):
    """Process text document and create embeddings"""
    try:
        # Generate document ID
        doc_id = hashlib.md5(request.content.encode()).hexdigest()

        # Segment text into chunks
        chunks = get_segmentation()(request.content)

        # Prepare documents for indexing
        documents = []
        for i, chunk in enumerate(chunks):
            documents.append({
                "id": f"{doc_id}_{i}",
                "text": chunk,
                "doc_id": doc_id,
                "title": request.title,
                "chunk_index": i,
                **request.metadata
            })

        # Store document metadata
        documents_store[doc_id] = {
            "title": request.title,
            "chunks": len(chunks),
            "metadata": request.metadata
        }

        # Index documents
        if not embeddings.config.get("path"):
            embeddings.index(documents)
        else:
            # Append to existing index
            existing = list(embeddings.search("SELECT * FROM sections", limit=10000))
            existing.extend(documents)
            embeddings.index(existing)

        return ProcessResponse(
            doc_id=doc_id,
            chunks=len(chunks),
            title=request.title
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process/file", response_model=ProcessResponse)
async def process_file(file: UploadFile = File(...)):
    """Process uploaded file (PDF, DOCX, XLSX, TXT, MD)"""
    try:
        content = await file.read()
        text_content = ""

        if file.filename.lower().endswith('.pdf'):
            # Process PDF
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text_content += page.extract_text() + "\n"

        elif file.filename.lower().endswith('.docx'):
            # Process Word document
            doc = Document(io.BytesIO(content))
            for paragraph in doc.paragraphs:
                text_content += paragraph.text + "\n"

        elif file.filename.lower().endswith('.xlsx'):
            # Process Excel
            workbook = openpyxl.load_workbook(io.BytesIO(content))
            for sheet in workbook.worksheets:
                for row in sheet.iter_rows(values_only=True):
                    text_content += " ".join(str(cell) for cell in row if cell) + "\n"

        elif file.filename.lower().endswith('.md'):
            # Process Markdown
            text_content = markdown.markdown(content.decode('utf-8'))

        else:
            # Process as plain text
            text_content = content.decode('utf-8')

        # Process the extracted text
        request = DocumentRequest(
            content=text_content,
            title=file.filename,
            metadata={"filename": file.filename, "content_type": file.content_type}
        )

        return await process_text(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
async def search(request: SearchRequest):
    """Search for similar content"""
    try:
        if not embeddings.config.get("path"):
            return {"results": [], "message": "No documents indexed"}

        # Perform similarity search
        results = embeddings.search(request.query, limit=request.limit)

        # Filter by threshold and format results
        formatted_results = []
        for result in results:
            if result["score"] >= request.threshold:
                formatted_results.append({
                    "text": result.get("text", ""),
                    "score": result["score"],
                    "doc_id": result.get("doc_id", ""),
                    "title": result.get("title", ""),
                    "chunk_index": result.get("chunk_index", 0)
                })

        return {"results": formatted_results, "query": request.query}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chunk")
async def chunk_text(request: ChunkRequest):
    """Chunk text into smaller segments"""
    try:
        # Use segmentation pipeline
        chunks = get_segmentation()(request.content)

        # Apply custom chunk size if needed
        if request.chunk_size:
            # Custom chunking logic here if needed
            pass

        return {
            "chunks": chunks,
            "count": len(chunks),
            "avg_size": sum(len(c) for c in chunks) / len(chunks) if chunks else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
async def list_documents():
    """List all indexed documents"""
    return {"documents": list(documents_store.values()), "count": len(documents_store)}


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from the index"""
    try:
        if doc_id not in documents_store:
            raise HTTPException(status_code=404, detail="Document not found")

        # Remove from store
        del documents_store[doc_id]

        # Re-index without this document
        if embeddings.config.get("path"):
            remaining = embeddings.search(
                f"SELECT * FROM sections WHERE doc_id != '{doc_id}'",
                limit=10000
            )
            embeddings.index(list(remaining))

        return {"message": "Document deleted", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_stats():
    """Get service statistics"""
    try:
        total_chunks = 0
        if embeddings.config.get("path"):
            total_chunks = len(list(embeddings.search("SELECT * FROM sections", limit=10000)))

        return {
            "documents": len(documents_store),
            "chunks": total_chunks,
            "model": "sentence-transformers/all-MiniLM-L6-v2",
            "status": "operational"
        }
    except Exception as e:
        return {
            "documents": len(documents_store),
            "chunks": 0,
            "model": "sentence-transformers/all-MiniLM-L6-v2",
            "status": "error",
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
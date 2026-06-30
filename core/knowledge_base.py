import os
from typing import TypedDict, Dict, Any, List
from langgraph.graph import StateGraph, START, END
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_pinecone import PineconeVectorStore, PineconeEmbeddings
from pinecone import Pinecone

# =====================================================================
# 1. STATE DEFINITION MATRIX
# =====================================================================
class IngestionState(TypedDict):
    """
    Tracks the shared memory state of the JD ingestion graph.
    """
    file_path: str                 # Absolute physical path to the saved PDF file
    raw_text: str                  # Plucked string text extracted from the file
    chunks: List[Any]              # Array of structured text chunk documents
    collection_name: str           # Unique directory partition identifier for this specific JD
    ingestion_status: str          # Final confirmation message logged to console

# =====================================================================
# 2. AUTONOMOUS AGENT NODES
# =====================================================================

def pdf_extraction_node(state: IngestionState) -> Dict[str, Any]:
    """
    Node 1: Extract raw text from the uploaded PDF document.
    """
    print("\n--- [Node 1: Extracting text from PDF Document...] ---")
    target_path = state["file_path"]
    
    loader = PyPDFLoader(target_path)
    pages = loader.load()
    extracted_text = " ".join([page.page_content for page in pages])
    
    print(f"✓ Successfully extracted {len(extracted_text)} characters from document.")
    return {"raw_text": extracted_text}


def text_chunking_node(state: IngestionState) -> Dict[str, Any]:
    """
    Node 2: Break massive text blocks into smart overlapping chunks.
    Optimized with semantic separators to preserve bullet points and resume structure.
    """
    print("\n--- [Node 2: Processing character text splitting...] ---")
    source_text = state["raw_text"]
    
    # 1000 character chunks preserve full context blocks better than 500
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", "•", "-", " ", ""],
        length_function=len
    )
    text_chunks = splitter.create_documents([source_text])
    
    print(f"✓ Formed {len(text_chunks)} distinct structural chunks from knowledge pool.")
    return {"chunks": text_chunks}


def local_vector_storage_node(state: IngestionState) -> Dict[str, Any]:
    """
    Node 3: Compute embedding vectors locally and save them to an isolated folder using Chroma.
    """
    print("\n--- [Node 3: Indexing vectors into local Chroma DB instance...] ---")
    pinecone_api_key = os.environ.get("PINECONE_API_KEY", "")
    
    # Using Pinecone's free integrated Llama embeddings (no OpenAI key needed!)
    embeddings_engine = PineconeEmbeddings(
        model="llama-text-embed-v2",
        pinecone_api_key=pinecone_api_key
    )
    
    pinecone_api_key = os.environ.get("PINECONE_API_KEY", "")
    index_name = os.environ.get("PINECONE_INDEX_NAME", "matcha-index")
    
    if pinecone_api_key:
        pc = Pinecone(api_key=pinecone_api_key)
        vector_store = PineconeVectorStore.from_documents(
            documents=document_chunks,
            embedding=embeddings_engine,
            index_name=index_name,
            namespace=target_collection
        )
    else:
        from langchain_chroma import Chroma
        persist_directory = os.path.join(os.getcwd(), "chroma_storage")
        vector_store = Chroma.from_documents(
            documents=document_chunks,
            embedding=embeddings_engine,
            collection_name=target_collection,
            persist_directory=persist_directory
        )
    
    status_log = f"Successfully synchronized {len(document_chunks)} vector records inside local collection '{target_collection}'."
    print(f"✓ {status_log}")
    return {"ingestion_status": status_log}

# =====================================================================
# 3. GRAPH ORCHESTRATION COMPILATION
# =====================================================================

# Initialize state machine using our strict IngestionState dictionary schema
builder = StateGraph(IngestionState)

# Register independent nodes inside execution pipeline matrix
# (We keep the extractor node registered so your code structure doesn't break)
builder.add_node("extractor", pdf_extraction_node)
builder.add_node("chunker", text_chunking_node)
builder.add_node("local_store", local_vector_storage_node)

# =====================================================================
# 🔥 THE FIX: CHANGE THE STARTING EDGE POINTER
# =====================================================================
# Route START directly to the chunker since views.py already handled text extraction!
builder.add_edge(START, "chunker")
builder.add_edge("chunker", "local_store")
builder.add_edge("local_store", END)

# Compile into a production runnable graph application
jd_ingestion_pipeline = builder.compile()
import os
import sys
import django

# Set up the Django runtime environment configuration
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "matcha_backend.settings") # Swap with your main project name if different
django.setup()

from core.models import JobDescription
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

def run_pipeline_diagnostic():
    print("==================================================")
    print("🍵 MATCHA.AI RAG KNOWLEDGE BASE DIAGNOSTIC MATRIX")
    print("==================================================\n")

    # 1. Verify Django Database Records Exist
    jd_record = JobDescription.objects.last()
    if not jd_record:
        print("✗ [FAIL]: No Job Description profiles found inside SQLite. Please upload a PDF via the frontend first.")
        return

    print(f"✓ [SQLITE]: Found active target pipeline.")
    print(f"  - ID: #{jd_record.id}")
    print(f"  - Title: {jd_record.title}")
    
    # CRASH PROTECTION: Safely check if a file field exists, otherwise skip printing it
    if hasattr(jd_record, 'file') and jd_record.file:
        print(f"  - File Path: {jd_record.file.path}\n")
    elif hasattr(jd_record, 'pdf_file') and jd_record.pdf_file:
        print(f"  - File Path: {jd_record.pdf_file.path}\n")
    else:
        print(f"  - File Path: Path handled via direct text upload stream.\n")

    # 2. Verify Local Chroma Disk Storage Exists
    persist_directory = os.path.join(os.getcwd(), "chroma_storage")
    if not os.path.exists(persist_directory):
        print(f"✗ [FAIL]: Directory '{persist_directory}' does not exist on disk. Vectors haven't been compiled yet.")
        return
    print(f"✓ [DISK]: Verified local 'chroma_storage' folder directory structure is visible.")

    # 3. Initialize Local Embeddings Engine & Load the Vector Store
    print("⚡ Hydrating local Vector DB embedding layers via Ollama...")
    embeddings_engine = OllamaEmbeddings(model="nomic-embed-text")
    collection_identifier = f"jd_collection_{jd_record.id}"

    try:
        vector_db = Chroma(
            collection_name=collection_identifier,
            embedding_function=embeddings_engine,
            persist_directory=persist_directory
        )
        
        # Pull underlying chunk metrics to verify data exists
        total_vectors = len(vector_db.get().get("ids", []))
        print(f"✓ [CHROMA]: Successfully connected to collection '{collection_identifier}'.")
        print(f"  - Extracted Text Chunks Vector Count: {total_vectors} chunks indexed.\n")

        if total_vectors == 0:
            print("⚠ [WARN]: Collection is empty. Re-upload your PDF file through the web UI.")
            return

        # 4. Execute Similarity Search Test
        test_query = "What are the core technical stack requirements and programming frameworks?"
        print(f"🔍 Executing Similarity Query Match Test...")
        print(f"  - Target Query: \"{test_query}\"")

        # Fetch top 2 closest matching blocks using Cosine Similarity Distance
        matched_docs = vector_db.similarity_search(test_query, k=2)

        print("\n==================================================")
        print("🎯 SIMILARITY SEARCH RESULTS RETRIEVED FROM DATABASE")
        print("==================================================")
        for idx, doc in enumerate(matched_docs, start=1):
            print(f"\n[CHUNK RELEVANCY MATRIX #{idx}]")
            print(f"--------------------------------------------------")
            print(doc.page_content.strip())
            print(f"--------------------------------------------------")

        print("\n==================================================")
        print("🏁 DIAGNOSTIC COMPLETE: RAG ENGINE IS ENTERPRISE-READY!")
        print("==================================================")

    except Exception as e:
        print(f"🔥 [CRASH]: Diagnostic process encountered a runtime failure: {str(e)}")

if __name__ == "__main__":
    run_pipeline_diagnostic()
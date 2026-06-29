from rest_framework.decorators import api_view, parser_classes, authentication_classes, permission_classes
from .authentication import ClerkJWTAuthentication
from .permissions import IsHRAdmin
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from pypdf import PdfReader
from django.core.mail import send_mail

# Import your local database models and the LangGraph multi-agent application
from .models import JobDescription, Candidate, EvaluationReport, UserProfile, InterviewSession
from .agents import matcha_agent_app
from .knowledge_base import jd_ingestion_pipeline


def extract_text_from_pdf(pdf_file):
    """Helper function to extract plain text from an uploaded PDF file object using pypdf."""
    try:
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        print(f"PDF Extraction Error: {str(e)}")
        return None


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@authentication_classes([ClerkJWTAuthentication])
@permission_classes([IsHRAdmin])
def upload_jd_view(request):
    title = request.data.get('title')
    uploaded_file = request.FILES.get('file')
    raw_text_input = request.data.get('raw_text')
    
    if not title:
        return Response({"error": "Missing title parameter"}, status=status.HTTP_400_BAD_REQUEST)
        
    if not uploaded_file and not raw_text_input:
        return Response({"error": "Must provide either a JD PDF file or raw text."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        if raw_text_input:
            extracted_text = raw_text_input
        else:
            print(f"\n--- [Step 1: Extracting text from Job Description PDF] ---")
            # 1. Extract text from the uploaded PDF using your existing helper function
            extracted_text = extract_text_from_pdf(uploaded_file)
            
        if not extracted_text:
            return Response({"error": "Failed to parse text from the uploaded JD PDF document or input."}, status=status.HTTP_400_BAD_REQUEST)
            
        print(f"✓ Extracted {len(extracted_text)} characters from JD stream.")

        print("--- [Step 2: Registering Master Row inside db.sqlite3] ---")
        # 2. Create the SQLite record matching your exact model layout schema fields!
        jd_record = JobDescription.objects.create(
            title=title,
            raw_text=extracted_text,
            status="Active"
        )
        print(f"✓ SQLite Record successfully committed with ID #{jd_record.id}")

        print("--- [Step 3: Triggering LangGraph RAG Vector Ingestion Pipeline] ---")
        # 3. Create a unique collection identifier using the database record primary key
        collection_identifier = f"jd_collection_{jd_record.id}"
        
        # 4. Supply state keys matching your IngestionState schema configuration
        graph_inputs = {
            "file_path": "",                         # No file path required since we pass raw string text
            "collection_name": collection_identifier,
            "raw_text": extracted_text,             # Send the extracted text straight to the chunking node
            "chunks": [],
            "ingestion_status": ""
        }
        
        # 5. Run the LangGraph execution flow synchronously
        output_state = jd_ingestion_pipeline.invoke(graph_inputs)
        print(f"✓ Pipeline Finished: {output_state.get('ingestion_status')}\n")
        
        return Response({
            "message": "Job description parsed, saved to SQLite, and synced with local Chroma Knowledge Base.",
            "jd_id": jd_record.id,
            "status_log": output_state.get("ingestion_status")
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"🔥 Django View Ingestion Exception Error: {str(e)}")
        return Response({"error": f"Internal pipeline crash: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_resume_view(request):
    """API to process Candidate Resumes via physical PDF upload layout."""
    
    jd_id = request.data.get('jd_id') or request.POST.get('jd_id')
    candidate_name = request.data.get('name') or request.POST.get('name') or 'Unknown Candidate'
    email = request.data.get('email') or request.POST.get('email', None)
    file = request.FILES.get('file')

    if not jd_id:
        return Response({"error": "Please provide a target Job Description ID ('jd_id')."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        jd = JobDescription.objects.get(id=jd_id)
    except JobDescription.DoesNotExist:
        return Response({"error": f"No active Job Description found with ID {jd_id}."}, status=status.HTTP_404_NOT_FOUND)

    if not file:
        return Response({"error": "Please upload a valid Candidate Resume PDF file."}, status=status.HTTP_400_BAD_REQUEST)

    extracted_text = extract_text_from_pdf(file)

    if not extracted_text:
        return Response({"error": "Failed to extract text from the provided resume PDF document."}, status=status.HTTP_400_BAD_REQUEST)

    print("\n" + "="*60)
    print(f"EXTRACTING TEXT FROM CANDIDATE RESUME: {candidate_name}")
    print("="*60)
    try:
        print(extracted_text.encode('ascii', 'ignore').decode('ascii'))
    except Exception:
        pass
    print("="*60 + "\n")

    # =====================================================================
    # MODIFIED BLOCK: Save both the physical file and the extracted text
    # =====================================================================
    candidate = Candidate.objects.create(
        job_description=jd,
        candidate_name=candidate_name,
        email=email,
        resume_file=file,           # Django automatically saves this UploadedFile to media/resumes/
        resume_text=extracted_text,  # Saves the string directly to the DB for fast retrieval
        status='Evaluating'         # Initial status while AI processes
    )

    # Dispatch Celery background task
    from .tasks import process_resume_task
    process_resume_task.delay(candidate.id)

    return Response({
        "message": "Resume uploaded successfully. AI analysis is running in the background.",
        "candidate_id": candidate.id,
        "candidate_name": candidate.candidate_name,
        "linked_to_job": jd.title,
        "status": "Processing"
    }, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
def get_all_jds_view(request):
    """API to fetch all historical and active Job Descriptions from the database."""
    jds = JobDescription.objects.all().order_by('-id')[:50]
    
    jd_list = []
    for jd in jds:
        jd_list.append({
            "id": jd.id,
            "title": jd.title,
            "raw_text": jd.raw_text,
            "created_at": jd.created_at
        })
        
    return Response(jd_list, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([ClerkJWTAuthentication])
@permission_classes([IsHRAdmin])
def get_candidates(request):
    # Fetch jd_id from query params to filter if needed
    jd_id = request.query_params.get('jd_id')
    queryset = Candidate.objects.select_related('job_description', 'evaluation_report')
    
    if jd_id:
        queryset = queryset.filter(job_description_id=jd_id)
        
    from django.db.models import F
    # Order by the related model's score, nulls last since pending candidates don't have a report yet
    candidates = queryset.order_by(F('evaluation_report__final_rank_score').desc(nulls_last=True))
    
    formatted_data = []
    
    for candidate in candidates:
        # 1. Get Job Title
        role_title = candidate.job_description.title if candidate.job_description else "Unspecified Role"

        # 2. Extract AI Data from the related EvaluationReport model
        # We use hasattr to check if the report exists, preventing crashes if a candidate hasn't been evaluated yet
        if hasattr(candidate, 'evaluation_report'):
            report = candidate.evaluation_report
            score = report.skill_match_score
            summary = report.screening_summary
            
            # Safely handle JSON fields which might be None
            gap_analysis = report.skill_gap_analysis or {}
            matching_skills = gap_analysis.get('matching_skills', [])
            missing_skills = gap_analysis.get('missing_skills', [])
            questions = report.interview_questions or []
            feedback = report.final_feedback or ""
        else:
            # Fallback if the AI hasn't finished processing this candidate
            score = 0
            summary = "AI Evaluation Pending or Failed."
            matching_skills = []
            missing_skills = []
            questions = []
            feedback = ""

        # 3. Package it perfectly for your React Frontend
        formatted_data.append({
            "id": candidate.id,
            "name": candidate.candidate_name,
            "role": role_title,
            "score": score,
            "summary": summary,
            "matching_skills": matching_skills,
            "missing_skills": missing_skills,
            "questions": questions,
            "feedback": feedback,
            "status": candidate.status
        })
        
    return Response(formatted_data)

@api_view(['POST'])
@authentication_classes([ClerkJWTAuthentication])
@permission_classes([IsHRAdmin])
def update_candidate_status(request):
    """API to update a candidate's Kanban stage/status."""
    candidate_id = request.data.get('candidate_id')
    new_status = request.data.get('status')
    
    if not candidate_id or not new_status:
        return Response({"error": "Missing candidate_id or status"}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        candidate = Candidate.objects.get(id=candidate_id)
        candidate.status = new_status
        candidate.save()
        return Response({"message": "Status updated successfully", "status": candidate.status}, status=status.HTTP_200_OK)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def sync_user_profile(request):
    """API to sync Clerk user and handle HR validation"""
    clerk_id = request.data.get('clerk_id')
    email = request.data.get('email')
    role = request.data.get('role')
    
    if not clerk_id or not email or not role:
        return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # Check if user exists by clerk_id
        profile = UserProfile.objects.filter(clerk_id=clerk_id).first()
        
        # If not, check if they exist by email (in case they recreated their Clerk account)
        if not profile:
            profile = UserProfile.objects.filter(email=email).first()
            if profile:
                profile.clerk_id = clerk_id
                profile.save()

        is_hr_approved = False
        if role == 'hr':
            is_hr_approved = True

        if not profile:
            profile = UserProfile.objects.create(
                clerk_id=clerk_id,
                email=email,
                role=role,
                is_hr_approved=is_hr_approved
            )
        else:
            # Update role if it changed (useful for testing/switching roles)
            changed = False
            if profile.role != role:
                profile.role = role
                profile.is_hr_approved = is_hr_approved
                changed = True
            
            if profile.clerk_id != clerk_id:
                profile.clerk_id = clerk_id
                changed = True
                
            if changed:
                profile.save()
            
        return Response({
            "clerk_id": profile.clerk_id,
            "role": profile.role,
            "is_hr_approved": profile.is_hr_approved
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_user_profile(request, clerk_id):
    try:
        profile = UserProfile.objects.get(clerk_id=clerk_id)
        return Response({
            "clerk_id": profile.clerk_id,
            "role": profile.role,
            "is_hr_approved": profile.is_hr_approved
        }, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        return Response({"error": "User profile not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def get_my_applications(request):
    """API to fetch all applications for a specific candidate by email."""
    email = request.query_params.get('email')
    if not email:
        return Response({"error": "Missing email parameter"}, status=status.HTTP_400_BAD_REQUEST)
        
    candidates = Candidate.objects.filter(email=email).select_related('job_description', 'evaluation_report').order_by('-id')
    
    formatted_data = []
    for candidate in candidates:
        role_title = candidate.job_description.title if candidate.job_description else "Unspecified Role"
        
        if hasattr(candidate, 'evaluation_report'):
            status_text = candidate.status
        else:
            status_text = "Under Review"
            
        formatted_data.append({
            "id": candidate.id,
            "role": role_title,
            "status": status_text,
            "applied_on": candidate.created_at if hasattr(candidate, 'created_at') else None
        })
        
    return Response(formatted_data, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@authentication_classes([ClerkJWTAuthentication])
@permission_classes([IsHRAdmin])
def delete_candidate_view(request, candidate_id):
    """API to delete a candidate and their evaluation report."""
    try:
        candidate = Candidate.objects.get(id=candidate_id)
        
        # Purge their specific RAG embeddings from ChromaDB
        import chromadb
        import os
        try:
            client = chromadb.PersistentClient(path=os.path.join(os.getcwd(), "chroma_storage"))
            client.delete_collection(f"candidate_resume_{candidate_id}")
        except Exception as e:
            print(f"Chroma delete warning: {e}")
            
        candidate.delete()
        return Response({"message": "Candidate deleted successfully"}, status=status.HTTP_200_OK)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@authentication_classes([ClerkJWTAuthentication])
@permission_classes([IsHRAdmin])
def delete_jd_view(request, jd_id):
    """API to delete a Job Description. Its related candidates will be cascade deleted."""
    try:
        jd = JobDescription.objects.get(id=jd_id)
        # Optional: could clean up Chroma collections here if using real persistent Chroma
        jd.delete()
        return Response({"message": "Job Description deleted successfully"}, status=status.HTTP_200_OK)
    except JobDescription.DoesNotExist:
        return Response({"error": "Job Description not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@authentication_classes([ClerkJWTAuthentication])
def revoke_application_view(request, candidate_id):
    """API for a candidate to revoke (delete) their own application."""
    try:
        candidate = Candidate.objects.get(id=candidate_id)
        
        # Verify the candidate owns this application
        if candidate.email != request.user.email:
            return Response({"error": "Unauthorized to revoke this application"}, status=status.HTTP_403_FORBIDDEN)
            
        # Purge their specific RAG embeddings from ChromaDB
        import chromadb
        import os
        try:
            client = chromadb.PersistentClient(path=os.path.join(os.getcwd(), "chroma_storage"))
            client.delete_collection(f"candidate_resume_{candidate_id}")
        except Exception as e:
            print(f"Chroma delete warning: {e}")
            
        candidate.delete()
        return Response({"message": "Application revoked successfully"}, status=status.HTTP_200_OK)
    except Candidate.DoesNotExist:
        return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@authentication_classes([ClerkJWTAuthentication])
@permission_classes([IsHRAdmin])
def edit_jd_view(request, jd_id):
    """API to edit a Job Description and re-trigger ingestion."""
    try:
        jd = JobDescription.objects.get(id=jd_id)
        title = request.data.get('title')
        raw_text = request.data.get('raw_text')
        
        if not title or not raw_text:
            return Response({"error": "Title and raw_text are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        jd.title = title
        jd.raw_text = raw_text
        jd.save()
        
        print(f"--- [Triggering LangGraph RAG Vector Ingestion Pipeline for Edited JD {jd.id}] ---")
        collection_identifier = f"jd_collection_{jd.id}"
        
        graph_inputs = {
            "file_path": "",
            "collection_name": collection_identifier,
            "raw_text": raw_text,
            "chunks": [],
            "ingestion_status": ""
        }
        
        # Run the LangGraph execution flow synchronously to update ChromaDB
        output_state = jd_ingestion_pipeline.invoke(graph_inputs)
        print(f"✓ Pipeline Finished: {output_state.get('ingestion_status')}\n")
        
        return Response({
            "message": "Job Description updated and successfully re-synced with Knowledge Base."
        }, status=status.HTTP_200_OK)
        
    except JobDescription.DoesNotExist:
        return Response({"error": "Job Description not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Edit JD Error: {str(e)}")
        return Response({"error": f"Internal error during update: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import requests
import os

@api_view(['POST'])
@authentication_classes([ClerkJWTAuthentication])
@permission_classes([IsHRAdmin])
def schedule_interview_view(request):
    """API for HR to manually generate an interview session link for a candidate."""
    candidate_id = request.data.get('candidate_id')
    if not candidate_id:
        return Response({"error": "Missing candidate_id"}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        candidate = Candidate.objects.get(id=candidate_id)
        # Create a new session or get existing pending session
        session, created = InterviewSession.objects.get_or_create(
            candidate=candidate,
            status='Pending'
        )
        # We also need to update the candidate's status to 'Interview' in the Kanban board
        candidate.status = 'Interview'
        candidate.save()
        
        import os
        from .tasks import send_interview_email_task
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        interview_link = f"{frontend_url}/interview/{session.session_token}"
        
        if candidate.email:
            send_interview_email_task.delay(
                candidate_email=candidate.email,
                candidate_name=candidate.candidate_name,
                interview_link=interview_link,
                job_title=candidate.job_description.title if candidate.job_description else "the role"
            )
        
        return Response({
            "message": "Interview scheduled successfully.",
            "session_token": session.session_token,
            "interview_link": interview_link
        }, status=status.HTTP_201_CREATED)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

import uuid
from livekit.api import AccessToken, VideoGrants

@api_view(['GET'])
def get_openai_ephemeral_token(request, token):
    """
    API for the Frontend Browser to securely fetch a LiveKit Token for Beyond Presence AI Avatar.
    The browser provides the Interview Session token, and we return the LiveKit url and token.
    """
    try:
        # 1. Verify this is a valid interview session
        session = InterviewSession.objects.get(session_token=token)
        
        if session.status == 'Completed':
            return Response({"error": "This interview has already been completed."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Get the Beyond Presence API key and Agent ID securely
        bp_api_key = os.getenv("BEYOND_PRESENCE_API_KEY")
        bp_agent_id = os.getenv("BEYOND_PRESENCE_AGENT_ID")
        
        # For the Free Tier workaround, we do not call the API programmatically.
        # We simply return success so the frontend can load the iframe.
        return Response({
            "message": "Session validated successfully. Ready to load iframe."
        }, status=status.HTTP_200_OK)
            
    except InterviewSession.DoesNotExist:
        return Response({"error": "Invalid session token"}, status=status.HTTP_404_NOT_FOUND)
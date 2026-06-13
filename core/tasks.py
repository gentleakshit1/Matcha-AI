from celery import shared_task
from django.core.mail import send_mail
from .models import Candidate, EvaluationReport
from .agents import matcha_agent_app

@shared_task
def process_resume_task(candidate_id):
    try:
        candidate = Candidate.objects.select_related('job_description').get(id=candidate_id)
        jd = candidate.job_description
        
        initial_graph_state = {
            "jd_id": jd.id,
            "candidate_id": candidate.id,
            "job_title": jd.title,
            "job_requirements": jd.raw_text,
            "candidate_name": candidate.candidate_name,
            "candidate_resume": candidate.resume_text,
            "screening_summary": "",
            "skill_match_score": 0,
            "skill_gap_analysis": {},
            "interview_questions": [],
            "final_feedback": ""
        }
        
        print(f"🚀 Starting background processing for {candidate.candidate_name}")
        
        # --- RAG: Vectorize and store the Candidate's Resume ---
        from .knowledge_base import jd_ingestion_pipeline
        resume_collection_name = f"candidate_resume_{candidate.id}"
        print(f"--- [RAG: Vectorizing Candidate Resume into collection '{resume_collection_name}'] ---")
        jd_ingestion_pipeline.invoke({
            "file_path": "",
            "collection_name": resume_collection_name,
            "raw_text": candidate.resume_text,
            "chunks": [],
            "ingestion_status": ""
        })
        
        # This is where the long running LangGraph agent pipeline happens
        final_graph_state = matcha_agent_app.invoke(initial_graph_state)
        
        print(f"✅ Completed background processing for {candidate.candidate_name}")
        
        report = EvaluationReport.objects.create(
            candidate=candidate,
            screening_summary=final_graph_state.get("screening_summary", ""),
            skill_match_score=final_graph_state.get("skill_match_score", 0),
            skill_gap_analysis=final_graph_state.get("skill_gap_analysis", {}),
            interview_questions=final_graph_state.get("interview_questions", []),
            final_feedback=final_graph_state.get("final_feedback", ""),
            final_rank_score=float(final_graph_state.get("skill_match_score", 0))
        )
        
        if candidate.email:
            SHORTLIST_THRESHOLD = 85
            if report.skill_match_score >= SHORTLIST_THRESHOLD:
                candidate.status = "Shortlisted"
                candidate.save()
                
                # Candidate Email
                subject = f"Matcha Update: Interview Invitation for {jd.title}"
                body = f"Hi {candidate.candidate_name},\n\nCongratulations! You passed our screening phase with a score of {report.skill_match_score} and have been shortlisted for the {jd.title} role.\n\nOur team will be in touch shortly to schedule your first interview.\n\nBest regards,\nThe Matcha HR Team"
                
                # HR Email
                hr_subject = f"HR Notification: New Shortlisted Candidate for {jd.title}"
                hr_body = f"Hello HR,\n\nA new candidate, {candidate.candidate_name}, has applied and successfully passed the AI screen with a score of {report.skill_match_score}.\n\nView their profile in the HR Command Center to review their interview questions and proceed with scheduling."
            else:
                candidate.status = "Rejected"
                candidate.save()
                
                # Empathetic Candidate Email
                subject = f"Matcha Update: Application Status for {jd.title}"
                body = (
                    f"Hi {candidate.candidate_name},\n\n"
                    f"Thank you so much for taking the time to apply for the {jd.title} role at our company. We deeply appreciate the effort you put into your application.\n\n"
                    f"After careful review of your profile against our current requirements, we have decided to move forward with other candidates who more closely align with the specific technical needs of this position at this time.\n\n"
                    f"Please know that this is not a reflection of your overall talent or potential. We have securely stored your records in our talent pool, and if a future role opens up that matches your skillset, we will certainly reach out to you.\n\n"
                    f"We wish you the very best in your job search and your future endeavors.\n\n"
                    f"Warm regards,\nThe Matcha HR Team"
                )
                
                # HR Email
                hr_subject = f"HR Notification: Candidate Rejected for {jd.title}"
                hr_body = f"Hello HR,\n\nCandidate {candidate.candidate_name} has applied but failed to meet the threshold of {SHORTLIST_THRESHOLD}. They scored {report.skill_match_score}.\n\nThey have been automatically marked as Rejected. You can view their evaluation report in the HR Command Center."
            
            # Send emails
            send_mail(subject, body, None, [candidate.email], fail_silently=False)
            send_mail(hr_subject, hr_body, None, ['hr@matcha.ai'], fail_silently=False)
            
        return f"Successfully processed candidate {candidate_id} - Score: {report.skill_match_score}"
        
    except Exception as e:
        print(f"Celery Background Task Error: {str(e)}")
        # Note: In a production app, you might update the candidate status to "Error"
        return f"Failed to process candidate {candidate_id}: {str(e)}"

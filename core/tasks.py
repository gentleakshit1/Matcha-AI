from celery import shared_task
from django.core.mail import send_mail
from .models import Candidate, EvaluationReport, UserProfile
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
                body = f"Hi {candidate.candidate_name},\n\nCongratulations! You have been shortlisted for the {jd.title} role.\n\nOur team will be in touch shortly to schedule your first interview.\n\nBest regards,\nThe Matcha HR Team"
                html_body = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 40px 20px;">
                  <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px; margin: 0 auto; max-width: 600px;">
                    <div style="margin-bottom: 32px; text-align: left;">
                      <h1 style="color: #09090b; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0;">Application Update</h1>
                      <p style="color: #71717a; font-size: 14px; margin-top: 8px;">{jd.title}</p>
                    </div>
                    <div style="color: #27272a; font-size: 15px; line-height: 1.6;">
                      <p style="margin-bottom: 20px;">Hi <strong>{candidate.candidate_name}</strong>,</p>
                      <p style="margin-bottom: 24px;">Congratulations! You have been successfully shortlisted for the <strong>{jd.title}</strong> role.</p>
                      <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <p style="color: #27272a; font-size: 14px; font-weight: 500; margin: 0 0 8px 0; display: flex; align-items: center;">
                          <span style="display: inline-block; width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; margin-right: 8px;"></span>Next Steps
                        </p>
                        <p style="color: #52525b; font-size: 14px; margin: 0;">Our team will be in touch shortly to schedule your first interview.</p>
                      </div>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                    <p style="color: #71717a; font-size: 13px; margin: 0;">Best regards,<br>The Matcha Team</p>
                  </div>
                </div>
                """
                
                # HR Email
                hr_subject = f"HR Notification: New Shortlisted Candidate for {jd.title}"
                hr_body = f"Hello HR,\n\nA new candidate, {candidate.candidate_name}, has applied and successfully passed the AI screen with a score of {report.skill_match_score}.\n\nView their profile in the HR Command Center to review their interview questions and proceed with scheduling."
                hr_html_body = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 40px 20px;">
                  <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px; margin: 0 auto; max-width: 600px;">
                    <div style="margin-bottom: 32px; text-align: left;">
                      <span style="display: inline-block; background-color: #f4f4f5; color: #27272a; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px; border: 1px solid #e4e4e7;">System Alert</span>
                      <h1 style="color: #09090b; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0;">New Shortlist: {jd.title}</h1>
                    </div>
                    <div style="color: #27272a; font-size: 15px; line-height: 1.6;">
                      <p style="margin-bottom: 20px;">Candidate <strong>{candidate.candidate_name}</strong> has successfully passed the AI screening.</p>
                      <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin-bottom: 24px; display: flex; align-items: baseline; gap: 8px;">
                        <p style="color: #71717a; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Match Score:</p>
                        <p style="color: #09090b; font-size: 24px; font-weight: 700; margin: 0;">{report.skill_match_score}</p>
                      </div>
                      <a href="http://localhost:5173/hr" style="display: inline-block; background-color: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Open Command Center</a>
                    </div>
                  </div>
                </div>
                """
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
                html_body = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 40px 20px;">
                  <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px; margin: 0 auto; max-width: 600px;">
                    <div style="margin-bottom: 32px; text-align: left;">
                      <h1 style="color: #09090b; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0;">Application Update</h1>
                      <p style="color: #71717a; font-size: 14px; margin-top: 8px;">{jd.title}</p>
                    </div>
                    <div style="color: #27272a; font-size: 15px; line-height: 1.6;">
                      <p style="margin-bottom: 20px;">Hi <strong>{candidate.candidate_name}</strong>,</p>
                      <p style="margin-bottom: 20px;">Thank you so much for taking the time to apply. We deeply appreciate the effort you put into your application.</p>
                      <p style="margin-bottom: 20px;">After careful review of your profile against our current requirements, we have decided to move forward with other candidates who more closely align with the specific technical needs of this position at this time.</p>
                      <div style="background-color: #fafafa; border-left: 2px solid #a1a1aa; padding: 16px; margin-bottom: 24px;">
                        <p style="color: #52525b; font-size: 14px; margin: 0; font-style: italic;">Please know that this is not a reflection of your overall talent. We have securely stored your records in our talent pool, and if a future role opens up that matches your skillset, we will certainly reach out.</p>
                      </div>
                      <p style="margin-bottom: 32px;">We wish you the very best in your job search and your future endeavors.</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                    <p style="color: #71717a; font-size: 13px; margin: 0;">Warm regards,<br>The Matcha Team</p>
                  </div>
                </div>
                """
                
                # HR Email
                hr_subject = f"HR Notification: Candidate Rejected for {jd.title}"
                hr_body = f"Hello HR,\n\nCandidate {candidate.candidate_name} has applied but failed to meet the threshold of {SHORTLIST_THRESHOLD}. They scored {report.skill_match_score}.\n\nThey have been automatically marked as Rejected. You can view their evaluation report in the HR Command Center."
                hr_html_body = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 40px 20px;">
                  <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px; margin: 0 auto; max-width: 600px;">
                    <div style="margin-bottom: 32px; text-align: left;">
                      <span style="display: inline-block; background-color: #f4f4f5; color: #27272a; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px; border: 1px solid #e4e4e7;">System Alert</span>
                      <h1 style="color: #09090b; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0;">Candidate Rejected: {jd.title}</h1>
                    </div>
                    <div style="color: #27272a; font-size: 15px; line-height: 1.6;">
                      <p style="margin-bottom: 24px;">Candidate <strong>{candidate.candidate_name}</strong> failed to meet the threshold of {SHORTLIST_THRESHOLD}.</p>
                      <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin-bottom: 24px; display: flex; align-items: baseline; gap: 8px;">
                        <p style="color: #71717a; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Match Score:</p>
                        <p style="color: #09090b; font-size: 24px; font-weight: 700; margin: 0;">{report.skill_match_score}</p>
                      </div>
                      <a href="http://localhost:5173/hr" style="display: inline-block; background-color: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Open Command Center</a>
                    </div>
                  </div>
                </div>
                """
            
            # Send emails
            send_mail(subject, body, None, [candidate.email], fail_silently=False, html_message=html_body)
            
            hr_emails = list(UserProfile.objects.filter(role='hr').values_list('email', flat=True))
            if hr_emails:
                send_mail(hr_subject, hr_body, None, hr_emails, fail_silently=False, html_message=hr_html_body)
            
        return f"Successfully processed candidate {candidate_id} - Score: {report.skill_match_score}"
        
    except Exception as e:
        print(f"Celery Background Task Error: {str(e)}")
        # Note: In a production app, you might update the candidate status to "Error"
        return f"Failed to process candidate {candidate_id}: {str(e)}"

@shared_task
def send_interview_email_task(candidate_email, candidate_name, interview_link, job_title):
    try:
        subject = f"Matcha Update: Interview Invitation for {job_title}"
        body = f"Hi {candidate_name},\n\nCongratulations! You have been shortlisted for the {job_title} role.\n\nYour AI Interview is ready. Please complete it within the next 48 hours.\n\nInterview Link: {interview_link}\n\nBest regards,\nThe Matcha HR Team"
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 40px 20px;">
          <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px; margin: 0 auto; max-width: 600px;">
            <div style="margin-bottom: 32px; text-align: left;">
              <h1 style="color: #09090b; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0;">Interview Invitation</h1>
              <p style="color: #71717a; font-size: 14px; margin-top: 8px;">{job_title}</p>
            </div>
            <div style="color: #27272a; font-size: 15px; line-height: 1.6;">
              <p style="margin-bottom: 20px;">Hi <strong>{candidate_name}</strong>,</p>
              <p style="margin-bottom: 24px;">Congratulations! Your AI interview for the <strong>{job_title}</strong> role is ready.</p>
              <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #27272a; font-size: 14px; font-weight: 500; margin: 0 0 8px 0; display: flex; align-items: center;">
                  <span style="display: inline-block; width: 8px; height: 8px; background-color: #f59e0b; border-radius: 50%; margin-right: 8px;"></span>Action Required
                </p>
                <p style="color: #52525b; font-size: 14px; margin: 0; margin-bottom: 16px;">Please complete your interview within the next <strong>48 hours</strong>.</p>
                <a href="{interview_link}" style="display: inline-block; background-color: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Start Interview Now</a>
              </div>
            </div>
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
            <p style="color: #71717a; font-size: 13px; margin: 0;">Best regards,<br>The Matcha Team</p>
          </div>
        </div>
        """
        send_mail(subject, body, None, [candidate_email], fail_silently=False, html_message=html_body)
        return f"Interview email sent to {candidate_email}"
    except Exception as e:
        print(f"Error sending interview email: {str(e)}")
        return f"Failed to send email to {candidate_email}: {str(e)}"

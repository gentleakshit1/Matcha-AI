from django.db import models

class UserProfile(models.Model):
    clerk_id = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=50, choices=[('candidate', 'Candidate'), ('hr', 'HR')])
    is_hr_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} ({self.role})"
class JobDescription(models.Model):
    title = models.CharField(max_length=255)
    raw_text = models.TextField(help_text="Full text extracted from the JD PDF")
    status = models.CharField(max_length=50, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} (ID: {self.id})"


class Candidate(models.Model):
    # Link to the Job Description
    job_description = models.ForeignKey('JobDescription', on_delete=models.CASCADE)
    
    # Candidate details
    candidate_name = models.CharField(max_length=255)
    email = models.EmailField()
    
    # Storage
    resume_file = models.FileField(upload_to='resumes/')
    resume_text = models.TextField()
    
    # Kanban Status
    status = models.CharField(max_length=50, default='Applied')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.candidate_name} ({self.email})"

class EvaluationReport(models.Model):
    candidate = models.OneToOneField(
        Candidate, 
        on_delete=models.CASCADE, 
        related_name='evaluation_report'
    )
    screening_summary = models.TextField(blank=True, null=True)
    skill_match_score = models.IntegerField(default=0)
    skill_gap_analysis = models.JSONField(default=dict, blank=True, null=True)
    interview_questions = models.JSONField(default=list, blank=True, null=True)
    final_feedback = models.TextField(blank=True, null=True)
    final_rank_score = models.FloatField(default=0.0)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for {self.candidate.candidate_name}"

import uuid

class InterviewSession(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='interview_sessions')
    session_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    status = models.CharField(max_length=50, default='Pending', choices=[
        ('Pending', 'Pending'),
        ('In_Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Failed', 'Failed')
    ])
    transcript = models.TextField(blank=True, null=True)
    interview_score = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Interview for {self.candidate.candidate_name} ({self.status})"
from django.contrib import admin
from .models import JobDescription, Candidate, EvaluationReport, UserProfile

# Register your models here so they show up in the Admin UI
admin.site.register(JobDescription)
admin.site.register(Candidate)
admin.site.register(EvaluationReport)
admin.site.register(UserProfile)
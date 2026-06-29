from django.urls import path
from . import views
from . import webhook_views

urlpatterns = [
    path('upload-jd/', views.upload_jd_view, name='upload_jd'),
    path('upload-resume/', views.upload_resume_view, name='upload_resume'),
    path('get-jds/', views.get_all_jds_view, name='get_all_jds'),
    path('get-candidates/', views.get_candidates, name='get_candidates'),
    path('update-candidate-status/', views.update_candidate_status, name='update_candidate_status'),
    path('sync-user/', views.sync_user_profile, name='sync_user_profile'),
    path('get-user/<str:clerk_id>/', views.get_user_profile, name='get_user_profile'),
    path('get-my-applications/', views.get_my_applications, name='get_my_applications'),
    path('delete-candidate/<int:candidate_id>/', views.delete_candidate_view, name='delete_candidate'),
    path('revoke-application/<int:candidate_id>/', views.revoke_application_view, name='revoke_application'),
    path('delete-jd/<int:jd_id>/', views.delete_jd_view, name='delete_jd'),
    path('edit-jd/<int:jd_id>/', views.edit_jd_view, name='edit_jd'),
    path('clerk-webhook/', webhook_views.clerk_webhook_view, name='clerk_webhook'),
    
    # Beyond Presence / OpenAI Interview Routes
    path('interviews/schedule/', views.schedule_interview_view, name='schedule_interview'),
    path('interviews/get_token/<str:token>/', views.get_openai_ephemeral_token, name='get_openai_ephemeral_token'),
]
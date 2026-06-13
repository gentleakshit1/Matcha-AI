from django.urls import path
from . import views

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
    path('delete-jd/<int:jd_id>/', views.delete_jd_view, name='delete_jd'),
]
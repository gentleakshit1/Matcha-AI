web: gunicorn matcha_backend.wsgi:application
worker: celery -A matcha_backend worker -l info
release: python manage.py migrate

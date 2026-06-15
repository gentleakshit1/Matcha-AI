import json
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from svix.webhooks import Webhook, WebhookVerificationError

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def clerk_webhook_view(request):
    payload = request.body
    headers = request.headers
    
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")
    
    if not svix_id or not svix_timestamp or not svix_signature:
        return Response({'error': 'Missing svix headers'}, status=status.HTTP_400_BAD_REQUEST)
        
    secret = getattr(settings, 'CLERK_WEBHOOK_SECRET', '')
    if not secret:
        return Response({'error': 'Webhook secret not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    webhook = Webhook(secret)
    
    try:
        event = webhook.verify(payload, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        })
    except WebhookVerificationError as e:
        return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
        
    event_type = event.get('type')
    
    if event_type == 'user.created':
        data = event.get('data', {})
        email_addresses = data.get('email_addresses', [])
        primary_email_id = data.get('primary_email_address_id')
        
        email = None
        for ea in email_addresses:
            if ea.get('id') == primary_email_id:
                email = ea.get('email_address')
                break
                
        if not email and email_addresses:
            email = email_addresses[0].get('email_address')
            
        first_name = data.get('first_name') or 'there'
        
        if email:
            try:
                subject = "Welcome to Matcha.ai!"
                body = f"Hi {first_name},\n\nWelcome to Matcha.ai! We are thrilled to have you onboard.\n\nExplore our AI-powered recruitment platform to discover your best matches.\n\nBest regards,\nThe Matcha HR Team"
                html_body = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 40px 20px;">
                  <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px; margin: 0 auto; max-width: 600px;">
                    <div style="margin-bottom: 32px; text-align: left;">
                      <h1 style="color: #09090b; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0;">Welcome to Matcha</h1>
                      <p style="color: #71717a; font-size: 14px; margin-top: 8px;">The modern recruitment platform.</p>
                    </div>
                    <div style="color: #27272a; font-size: 15px; line-height: 1.6;">
                      <p style="margin-bottom: 20px;">Hi <strong>{first_name}</strong>,</p>
                      <p style="margin-bottom: 24px;">We are thrilled to have you onboard. Explore our AI-powered recruitment platform and discover roles perfectly tailored to your skills.</p>
                      <a href="http://localhost:5173/careers" style="display: inline-block; background-color: #09090b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Open Roles</a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                    <p style="color: #71717a; font-size: 13px; margin: 0;">Best regards,<br>The Matcha Team</p>
                  </div>
                </div>
                """
                send_mail(subject, body, None, [email], fail_silently=False, html_message=html_body)
                print(f"Sent welcome email to {email}")
            except Exception as e:
                print(f"Failed to send welcome email: {e}")
                
    return Response({'message': 'Webhook received'}, status=status.HTTP_200_OK)

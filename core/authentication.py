import jwt
import requests
import json
from django.conf import settings
from rest_framework import authentication, exceptions
from django.core.cache import cache
from core.models import UserProfile

class ClerkJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        # In a production app, CLERK_JWKS_URL should be in settings/env
        jwks_url = getattr(settings, 'CLERK_JWKS_URL', None)
        if not jwks_url:
            raise exceptions.AuthenticationFailed('CLERK_JWKS_URL is not configured.')
            
        # Cache the JWKS to avoid hitting Clerk API on every request
        jwks = cache.get('clerk_jwks')
        if not jwks:
            try:
                response = requests.get(jwks_url)
                jwks = response.json()
                cache.set('clerk_jwks', jwks, 3600)  # Cache for 1 hour
            except Exception:
                raise exceptions.AuthenticationFailed('Failed to fetch JWKS from Clerk.')
                
        try:
            # Get the key ID from the JWT header
            unverified_header = jwt.get_unverified_header(token)
            rsa_key = {}
            for key in jwks.get('keys', []):
                if key['kid'] == unverified_header['kid']:
                    rsa_key = {
                        'kty': key['kty'],
                        'kid': key['kid'],
                        'use': key['use'],
                        'n': key['n'],
                        'e': key['e']
                    }
                    break
                    
            if not rsa_key:
                raise exceptions.AuthenticationFailed('Unable to find appropriate key.')
                
            # Verify the token
            algorithm = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(rsa_key))
            payload = jwt.decode(
                token,
                algorithm,
                algorithms=['RS256'],
                options={"verify_aud": False}, # Clerk tokens sometimes have varying audiences depending on the setup
                leeway=60 # Add leeway for clock skew between Clerk servers and local machine
            )
            
            clerk_user_id = payload.get('sub')
            if not clerk_user_id:
                raise exceptions.AuthenticationFailed('Token contains no user ID.')
                
            # Get or create the user profile
            try:
                user = UserProfile.objects.get(clerk_id=clerk_user_id)
            except UserProfile.DoesNotExist:
                # If they don't exist yet, we could create a basic profile or fail
                user = UserProfile.objects.create(clerk_id=clerk_user_id, email=payload.get('email', ''), role='candidate')
                
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            print("Auth Error: Token expired")
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError as e:
            print(f"Auth Error: Invalid token - {e}")
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
        except Exception as e:
            print(f"Auth Error: General exception - {e}")
            raise exceptions.AuthenticationFailed(f'Authentication error: {str(e)}')

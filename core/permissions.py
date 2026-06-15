from rest_framework import permissions

class IsHRAdmin(permissions.BasePermission):
    """
    Custom permission to only allow approved HR Admins to access the view.
    Requires ClerkJWTAuthentication to have attached a UserProfile to request.user.
    """
    
    def hasattr(self, obj, name):
        return hasattr(obj, name)
        
    def has_permission(self, request, view):
        print(f"IsHRAdmin Check:")
        print(f" - user: {request.user}")
        print(f" - has clerk_id: {hasattr(request.user, 'clerk_id')}")
        
        if not request.user or not hasattr(request.user, 'clerk_id'):
            print(" -> Denied: No clerk_id")
            return False
            
        print(f" - role: {getattr(request.user, 'role', None)}")
        print(f" - is_hr_approved: {getattr(request.user, 'is_hr_approved', None)}")
        
        if hasattr(request.user, 'role') and request.user.role == 'hr':
            is_approved = getattr(request.user, 'is_hr_approved', False)
            if not is_approved:
                print(" -> Denied: HR not approved")
            else:
                print(" -> Allowed: HR is approved")
            return is_approved
            
        print(" -> Denied: Role is not hr")
        return False

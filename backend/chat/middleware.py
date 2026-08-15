from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser, User
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class JWTAuthMiddleware:
    """
    Custom middleware that authenticates WebSocket connections using JWT tokens.
    Expects "?token=<JWT_TOKEN>" in the connection query string.
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", None)
        
        scope['user'] = AnonymousUser()
        
        if token_list:
            token = token_list[0]
            try:
                access_token = AccessToken(token)
                user_id = access_token.payload.get("user_id")
                scope['user'] = await get_user(user_id)
            except Exception:
                pass

        return await self.inner(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)

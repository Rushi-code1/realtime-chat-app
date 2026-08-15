from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, UserListView, ChatRoomViewSet

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='room')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('users/', UserListView.as_view(), name='users'),
    path('', include(router.urls)),
]

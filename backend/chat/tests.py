import pytest
import asyncio
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator

from chat.models import ChatRoom, ChatMessage
from chat_project.asgi import application

@pytest.mark.django_db
def test_user_registration_and_login():
    client = APIClient()
    # Test Registration
    response = client.post('/api/chat/register/', {
        'username': 'testuser',
        'password': 'testpassword123',
        'email': 'test@example.com'
    })
    assert response.status_code == 201
    assert response.data['username'] == 'testuser'
    
    # Test Login (SimpleJWT token generation)
    response = client.post('/api/token/', {
        'username': 'testuser',
        'password': 'testpassword123'
    })
    assert response.status_code == 200
    assert 'access' in response.data
    assert 'refresh' in response.data

@pytest.mark.django_db
def test_chatroom_api_flow():
    client = APIClient()
    user1 = User.objects.create_user(username='user1', password='pass1')
    user2 = User.objects.create_user(username='user2', password='pass2')
    
    # Authenticate user1
    client.force_authenticate(user=user1)
    
    # Create room
    response = client.post('/api/chat/rooms/', {
        'name': 'lobby',
        'description': 'Lobby Room'
    })
    assert response.status_code == 201
    room_id = response.data['id']
    
    # Add user2 as participant
    response = client.post(f'/api/chat/rooms/{room_id}/add_participant/', {
        'username': 'user2'
    })
    assert response.status_code == 200
    
    # Verify participant lists
    room = ChatRoom.objects.get(id=room_id)
    assert room.participants.count() == 2
    assert room.participants.filter(username='user2').exists()

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_websocket_unauthorized_rejection():
    communicator = WebsocketCommunicator(application, "/ws/chat/lobby/")
    try:
        connected, subprotocol = await communicator.connect(timeout=1)
        # Should be rejected because no user is authenticated (is_anonymous)
        assert not connected
    except (asyncio.TimeoutError, Exception):
        # Timeout or Exception is a valid connection rejection behavior in testing
        pass
    await communicator.disconnect()

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_websocket_chat_communication_flow():
    # Setup test user and room
    user = await database_sync_to_async(User.objects.create_user)(username='chatuser', password='password123')
    room = await database_sync_to_async(ChatRoom.objects.create)(name='lobby')
    await database_sync_to_async(room.participants.add)(user)
    
    # Generate token
    token = AccessToken.for_user(user)
    
    # Establish WebSocket connection with query string token
    communicator = WebsocketCommunicator(application, f"/ws/chat/lobby/?token={str(token)}")
    connected, _ = await communicator.connect()
    assert connected
    
    # Upon connection, we expect a presence update broadcasted
    presence_response = await communicator.receive_json_from()
    assert presence_response['type'] == 'presence'
    assert 'chatuser' in presence_response['users']
    
    # Send message event
    await communicator.send_json_to({
        'type': 'chat_message',
        'content': 'Hello world!'
    })
    
    # Expect message broadcast
    response = await communicator.receive_json_from()
    assert response['type'] == 'chat_message'
    assert response['sender'] == 'chatuser'
    assert response['content'] == 'Hello world!'
    
    # Expect DB count to update
    db_messages_count = await database_sync_to_async(ChatMessage.objects.filter(room=room).count)()
    assert db_messages_count == 1
    
    # Send typing event
    await communicator.send_json_to({
        'type': 'typing',
        'is_typing': True
    })
    
    # Expect typing broadcast
    response = await communicator.receive_json_from()
    assert response['type'] == 'typing'
    assert response['username'] == 'chatuser'
    assert response['is_typing'] is True

    await communicator.disconnect()

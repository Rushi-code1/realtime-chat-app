import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import ChatRoom, ChatMessage
from django.core.cache import cache

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope['user']

        # Room Authorization
        if self.user.is_anonymous:
            await self.close()
            return
            
        is_authorized = await self.is_room_authorized()
        if not is_authorized:
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Add to presence
        await self.add_to_presence()
        await self.broadcast_presence()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Remove from presence
            await self.remove_from_presence()
            await self.broadcast_presence()

            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')

        if event_type == 'chat_message':
            content = data.get('content')
            if content:
                message = await self.save_message(content)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message_handler',
                        'id': message.id,
                        'sender': self.user.username,
                        'content': message.content,
                        'timestamp': message.timestamp.isoformat()
                    }
                )
        elif event_type == 'typing':
            is_typing = data.get('is_typing', False)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_handler',
                    'username': self.user.username,
                    'is_typing': is_typing
                }
            )

    async def chat_message_handler(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': event['id'],
            'sender': event['sender'],
            'content': event['content'],
            'timestamp': event['timestamp']
        }))

    async def typing_handler(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'username': event['username'],
            'is_typing': event['is_typing']
        }))

    async def presence_handler(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'users': event['users']
        }))

    @database_sync_to_async
    def is_room_authorized(self):
        try:
            room = ChatRoom.objects.get(name=self.room_name)
            # If room has no specific participants list, allow any authenticated user
            if room.participants.count() == 0:
                return True
            return room.participants.filter(id=self.user.id).exists()
        except ChatRoom.DoesNotExist:
            # Create a default room if it doesn't exist for easier portfolio testing
            room = ChatRoom.objects.create(name=self.room_name)
            return True

    @database_sync_to_async
    def save_message(self, content):
        room = ChatRoom.objects.get(name=self.room_name)
        return ChatMessage.objects.create(
            room=room,
            sender=self.user,
            content=content
        )

    # Presence functions using Django cache
    async def add_to_presence(self):
        key = f"room_presence_{self.room_name}"
        active_users = cache.get(key) or []
        if self.user.username not in active_users:
            active_users.append(self.user.username)
            cache.set(key, active_users, timeout=3600)

    async def remove_from_presence(self):
        key = f"room_presence_{self.room_name}"
        active_users = cache.get(key) or []
        if self.user.username in active_users:
            active_users.remove(self.user.username)
            cache.set(key, active_users, timeout=3600)

    async def broadcast_presence(self):
        key = f"room_presence_{self.room_name}"
        active_users = cache.get(key) or []
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_handler',
                'users': active_users
            }
        )

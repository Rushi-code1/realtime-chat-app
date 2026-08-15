from django.contrib.auth.models import User
from rest_framework import serializers
from .models import ChatRoom, ChatMessage

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

class ChatRoomSerializer(serializers.ModelSerializer):
    participants_usernames = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ('id', 'name', 'description', 'created_at', 'participants', 'participants_usernames')
        read_only_fields = ('created_at',)

    def get_participants_usernames(self, obj):
        return [user.username for user in obj.participants.all()]

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ('id', 'room', 'sender', 'sender_username', 'content', 'timestamp')
        read_only_fields = ('timestamp',)

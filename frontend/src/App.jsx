import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Users, LogOut, Plus, 
  Hash, ShieldAlert, UserPlus, Info, Lock, ArrowRight, User
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

export default function App() {
  // Auth
  const [token, setToken] = useState(localStorage.getItem('chat_token') || '');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('chat_username') || '');
  const [authView, setAuthView] = useState('login'); // login, register
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Chat Rooms & Messages
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  // UI States
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [participantInput, setParticipantInput] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  // WebSockets and Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Load rooms when authenticated
  useEffect(() => {
    if (token) {
      fetchRooms();
    }
  }, [token]);

  // Handle WebSocket Connection
  useEffect(() => {
    if (!token || !currentRoom) return;

    const wsUrl = `${WS_BASE}/ws/chat/${currentRoom.name}/?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setOnlineUsers([]);
      setTypingUsers({});
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'chat_message') {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            id: data.id,
            sender_username: data.sender,
            content: data.content,
            timestamp: data.timestamp
          }];
        });
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[data.sender];
          return updated;
        });
      } else if (data.type === 'typing') {
        if (data.username !== currentUser) {
          setTypingUsers(prev => ({
            ...prev,
            [data.username]: data.is_typing
          }));
        }
      } else if (data.type === 'presence') {
        setOnlineUsers(data.users || []);
      }
    };

    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [token, currentRoom]);

  // Fetch Rooms from API
  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/rooms/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) handleLogout();
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  // Fetch Message History
  const fetchMessages = async (roomId) => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/rooms/${roomId}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  // Switch Active Room
  const handleSelectRoom = (room) => {
    setCurrentRoom(room);
    fetchMessages(room.id);
  };

  // Auth Operations
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const endpoint = authView === 'login' ? '/api/token/' : '/api/chat/register/';
    const body = authView === 'login' 
      ? { username: usernameInput, password: passwordInput }
      : { username: usernameInput, password: passwordInput, email: emailInput };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Authentication failed');
      }

      if (authView === 'login') {
        localStorage.setItem('chat_token', data.access);
        localStorage.setItem('chat_username', usernameInput);
        setToken(data.access);
        setCurrentUser(usernameInput);
      } else {
        setAuthView('login');
        setErrorMsg('Registration successful! Please log in.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_username');
    setToken('');
    setCurrentUser('');
    setCurrentRoom(null);
    setRooms([]);
    setMessages([]);
  };

  // Create Chat Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/rooms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoomName.toLowerCase(), description: newRoomDesc })
      });
      if (res.ok) {
        const room = await res.json();
        setNewRoomName('');
        setNewRoomDesc('');
        setShowAddRoom(false);
        fetchRooms();
        handleSelectRoom(room);
      }
    } catch (err) {
      console.error('Failed to create room', err);
    }
  };

  // Add Participant
  const handleAddParticipant = async (e) => {
    e.preventDefault();
    if (!participantInput || !currentRoom) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/rooms/${currentRoom.id}/add_participant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: participantInput })
      });
      const data = await res.json();
      if (res.ok) {
        setParticipantInput('');
        setShowAddUser(false);
        fetchRooms();
        setCurrentRoom(prev => ({
          ...prev,
          participants_usernames: [...(prev.participants_usernames || []), participantInput]
        }));
      } else {
        alert(data.error || 'Failed to add user');
      }
    } catch (err) {
      console.error('Failed to add participant', err);
    }
  };

  // Send Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    socketRef.current.send(JSON.stringify({
      type: 'chat_message',
      content: inputText
    }));
    setInputText('');
    sendTypingStatus(false);
  };

  const sendTypingStatus = (isTyping) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTypingStatus(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  // Auth Screen
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <MessageSquare size={36} color="#38bdf8" />
            </div>
          </div>
          <h2 className="auth-title">
            {authView === 'login' ? 'PulseChat Network' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {authView === 'login' ? 'Sign in to access developer chat channels' : 'Sign up to start real-time messaging'}
          </p>

          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                required
                className="form-input"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="rushikesh"
              />
            </div>

            {authView === 'register' && (
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email"
                  required
                  className="form-input"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="name@domain.com"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                required
                className="form-input"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <div className="error-banner">
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn-primary">
              <span>{authView === 'login' ? 'Login' : 'Register'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
            {authView === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setAuthView(authView === 'login' ? 'register' : 'login'); setErrorMsg(''); }}
              style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer' }}
            >
              {authView === 'login' ? 'Register' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Layout
  return (
    <div className="chat-app-container">
      {/* SIDEBAR */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="user-badge">
            <div className="avatar-circle">
              {currentUser.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="username">{currentUser}</div>
              <div className="status-online">
                <span className="status-dot"></span> Active
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-icon" title="Log Out">
            <LogOut size={18} />
          </button>
        </div>

        <div className="sidebar-section-title">
          <span>Active Rooms</span>
          <button onClick={() => setShowAddRoom(!showAddRoom)} className="btn-icon">
            <Plus size={16} />
          </button>
        </div>

        {showAddRoom && (
          <form onSubmit={handleCreateRoom} className="create-room-form">
            <input 
              type="text"
              required
              placeholder="room-name"
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '8px' }}
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
            />
            <input 
              type="text"
              placeholder="description"
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '8px' }}
              value={newRoomDesc}
              onChange={e => setNewRoomDesc(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" className="btn-primary" style={{ padding: '6px', fontSize: '12px' }}>Create</button>
              <button type="button" onClick={() => setShowAddRoom(false)} className="btn-icon" style={{ fontSize: '12px' }}>Cancel</button>
            </div>
          </form>
        )}

        <div className="rooms-list">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => handleSelectRoom(room)}
              className={`room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hash size={16} />
                <span>{room.name}</span>
              </div>
              {room.participants?.length > 0 && <Lock size={12} color="#64748b" />}
            </button>
          ))}
          {rooms.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
              No active channels. Click "+" to create one.
            </div>
          )}
        </div>
      </div>

      {/* CHAT MAIN WINDOW */}
      <div className="chat-main">
        {currentRoom ? (
          <>
            <div className="chat-header">
              <div className="chat-title-box">
                <h2>
                  <Hash size={20} color="#38bdf8" />
                  <span>{currentRoom.name}</span>
                </h2>
                <p>{currentRoom.description || 'Channel discussion'}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="online-pill">
                  <Users size={14} color="#38bdf8" />
                  <span>{onlineUsers.length} online</span>
                </div>
                <button onClick={() => setShowAddUser(!showAddUser)} className="btn-icon" title="Authorize User">
                  <UserPlus size={18} />
                </button>
              </div>
            </div>

            {showAddUser && (
              <form onSubmit={handleAddParticipant} style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Info size={16} color="#38bdf8" />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Authorize User:</span>
                <input 
                  type="text"
                  required
                  placeholder="username"
                  className="form-input"
                  style={{ width: '160px', padding: '6px 12px', fontSize: '12px' }}
                  value={participantInput}
                  onChange={e => setParticipantInput(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}>Add</button>
                <button type="button" onClick={() => setShowAddUser(false)} className="btn-icon" style={{ fontSize: '12px' }}>Close</button>
              </form>
            )}

            <div className="messages-container">
              {messages.map((msg, index) => {
                const isSelf = msg.sender_username === currentUser;
                return (
                  <div key={msg.id || index} className={`message-wrapper ${isSelf ? 'self' : 'other'}`}>
                    <span className="sender-name">{msg.sender_username}</span>
                    <div className="message-bubble">
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {Object.keys(typingUsers).filter(u => typingUsers[u]).map(username => (
                <div key={username} className="typing-indicator">
                  {username} is typing...
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-footer">
              <input 
                type="text"
                required
                placeholder={`Send a message to #${currentRoom.name}...`}
                className="chat-input"
                value={inputText}
                onChange={handleInputChange}
              />
              <button type="submit" className="btn-send">
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <MessageSquare className="empty-icon" />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>No Room Selected</h3>
            <p style={{ fontSize: '13px' }}>Select a channel from the left sidebar to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}

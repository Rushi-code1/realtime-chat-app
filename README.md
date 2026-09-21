# 💬 Real-Time Chat Application

> A production-grade **real-time messaging platform** built with Django Channels, WebSockets, and Redis — featuring a modern React.js frontend and full test coverage.

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.x-green?logo=django)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![Redis](https://img.shields.io/badge/Redis-7.x-red?logo=redis)](https://redis.io)
[![WebSockets](https://img.shields.io/badge/WebSockets-RFC6455-orange)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

---

## 🚀 Features

- **Real-Time Messaging** — Instant bidirectional communication via WebSockets (no polling)
- **Room-Based Chat** — Users can create/join named chat rooms dynamically
- **Redis Channel Layer** — Horizontally scalable message broker for multi-instance deployments
- **Custom Middleware** — JWT-based WebSocket authentication middleware
- **Async Consumers** — Non-blocking Django Channels consumers for high concurrency
- **React.js Frontend** — Vite-powered SPA with live message streaming
- **PyTest Coverage** — Full test suite covering consumers, middleware, and API endpoints

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Django 4.x, Django Channels 4.x |
| **Real-Time** | WebSockets, ASGI |
| **Message Broker** | Redis 7 (Channel Layer) |
| **Frontend** | React.js 18, Vite |
| **Auth** | JWT (via Custom Middleware) |
| **Testing** | PyTest, pytest-asyncio |
| **Deployment** | Docker, Docker Compose |

---

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────────┐
│   React.js SPA  │ ◄────────────────► │  Django Channels ASGI │
│   (Vite + WS)   │                    │  (AsyncWebsocketConsumer) │
└─────────────────┘                    └──────────┬───────────┘
                                                   │ Channel Layer
                                       ┌───────────▼───────────┐
                                       │      Redis Pub/Sub     │
                                       │   (Group Broadcasting) │
                                       └───────────────────────┘
```

---

## 📁 Project Structure

```
realtime-chat-app/
├── backend/
│   ├── chat/
│   │   ├── consumers.py        # Async WebSocket consumers
│   │   ├── middleware.py       # JWT WebSocket auth middleware
│   │   ├── routing.py          # WebSocket URL routing
│   │   ├── models.py           # Chat room & message models
│   │   └── tests.py            # PyTest test suite
│   ├── config/
│   │   ├── asgi.py             # ASGI application entry point
│   │   └── settings.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # React chat components
│   │   ├── hooks/              # Custom WebSocket hooks
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis 7+
- Docker & Docker Compose (optional)

### 1. Clone the Repository
```bash
git clone https://github.com/Rushi-code1/realtime-chat-app.git
cd realtime-chat-app
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Set REDIS_URL, SECRET_KEY, ALLOWED_HOSTS

python manage.py migrate
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Start Redis
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 5. Or Use Docker Compose (Recommended)
```bash
docker-compose up --build
```

---

## 🧪 Running Tests
```bash
cd backend
pytest --asyncio-mode=auto -v
```

---

## 📡 WebSocket API

| Event | Direction | Payload |
|-------|-----------|---------|
| `chat.message` | Client → Server | `{ "message": "Hello!" }` |
| `chat.message` | Server → Client | `{ "message": "Hello!", "user": "Rushi", "timestamp": "..." }` |
| `user.join` | Server → Client | `{ "user": "Rushi", "event": "joined" }` |
| `user.leave` | Server → Client | `{ "user": "Rushi", "event": "left" }` |

---

## 🔑 Key Implementation Highlights

- **`consumers.py`** — `AsyncWebsocketConsumer` with group broadcast via `channel_layer.group_send()`
- **`middleware.py`** — Async ASGI middleware that validates JWT tokens on WebSocket handshake
- **`tests.py`** — `WebsocketCommunicator` tests simulating real connection lifecycle

---

## 👨‍💻 Author

**Rushikesh Sunil Deshmukh**  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://linkedin.com/in/rushikesh-sunil-deshmukh)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-green)](https://rushi-code1.github.io/portfolio2/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?logo=github)](https://github.com/Rushi-code1)

---

## 📄 License
This project is licensed under the MIT License.

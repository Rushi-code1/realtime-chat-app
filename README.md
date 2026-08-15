# WebSocket-Based Real-Time Chat Application

A high-concurrency, real-time chat application featuring JWT token authentication, room-based authorization, dynamic message history, and user presence/typing tracking.

## Technical Architecture

* **Backend**: Django 5.1, Django REST Framework (DRF), Django Channels 4.3 (ASGI), Channels Redis, SimpleJWT.
* **Frontend**: React (Vite), Tailwind-inspired custom glassmorphism styles, Lucide Icons, Native WebSocket API with automatic reconnect logic.
* **Database**: PostgreSQL (User registry, Room configurations, Messages history).
* **Caching & Broker**: Redis server (active user presence tracking, WebSocket channel layers).

---

## Core Features

1. **JWT & Connection Handshake**: Connections are authorized by evaluating JWT tokens passed in the query string (`ws://.../?token=<token>`). Unauthenticated connection requests are immediately rejected.
2. **Room Authorization**: Rooms can be public or restricted to a list of allowed participants.
3. **Active Presence Tracking**: Connection/disconnection automatically triggers a Redis cache update, broadcasting the list of active users to the room.
4. **Typing Indicators**: Asynchronous typing events are throttled and broadcast to other users in real-time.
5. **Interactive UI**: Gorgeous glassmorphism dashboard, dynamic scrollbars, message alignment, and active presence dots.

---

## Installation & Running

### Prerequisites
* Python 3.10+
* Node.js (with npm)
* Redis Server (running on default port `6379`)
* PostgreSQL (database `realtime_chat_app`)

### 1. Run the Backend
1. Open a terminal in `backend/`.
2. Configure settings (the database default credentials point to `postgres` / `PeopleNexus@2025` on localhost).
3. Apply migrations:
   ```bash
   python manage.py migrate
   ```
4. Run the development server (runs via Daphne for ASGI support):
   ```bash
   python manage.py runserver
   ```
5. Run the automated PyTest suite to verify operations:
   ```bash
   python -m pytest
   ```

### 2. Run the Frontend
1. Open a terminal in `frontend/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the browser to `http://localhost:5173`.

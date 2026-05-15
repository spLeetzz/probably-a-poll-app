# probably-a-poll-app: Backend API Reference

This document provides a comprehensive guide to the backend architecture, including Authentication (Better Auth), REST API endpoints, WebSocket events (Socket.io), and the Database Schema.

---

## 1. Authentication (Better Auth)

The backend uses [Better Auth](https://www.better-auth.com/) for session management. It supports standard Email/Password, Google OAuth, and **Anonymous Sessions**.

### **Key Concepts**
- **Session Cookie**: Standard authentication uses a `better-auth.session_token` cookie.
- **Anonymous Users**: Every guest is automatically assigned an anonymous profile on their first interaction. If they later sign up, their created events are automatically linked to their new account.
- **Banter sessionToken**: For Banter rooms (which are ephemeral), a separate `sessionToken` is generated per-participant and should be sent in the `x-session-token` header for REST calls or the `join_room` event for WebSockets.

### **Endpoints (provided by Better Auth)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/sign-up/email` | Create a new user account. |
| `POST` | `/api/auth/sign-in/email` | Sign in with email and password. |
| `GET` | `/api/auth/get-session` | Returns the current session and user data. |
| `POST` | `/api/auth/sign-out` | Ends the current session. |
| `POST` | `/api/auth/sign-in/anonymous` | Starts an anonymous session for guest users. |

---

## 2. REST API: Events & Management

All custom endpoints are prefixed with `/`. The base URL for the API is `http://localhost:4000` (development).

### **Events (`/events`)**
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/events` | Yes | Create a new event (Poll or Banter). |
| `GET` | `/events` | No | List public events (paginated). |
| `GET` | `/events/:id` | No* | Fetch event details. (Blocked if private and not creator). |
| `GET` | `/events/slug/:joinSlug` | No | Fetch event details using its unique slug. |
| `PATCH` | `/events/:id` | Creator | Update event metadata (title, status, etc.). |
| `DELETE` | `/events/:id` | Creator | Permanently delete an event. |
| `POST` | `/events/:id/start` | Creator | Change status from `pending` to `running`. |
| `POST` | `/events/:id/complete`| Creator | Change status from `running` to `completed`. |

**Example: Create Event**
```json
// POST /events
{
  "title": "Which coffee is best?",
  "type": "poll",
  "joinMode": "open",
  "authOnly": false,
  "isPrivate": true
}
```

---

## 3. REST API: Items & Options

Items (questions) and Options are managed hierarchically under events.

### **Items (`/events/:eventId/items`)**
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/events/:id/items` | Creator | Add a new question. |
| `GET` | `/events/:id/items` | No | List all questions for an event. |
| `PATCH` | `/events/:id/items/:itemId` | Creator | Update question text or ordering. |
| `DELETE`| `/events/:id/items/:itemId` | Creator | Remove a question. |

### **Options (`/events/:id/items/:itemId/options`)**
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `PUT` | `/` | Creator | Replaces the entire options list for a question. |

**Example: Set Options**
```json
// PUT /events/ID/items/ITEM_ID/options
{
  "options": [
    { "text": "Espresso", "order": 1 },
    { "text": "Latte", "order": 2 }
  ]
}
```

---

## 4. REST API: Participation & Responses

### **Poll Participation**
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/:id/respond` | No* | Submit answers for all items in a poll. |
| `GET` | `/:id/analytics` | No* | Fetch vote counts and percentages for all options. |

### **Banter Participation**
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/:id/join` | No | Join a banter room with a display name. |
| `POST` | `/:id/vote` | No** | Single-item instant vote (one-click). |
| `GET` | `/:id/messages` | No** | Fetch paginated chat message history. |

*\* Respects event privacy and auth settings.*
*\** Requires `x-session-token` header.*

---

## 5. WebSocket (Socket.io)

The backend uses two distinct WebSocket contexts. The root namespace handles poll updates, while `/banter` handles chat and real-time room events.

### **Namespace: `/` (Polls)**
Connect to results tracking and participant updates.
- **Client to Server**:
  - `join:room`: `{ eventId: string }`
- **Server to Client**:
  - `room:joined`: `{ eventId: string }`
  - `response:new`: `{ itemId, optionId, newVoteCount, totalResponses }`
  - `participant:status_updated`: `{ participantId, status }`

### **Namespace: `/banter`**
Handles the high-frequency "Banter" room interactions.
- **Client to Server**:
  - `join_room`: `{ joinSlug: string, sessionToken: string }`
  - `send_message`: `{ content: string }`
- **Server to Client**:
  - `room_joined`: `{ eventId: string }`
  - `new_message`: `{ id, content, participantId, displayName, createdAt }`
  - `new_item`: `{ id, text, options: [...] }`
  - `answer_recorded`: `{ optionId, newVoteCount }`

---

## 6. Database Schema (Drizzle)

### **Core Tables**
1. **`users`**: Auth users (managed by Better Auth).
2. **`events`**:
   - `id`: Text (Slug-like short IDs, e.g., `ADE`).
   - `type`: `poll` or `banter`.
   - `status`: `pending`, `running`, `completed`.
   - `joinSlug`: UUID-like string for private access.
3. **`items`**: Questions linked to an event.
4. **`options`**: Choices for MCQ items; tracks `vote_count` (atomic).
5. **`participants`**: Links a user/session to an event. Stores `sessionToken` for Banter rooms.
6. **`answers`**: Raw response records (used for validation and history).
7. **`messages`**: Chat history for Banter rooms.

---

## 7. Frontend Integration Guide

### **Standard Poll Flow**
1. Fetch event metadata via `GET /events/slug/:joinSlug`.
2. Check `event.status` and `event.authOnly`.
3. Fetch items via `GET /events/:id/items`.
4. To vote: Send `POST /events/:id/respond` with the full selection.
5. Live Results: Connect to Socket.io (`/`), emit `join:room`, and listen for `response:new`.

### **Banter Room Flow**
1. Fetch room via `GET /events/slug/:joinSlug`.
2. User provides name -> `POST /events/:id/join`. Save `sessionToken`.
3. Connect to Socket.io (`/banter`), emit `join_room` with the token.
4. Render chat using `GET /events/:id/messages`.
5. For MCQ items: Use `POST /events/:id/vote` (One-click). Listen for `answer_recorded` to update bars instantly.

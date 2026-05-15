# Backend API Reference for Banter Feature — Frontend Integration Guide

The backend now supports a new event type called **"banter"** — a persistent chat room with real-time messaging and inline polling. Here is everything the frontend needs to know.

---

## CONCEPTS

### What is a Banter Event?
A banter event is a persistent chat room. It reuses the same `events` table with `type: "banter"`. It has:
- **Participants** (same `participants` table as polls)
- **Chat messages** (new `messages` table)
- **Poll questions** (same `items` table — items belong directly to the banter event)
- **Answers** (same `answers` table)

### Private Rooms (`joinSlug`)
When a banter event has a `joinSlug`, it is **private**:
- It will **never** appear in `GET /events` list queries
- `GET /events/:id` returns **404** for it
- It is **only** accessible via `/room/:joinSlug` routes
- The creator can reset the slug (old link immediately dies)
- When `joinSlug` is `null`, the event is public (normal behavior)

### Anonymous Mode (`isAnonymous`)
When `event.isAnonymous === true`:
- `userId` is **never** included in any API response or WebSocket payload
- `creatorId` is stripped from the room detail response
- Answer results show aggregate `voteCount` only — no per-participant breakdown
- Messages show `displayName` only — no linkage to real accounts
- Users **must** enter a `displayName` manually when joining, even if authenticated

When `event.isAnonymous === false`:
- `userId` can be included in responses for auth users
- If `authOnly` is also true: `displayName` is auto-populated from auth user's name (no input needed)

---

## CREATING A BANTER EVENT

### `POST /events`
Same endpoint as polls, now supports `type: "banter"`.

**Request body:**
```json
{
  "title": "My Chat Room",
  "description": "Optional description",
  "type": "banter",
  "joinMode": "open",
  "authOnly": false,
  "resultsVisibility": "public",
  "isPrivate": true,
  "isAnonymous": false
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string (1-255) | ✅ | Room name |
| `description` | string (0-1000) | ❌ | Room description |
| `type` | `"poll" \| "banter"` | ✅ | Set to `"banter"` |
| `joinMode` | `"open" \| "approval"` | ❌ | Default `"open"` |
| `authOnly` | boolean | ❌ | Default `false`. If true, only authenticated users can join |
| `resultsVisibility` | `"public" \| "private"` | ❌ | Default `"public"` |
| `isPrivate` | boolean | ❌ | Default `false`. If `true`, backend generates a random `joinSlug` and the room is only accessible via that slug |
| `isAnonymous` | boolean | ❌ | Default `false`. See anonymity rules above |
| `expiresAt` | ISO date-time string | ❌ | Optional expiry |

**Response (201):**
```json
{
  "data": {
    "id": "707",
    "creatorId": "user_abc123",
    "title": "My Chat Room",
    "description": null,
    "type": "banter",
    "status": "pending",
    "joinMode": "open",
    "authOnly": false,
    "resultsVisibility": "public",
    "expiresAt": null,
    "createdAt": "2026-05-15T14:00:00.000Z",
    "updatedAt": "2026-05-15T14:00:00.000Z",
    "itemCount": 0,
    "isPublished": false,
    "joinSlug": "a0ljFqe5h0Lq2W5xoYpieAb3kd9fR2x1",
    "isAnonymous": false
  }
}
```

> **Important:** After creating a banter event with `isPrivate: true`, use the returned `joinSlug` to construct the room URL (e.g. `/room/a0ljFqe5h0Lq...`). The event's numeric `id` will NOT work for accessing this room.

---

## ROOM ROUTES (prefix: `/room`)

### 1. `GET /room/:joinSlug` — Get Room Details

Returns the banter event details + participant count + current user's participant record (if any).

**Auth:** Optional (Better Auth session cookie). If authenticated, checks if user is already a participant.

**Response (200):**
```json
{
  "data": {
    "id": "707",
    "creatorId": "user_abc123",
    "title": "My Chat Room",
    "description": null,
    "type": "banter",
    "status": "pending",
    "joinMode": "open",
    "authOnly": false,
    "resultsVisibility": "public",
    "expiresAt": null,
    "createdAt": "2026-05-15T14:00:00.000Z",
    "updatedAt": "2026-05-15T14:00:00.000Z",
    "itemCount": 0,
    "isPublished": false,
    "joinSlug": "a0ljFqe5h0Lq2W5xoYpieAb3kd9fR2x1",
    "isAnonymous": false,
    "participantCount": 5,
    "participant": null
  }
}
```

When `isAnonymous === true`, `creatorId` will be `undefined` in the response.

If the current user is already a participant, `participant` will be the full participant object:
```json
{
  "participant": {
    "id": "uuid",
    "eventId": "707",
    "userId": "user_abc123",
    "sessionToken": "base64url-token",
    "displayName": "Aditya",
    "status": "approved",
    "joinedAt": "...",
    "submittedAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errors:**
- `404` — Room not found (invalid slug)

---

### 2. `POST /room/:joinSlug/join` — Join Room

Creates a participant row and returns a `sessionToken`. **Store this token** — it's needed for sending messages.

**Auth:** Depends on event settings:
- `authOnly: false` → No auth needed
- `authOnly: true` → Requires Better Auth session cookie

**Request body:**
```json
{
  "displayName": "My Nickname"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `displayName` | string (1-100) | ✅ | Always required in the body, but see override rules below |

**DisplayName override logic:**
- `isAnonymous === true` → **Always** uses the `displayName` from the body, regardless of auth status
- `isAnonymous === false && authOnly === true` → **Ignores** body displayName, auto-uses authenticated user's name
- `isAnonymous === false && authOnly === false` → Uses `displayName` from body

**Response (201) — New participant:**
```json
{
  "data": {
    "participantId": "uuid",
    "sessionToken": "base64url-random-token",
    "displayName": "My Nickname",
    "alreadyJoined": false
  }
}
```

**Response (200) — Already joined (authenticated user re-joining):**
```json
{
  "data": {
    "participantId": "uuid",
    "sessionToken": "existing-token",
    "displayName": "My Nickname",
    "alreadyJoined": true
  }
}
```

> **Important:** The `sessionToken` is used for:
> 1. Sending messages via REST (`x-session-token` header)
> 2. Joining the WebSocket room (`join_room` event)
>
> Store it in localStorage or a React ref, keyed by the joinSlug or eventId.

**Errors:**
- `404` — Room not found
- `401` — Auth required but user not authenticated (authOnly room)

---

### 3. `POST /room/:joinSlug/reset-link` — Reset Invite Link

**Creator only.** Generates a new `joinSlug`, immediately invalidating the old one. Anyone who had the old link can no longer access the room.

**Auth:** Requires Better Auth session. Must be the event creator.

**Request body:** None

**Response (200):**
```json
{
  "data": {
    "joinSlug": "new-random-slug-32-chars"
  }
}
```

> **Frontend note:** After this call, you need to update your URL/state to use the new slug. The old slug returns 404 immediately.

**Errors:**
- `404` — Room not found
- `401` — Not authenticated
- `403` — Not the room creator

---

### 4. `GET /room/:joinSlug/messages?cursor=<ISO-timestamp>&limit=50` — Message History

Paginated message history, **newest first**, cursor-based on `createdAt`.

**Auth:** None required (room is accessible by slug).

**Query parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `cursor` | ISO timestamp string | _(none)_ | Fetch messages older than this timestamp. Omit for latest messages. |
| `limit` | integer (1-100) | 50 | Number of messages to return |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "content": "Hello everyone!",
      "participantId": "uuid",
      "displayName": "Aditya",
      "createdAt": "2026-05-15T14:05:00.000Z"
    },
    {
      "id": "uuid",
      "content": "Hey!",
      "participantId": "uuid",
      "displayName": "Another User",
      "createdAt": "2026-05-15T14:04:30.000Z"
    }
  ],
  "nextCursor": "2026-05-15T14:04:30.000Z"
}
```

- `nextCursor` is `null` when there are no more messages (i.e. returned fewer than `limit`).
- To load older messages: `GET /room/:slug/messages?cursor=<nextCursor>&limit=50`
- Messages are ordered **newest first** — render them in reverse or prepend when loading older ones.
- `userId` is **never** included regardless of anonymity setting.

---

### 5. `POST /room/:joinSlug/messages` — Send Message (REST Fallback)

REST alternative to sending messages via WebSocket. Primarily use WebSocket; this is a fallback.

**Auth:** Requires `x-session-token` header with the token received from the join endpoint.

**Headers:**
```
x-session-token: <sessionToken from join response>
```

**Request body:**
```json
{
  "content": "Hello, world!"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `content` | string (1-2000) | ✅ | Message text |

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "content": "Hello, world!",
    "participantId": "uuid",
    "displayName": "Aditya",
    "createdAt": "2026-05-15T14:10:00.000Z"
  }
}
```

The message is also broadcast via WebSocket `new_message` event to the room.

**Errors:**
- `404` — Room not found
- `401` — Missing session token
- `403` — Not a participant of this room

---

## INLINE POLLS INSIDE BANTER

Items (poll questions) and answers work exactly like regular polls but are scoped to the banter event's `eventId`. Use the existing endpoints:

- `POST /events/:eventId/items` — Add a poll question to the room
- `GET /events/:eventId/items` — List all poll questions in the room
- `POST /events/:eventId/respond` — Submit answers
- `GET /events/:eventId/analytics` — Get vote counts

> **Note:** These routes use the event's numeric `id` (from the room detail response), NOT the `joinSlug`. The `GET /events/:id` route will return 404 for private rooms, but the items/responses sub-routes should still work since they fetch the event internally by ID.

---

## WEBSOCKET — `/banter` Namespace

Connect to Socket.IO at `http://localhost:4000/banter` (the `/banter` namespace).

**No auth cookie needed for connection.** Authentication happens via the `join_room` event using the `sessionToken`.

### Connection

```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000/banter", {
  // No withCredentials needed — auth is via sessionToken
});
```

### Client → Server Events

#### `join_room`
Must be the first event after connecting. Joins the socket to the room.

```typescript
socket.emit("join_room", {
  joinSlug: "a0ljFqe5h0Lq2W5xoYpieAb3kd9fR2x1",
  sessionToken: "token-from-join-endpoint"
});
```

#### `send_message`
Send a chat message. Must call `join_room` first.

```typescript
socket.emit("send_message", {
  content: "Hello everyone!"
});
```

Content must be 1-2000 characters.

### Server → Client Events

#### `room_joined`
Confirmation that you successfully joined the room.

```typescript
socket.on("room_joined", ({ eventId }) => {
  console.log("Joined room for event:", eventId);
});
```

#### `new_message`
Broadcast to all participants when a message is sent (via WebSocket or REST).

```typescript
socket.on("new_message", (msg) => {
  // msg = {
  //   id: "uuid",
  //   content: "Hello everyone!",
  //   participantId: "uuid",
  //   displayName: "Aditya",
  //   createdAt: "2026-05-15T14:10:00.000Z"
  // }
});
```

- Never contains `userId`.
- Use `participantId` to determine if the message is from the current user.

#### `participant_joined`
Broadcast when a new participant joins the room.

```typescript
socket.on("participant_joined", ({ displayName, participantId }) => {
  // Show "Aditya joined the room" notification
});
```

#### `new_item`
Broadcast when a new poll question is added to the room. Payload is the full item + options object.

#### `answer_recorded`
Broadcast when someone answers a poll question. Payload contains updated `voteCount` per option.

#### `error`
Server-side error.

```typescript
socket.on("error", ({ message }) => {
  console.error("Socket error:", message);
});
```

Possible error messages:
- `"Room not found"`
- `"Invalid session token"`
- `"Not in a room. Call join_room first."`
- `"Message content must be 1-2000 characters"`
- `"Participant no longer valid"`
- `"Failed to join room"`
- `"Failed to send message"`

---

## CHANGES TO EXISTING ENDPOINTS

### `GET /events` — List Events
- Now **excludes** any event with `joinSlug IS NOT NULL` (private banter rooms never appear in lists)
- `type` filter now accepts `"banter"` in addition to `"poll"` (but banter events with joinSlug still won't appear)

### `GET /events/:id` — Get Event
- Returns **404** if the event has a `joinSlug` set (private rooms must be accessed via `/room/:joinSlug`)
- Public banter events (no joinSlug) still work via this route

### `POST /events` — Create Event
- Now accepts `type: "banter"` alongside `"poll"`
- New optional fields: `isPrivate` (boolean), `isAnonymous` (boolean)
- Response now includes `joinSlug` and `isAnonymous` fields on all events (null/false for existing polls)

### Event Object Shape (updated)
All event objects now have two new fields:
```json
{
  "id": "707",
  "joinSlug": "random-32-char-string-or-null",
  "isAnonymous": false,
  // ... all other existing fields unchanged
}
```

---

## FRONTEND SESSION MANAGEMENT SUMMARY

| What | Where to store | When to use |
|------|---------------|-------------|
| Auth session | Better Auth cookie (automatic) | Creating events, joining authOnly rooms, creator-only actions |
| Banter sessionToken | `localStorage` keyed by joinSlug | REST message sending (`x-session-token` header), WebSocket `join_room` |
| participantId | Component state or localStorage | Identifying own messages in the chat feed |

---

## TYPICAL FRONTEND FLOW

1. **Create room:** `POST /events` with `type: "banter"`, `isPrivate: true` → get `joinSlug`
2. **Navigate to room:** `/room/:joinSlug`
3. **Load room info:** `GET /room/:joinSlug` → get event details, participantCount, existing participant
4. **Join room (if not already):** `POST /room/:joinSlug/join` with `{ displayName }` → get `sessionToken`
5. **Load message history:** `GET /room/:joinSlug/messages?limit=50` → render messages
6. **Connect WebSocket:** `io("http://localhost:4000/banter")`
7. **Join socket room:** `emit("join_room", { joinSlug, sessionToken })` → wait for `room_joined`
8. **Send messages:** `emit("send_message", { content })` — or REST fallback
9. **Listen for events:** `new_message`, `participant_joined`, `new_item`, `answer_recorded`
10. **Infinite scroll:** Load older messages with cursor pagination
11. **Creator: reset link:** `POST /room/:joinSlug/reset-link` → update URL to new slug

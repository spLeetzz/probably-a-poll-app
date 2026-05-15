# Probably a Poll App

Real-time polling platform for settling scores and making decisions.

Create standard polls or jump into a Banter room for live chat and instant voting.

Anonymous or authenticated participants.

Live vote sync via WebSocket. Approval-gated events. Analytics per question.

```
poll-app/
├── server/   # Fastify backend | REST + WebSocket
└── client/     # React + Vite frontend
```

---

## Features

### Banter Rooms

Ever had an argument in a WhatsApp group and couldn't settle it? Create a Banter room.
- **Live Chat:** Chat on the same platform where you poll.
- **Instant Voting:** High-frequency, one-click voting on items.
- **Anonymous Polling:** No one knows who voted for what, keeping the peace in the group.
- **Ephemeral & Fast:** Share a link, join with a name, and start settling the score.

### Polls

- Create poll events with title, description, expiry date
- **Lifecycle:** `pending → running → completed`
- **Join modes:** open (anyone joins) or approval (host approves each participant)
- **Results visibility:** public or private (creator-only until published)
- **Auth gate:** mark event auth-only to block anonymous users from responding
- Publish completed events to make results permanently visible

### Questions 

- Add unlimited questions per event
- Mark questions as mandatory
- Each question can have multiple choice options or be open-ended (text answer)
- Questions only editable while event is `pending`

### Responses

- Submit answers to all questions in one atomic transaction
- Prevents duplicate submissions per session
- Validates mandatory fields before insert
- Open-ended answers stored as plain text
- Option-based answers increment `voteCount` atomically

### Real-time

- WebSocket room per event (Socket.IO)
- Live `response:new` → updates vote counts for all viewers instantly
- Live `response:count` → updates total response counter
- `participant:status_updated` → host approval reflected immediately to participant
- Anonymous users get a hidden Better Auth session automatically, no sign-in prompt needed

### Authentication

- Google OAuth via Better Auth
- Anonymous sessions , created silently on first API call, invisible to user
- Session cookie based , no token management in frontend
- Authenticated users can be identified across events

### Participants & Approval

- Every submission creates or updates a `participant` row
- Approval mode: participants start `pending`, host approves or rejects
- Rejected participants cannot submit
- Host sees participant list with names and status in real time

### Analytics

- Per-question breakdown: vote counts + percentages per option
- Total response count
- Text answers collected per open-ended question
- Only visible based on `resultsVisibility` setting

---

## Running locally

### Backend

```bash
cd server
cp .env.example .env     # fill values
npm install
npm run dev              # runs on :4000
```

### Frontend

```bash
cd client
cp .env.example .env     # fill values
npm install
npm run dev              # runs on :3000
```

---

## Environment variables

### Backend (`server/.env`)

| Variable               | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string (Supabase pooler URL)     |
| `BETTER_AUTH_SECRET`   | Random secret for session signing                    |
| `BETTER_AUTH_URL`      | Public URL of backend (e.g. `http://localhost:4000`) |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                               |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                           |
| `PORT`                 | Port to listen on (default `4000`)                   |

### Frontend (`client/.env`)

| Variable             | Description                                     |
| -------------------- | ----------------------------------------------- |
| `VITE_AUTH_BASE_URL` | Backend base URL (e.g. `http://localhost:4000`) |

---

## Database migrations

```bash
cd server
npx drizzle-kit generate   # generate migration from schema diff
# then run the SQL in Supabase SQL Editor (drizzle-kit migrate times out with pooler)
```

---

## API Reference

Base URL: `http://localhost:4000`

All endpoints return `{ data: ... }` on success or `{ message: string }` on error.

---

### Events

#### `GET /events`

List events.

**Query params**
| Param | Type | Description |
|---|---|---|
| `creatorId` | string | Filter by creator |
| `status` | `pending | running | completed` | Filter by status |
| `type` | `poll | banter` | Filter by event type |
| `limit` | integer | Max results (default 20, max 100) |
| `offset` | integer | Pagination offset |

**Response** `Event[]`

---

#### `POST /events`

Create event. Auth required.

**Body**

```json
{
  "title": "Team Feedback Q2",
  "description": "Optional",
  "type": "poll",
  "joinMode": "open",
  "authOnly": false,
  "resultsVisibility": "public",
  "expiresAt": "2025-06-01T00:00:00Z"
}
```

---

#### `GET /events/:id`

Get single event. Includes `participant` field if caller has joined.

---

#### `PATCH /events/:id`

Update event metadata. Creator only. Event must be `pending`.

**Body** , all fields optional

```json
{
  "title": "Updated title",
  "description": null,
  "joinMode": "approval",
  "authOnly": true,
  "resultsVisibility": "private",
  "expiresAt": null
}
```

---

#### `DELETE /events/:id`

Delete event and all related data. Creator only.

---

#### `POST /events/:id/start`

Transition `pending → running`. Creator only.

---

#### `POST /events/:id/complete`

Transition `running → completed`. Creator only.

---

#### `POST /events/:id/publish`

Transition `completed -> published`. Makes results public. Creator only.

---

### Banter Participation

#### `POST /events/:id/join`

Join a banter room. Returns a `sessionToken`.
**Body**
```json
{ "displayName": "Aditya" }
```

---

#### `POST /events/:id/vote`

One-click vote for an item. Requires `x-session-token` header.
**Body**
```json
{ "optionId": "uuid" }
```

---

#### `GET /events/:id/messages`

Fetch chat history for a banter room. Requires `x-session-token` header.

---

### Items (Questions)

#### `GET /events/:eventId/items`

List all questions with their options.

---

#### `POST /events/:eventId/items`

Add question. Creator only. Event must be `pending`.

```json
{
  "text": "What is your preferred meeting time?",
  "order": 1,
  "isMandatory": true
}
```

---

#### `GET /events/:eventId/items/:itemId`

Get single question with options.

---

#### `PATCH /events/:eventId/items/:itemId`

Update question. Creator only. Event must be `pending`.

```json
{
  "text": "Updated question",
  "order": 2,
  "isMandatory": false
}
```

---

#### `DELETE /events/:eventId/items/:itemId`

Delete question. Creator only. Event must be `pending`.

---

### Options

#### `GET /events/:eventId/items/:itemId/options`

List options for question.

---

#### `PUT /events/:eventId/items/:itemId/options`

Replace all options. Creator only. Event must be `pending`.

```json
{
  "options": [
    { "text": "9 AM", "order": 1 },
    { "text": "2 PM", "order": 2 },
    { "text": "5 PM", "order": 3 }
  ]
}
```

Send empty array `{ "options": [] }` to make question open-ended (text answer).

---

### Responses

#### `POST /events/:eventId/respond`

Submit answers. Event must be `running`. One submission per session.

```json
{
  "answers": [
    { "itemId": "uuid", "optionId": "uuid" },
    { "itemId": "uuid", "textAnswer": "Some free text" }
  ]
}
```

**Returns**

```json
{
  "data": {
    "participantId": "uuid",
    "submittedAt": "2025-05-14T10:00:00Z"
  }
}
```

---

#### `GET /events/:eventId/analytics`

Get vote counts + percentages per option and text responses for open-ended questions.
Gated by `resultsVisibility`. Creator always has access.

**Response**

```json
{
  "data": {
    "totalResponses": 42,
    "items": [
      {
        "itemId": "uuid",
        "text": "Question text",
        "options": [
          {
            "optionId": "uuid",
            "text": "Option A",
            "voteCount": 20,
            "percentage": 47.6
          }
        ],
        "textResponses": []
      }
    ]
  }
}
```

---

### Participants

#### `GET /events/:eventId/participants`

List participants. Creator only.

---

#### `PATCH /events/:eventId/participants/:participantId`

Approve or reject participant. Creator only. Only on approval-mode events.

```json
{ "status": "approved" }
```

---

### WebSocket

Connect to `ws://localhost:4000` with credentials (session cookie must be present).

#### Client → Server

| Event       | Payload       | Description                      |
| ----------- | ------------- | -------------------------------- |
| `join:room` | `{ eventId }` | Join event room for live updates |

#### Server → Client

| Event                        | Payload                                              | Description                  |
| ---------------------------- | ---------------------------------------------------- | ---------------------------- |
| `room:joined`                | `{ eventId }`                                        | Confirms room join           |
| `response:new`               | `{ optionId, itemId, newVoteCount, totalResponses }` | Vote cast                    |
| `response:count`             | `{ totalResponses }`                                 | Total response count updated |
| `participant:status_updated` | `{ participantId, status }`                          | Approval status changed      |
| `error`                      | `{ message }`                                        | Something went wrong         |

#### Namespace: `/banter`

Handles high-frequency banter room interactions. Requires `x-session-token` for authorization.

| Event       | Payload       | Description                      |
| ----------- | ------------- | -------------------------------- |
| `join_room` | `{ joinSlug, sessionToken }` | Join banter room |
| `send_message` | `{ content }` | Send a chat message |

**Server -> Client**
| Event       | Payload       | Description                      |
| ----------- | ------------- | -------------------------------- |
| `room_joined` | `{ eventId }` | Confirms room join |
| `new_message` | `{ id, content, displayName, createdAt }` | New chat message |
| `new_item` | `{ id, text, options }` | New poll item added to room |
| `answer_recorded` | `{ optionId, newVoteCount }` | Real-time vote update |

---

## Tech stack

| Layer             | Tech                                            |
| ----------------- | ----------------------------------------------- |
| Backend framework | Fastify                                         |
| ORM               | Drizzle ORM                                     |
| Database          | PostgreSQL (Supabase)                           |
| Auth              | Better Auth (Google OAuth + anonymous sessions) |
| WebSocket         | Socket.IO                                       |
| Frontend          | React 19 + Vite                                 |
| Routing           | React Router v7                                 |
| UI                | shadcn/ui + Radix + Tailwind CSS v4             |
| Charts            | Recharts                                        |
| Realtime client   | socket.io-client                                |

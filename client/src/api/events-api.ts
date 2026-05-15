import { apiFetch, readApiData } from '../lib/api-fetch'

export type EventType = 'poll'
export type EventStatus = 'pending' | 'running' | 'completed'
export type JoinMode = 'open' | 'approval'
export type ResultsVisibility = 'public' | 'private'
export type ParticipantStatus = 'pending' | 'approved' | 'rejected'

export interface Event {
  id: string
  creatorId: string
  title: string
  description: string | null
  type: EventType
  status: EventStatus
  joinMode: JoinMode
  authOnly: boolean
  resultsVisibility: ResultsVisibility
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  itemCount: number
  isPublished: boolean
  participant?: {
    id: string
    status: ParticipantStatus
    joinedAt: string
  }
}

export interface Item {
  id: string
  eventId: string
  order: number
  text: string
  mediaUrl: string | null
  correctAnswer: string | null
  isMandatory: boolean
  createdAt: string
  updatedAt: string
}

export interface OptionRow {
  id: string
  itemId: string
  text: string
  order: number
  voteCount: number
  createdAt: string
  updatedAt: string
}

export interface ItemWithOptions extends Item {
  options: OptionRow[]
}

export interface CreateEventBody {
  title: string
  description?: string
  type: EventType
  joinMode?: JoinMode
  authOnly?: boolean
  resultsVisibility?: ResultsVisibility
  expiresAt?: string
}

export interface UpdateEventBody {
  title?: string
  description?: string | null
  joinMode?: JoinMode
  authOnly?: boolean
  resultsVisibility?: ResultsVisibility
  expiresAt?: string | null
}

export interface CreateItemBody {
  text: string
  order: number
  isMandatory?: boolean
}

export interface UpdateItemBody {
  text?: string
  order?: number
  isMandatory?: boolean
}

export interface OptionInput {
  id?: string
  text: string
  order: number
}

export interface Analytics {
  totalResponses: number
  items: {
    itemId: string
    text: string
    options: {
      optionId: string
      text: string
      voteCount: number
      percentage: number
    }[]
    textResponses: string[]
  }[]
}

export interface Participant {
  id: string
  eventId: string
  userId: string
  userName: string | null
  userEmail: string | null
  status: ParticipantStatus
  joinedAt: string
}

export type AnswerPayload =
  | { itemId: string; optionId: string; textAnswer?: never }
  | { itemId: string; textAnswer: string; optionId?: never }

const qs = (p: Record<string, string | number | undefined>) => {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue
    u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

export async function listEvents(params?: {
  creatorId?: string
  type?: EventType
  status?: EventStatus
  limit?: number
  offset?: number
}): Promise<Event[]> {
  const res = await apiFetch(`/events${qs(params || {})}`)
  return readApiData<Event[]>(res)
}

export async function createEvent(body: CreateEventBody): Promise<Event> {
  const res = await apiFetch('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readApiData<Event>(res)
}

export async function getEvent(id: string): Promise<Event> {
  const res = await apiFetch(`/events/${encodeURIComponent(id)}`)
  return readApiData<Event>(res)
}

export async function updateEvent(id: string, body: UpdateEventBody): Promise<Event> {
  const res = await apiFetch(`/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readApiData<Event>(res)
}

export async function deleteEvent(id: string): Promise<{ deleted: boolean; id: string }> {
  const res = await apiFetch(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return readApiData(res)
}

export async function startEvent(id: string): Promise<Event> {
  const res = await apiFetch(`/events/${encodeURIComponent(id)}/start`, { method: 'POST' })
  return readApiData<Event>(res)
}

export async function completeEvent(id: string): Promise<Event> {
  const res = await apiFetch(`/events/${encodeURIComponent(id)}/complete`, { method: 'POST' })
  return readApiData<Event>(res)
}

export async function publishEvent(id: string): Promise<Event> {
  const res = await apiFetch(`/events/${encodeURIComponent(id)}/publish`, { method: 'POST' })
  return readApiData<Event>(res)
}

export async function listItems(eventId: string): Promise<ItemWithOptions[]> {
  const res = await apiFetch(`/events/${encodeURIComponent(eventId)}/items`)
  return readApiData<ItemWithOptions[]>(res)
}

export async function createItem(eventId: string, body: CreateItemBody): Promise<Item> {
  const res = await apiFetch(`/events/${encodeURIComponent(eventId)}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readApiData<Item>(res)
}

export async function updateItem(eventId: string, itemId: string, body: UpdateItemBody): Promise<Item> {
  const res = await apiFetch(
    `/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return readApiData<Item>(res)
}

export async function deleteItem(eventId: string, itemId: string): Promise<{ deleted: boolean; id: string }> {
  const res = await apiFetch(
    `/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  )
  return readApiData(res)
}

export async function setItemOptions(eventId: string, itemId: string, options: OptionInput[]): Promise<OptionRow[]> {
  const res = await apiFetch(
    `/events/${encodeURIComponent(eventId)}/items/${encodeURIComponent(itemId)}/options`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options }),
    },
  )
  return readApiData<OptionRow[]>(res)
}

export async function submitResponse(
  eventId: string,
  answers: AnswerPayload[],
): Promise<{ participantId: string; submittedAt: string }> {
  const res = await apiFetch(`/events/${encodeURIComponent(eventId)}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  return readApiData(res)
}

export async function getAnalytics(eventId: string): Promise<Analytics> {
  const res = await apiFetch(`/events/${encodeURIComponent(eventId)}/analytics`)
  return readApiData<Analytics>(res)
}

export async function listParticipants(eventId: string): Promise<Participant[]> {
  const res = await apiFetch(`/events/${encodeURIComponent(eventId)}/participants`)
  return readApiData<Participant[]>(res)
}

export async function updateParticipantStatus(
  eventId: string,
  participantId: string,
  status: ParticipantStatus,
): Promise<Participant> {
  const res = await apiFetch(
    `/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(participantId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  )
  return readApiData<Participant>(res)
}

export async function searchDeezerArtists(query: string): Promise<unknown[]> {
  const res = await apiFetch(`/proxy/deezer/search/artist?q=${encodeURIComponent(query)}`)
  return readApiData<unknown[]>(res)
}

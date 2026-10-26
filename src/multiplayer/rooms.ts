export interface RoomPlayer {
  id: string;
  name: string;
  joinedAt: number;
}

export interface RoomInfo {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  nextEvent: number;
  started: boolean;
}

export interface RoomSession extends RoomInfo {
  playerId: string;
  isHost: boolean;
}

const API_BASE = (import.meta.env.VITE_AI_API_URL ?? "").replace(/\/$/, "");
const endpoint = (path: string) => `${API_BASE}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Room request failed (${response.status})`);
  return data as T;
}

export function createRoom(name: string) {
  return request<RoomSession>("/api/rooms", { method: "POST", body: JSON.stringify({ name }) });
}

export function joinRoom(code: string, name: string) {
  return request<RoomSession>(`/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ name }) });
}

export function refreshRoom(code: string) {
  return request<RoomInfo>(`/api/rooms/${code}/events?since=0`);
}

export function startRoom(session: RoomSession) {
  return request<RoomInfo>(`/api/rooms/${session.code}/events`, {
    method: "POST",
    body: JSON.stringify({ type: "start", playerId: session.playerId }),
  });
}

export function publishRoomState(session: RoomSession, state: unknown) {
  return request<{ ok: true }>(`/api/rooms/${session.code}/state`, {
    method: "POST",
    body: JSON.stringify({ playerId: session.playerId, state }),
  });
}

export function getRoomState(code: string, since = 0) {
  return request<RoomInfo & { state: import("../types").GameState | null; events: Array<{ seq: number; type: string; payload?: unknown; playerId?: string }> }>(`/api/rooms/${code}/state?since=${since}`);
}

export function sendRoomAction(session: RoomSession, action: import("../types").Action) {
  return request<RoomInfo>(`/api/rooms/${session.code}/events`, {
    method: "POST",
    body: JSON.stringify({ type: "action", playerId: session.playerId, payload: action }),
  });
}

export interface ChatMessage {
  seq: number;
  playerId: string;
  name: string;
  text: string;
  scope: "room" | "team";
  sentAt: number;
}

export function getRoomChat(code: string, since = 0) {
  return request<{ messages: ChatMessage[] }>(`/api/rooms/${code}/chat?since=${since}`);
}

export function sendRoomChat(session: RoomSession, text: string, scope: "room" | "team" = "room") {
  return request<ChatMessage>(`/api/rooms/${session.code}/chat`, {
    method: "POST",
    body: JSON.stringify({ playerId: session.playerId, text, scope }),
  });
}

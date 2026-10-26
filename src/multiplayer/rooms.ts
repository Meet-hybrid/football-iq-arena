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

export function getRoomState(code: string) {
  return request<RoomInfo & { state: unknown }>(`/api/rooms/${code}/state`);
}

export type ApiConfig = {
  baseUrl: string;
};

let config: ApiConfig = { baseUrl: '/api' };

export function configureApi(c: ApiConfig): void {
  config = c;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = res.statusText;
    }
    throw new Error(`POST ${path} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${config.baseUrl}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export type CreateRoomResponse = {
  roomId: string;
  code: string;
  playerId: string;
  token: string;
};

export type JoinRoomResponse = {
  roomId: string;
  playerId: string;
  token: string;
};

export function createRoom(variant: 'classic' | 'extended'): Promise<CreateRoomResponse> {
  return postJson<CreateRoomResponse>('/rooms', { variant });
}

export function joinRoom(code: string, displayName: string): Promise<JoinRoomResponse> {
  return postJson<JoinRoomResponse>(`/rooms/${code}/join`, { displayName });
}

export type GetRoomResponse = {
  roomId: string;
  code: string;
  variant: 'classic' | 'extended';
  status: 'lobby' | 'playing' | 'ended';
  players: Array<{ id: string; name: string; team: 'A' | 'B'; seatIndex: number }>;
};

export function getRoom(code: string): Promise<GetRoomResponse> {
  return getJson<GetRoomResponse>(`/rooms/${code}`);
}

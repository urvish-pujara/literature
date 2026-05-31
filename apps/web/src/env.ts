// Build-time configuration read from Vite env.
//
// VITE_API_BASE — REST root, e.g. "https://literature-server.onrender.com".
//   Defaults to "/api" so the Vite dev proxy keeps working without env vars.
//
// VITE_SOCKET_URL — Socket.IO origin (no trailing path), e.g. same host as API.
//   Defaults to "/" — same-origin via the Vite dev proxy.
//
// The web app calls these on boot; if you change them you must rebuild.

function read(key: string, fallback: string): string {
  const env = import.meta.env as Record<string, unknown>;
  const value = env[key];
  return typeof value === 'string' && value !== '' ? value : fallback;
}

export const API_BASE: string = read('VITE_API_BASE', '/api');
export const SOCKET_URL: string = read('VITE_SOCKET_URL', '/');

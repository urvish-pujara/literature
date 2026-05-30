import type { RoomStore } from './store.js';

const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 20;

export function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export async function generateUniqueCode(store: RoomStore): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode();
    const existing = await store.getByCode(code);
    if (!existing) return code;
  }
  throw new Error('code-gen: exceeded max attempts');
}

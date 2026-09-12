export const READ_KEY = 'curio:read:v1';
export const RECENT_KEY = 'curio:recent:v1';
export const RECENT_MS = 30 * 60 * 1000;
export function readMap(storage, key) {
  try { const map = JSON.parse(storage.getItem(key) || '{}'); return map && typeof map === 'object' && !Array.isArray(map) ? Object.fromEntries(Object.entries(map).filter(([,v]) => Number.isFinite(v))) : {}; } catch { return {}; }
}
export function unread(cards, read) { return cards.filter(c => !read[c.id]); }
export function randomBatch(cards, excluded, size = 5, rng = Math.random) {
  const pool = cards.filter(c => !excluded.has(c.id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, size);
}
export function shouldDismiss(dx, velocity, width) { return Math.abs(dx) > Math.min(width * .26, 110) || (Math.abs(dx) > 28 && Math.abs(velocity) > .65); }
export function recentIds(recent, now = Date.now()) { return new Set(Object.keys(recent).filter(id => now - recent[id] < RECENT_MS)); }

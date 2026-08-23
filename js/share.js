// Export/import games as a URL: https://host/app/#import=<base64url(deflate(json))>
import { DB_VERSION } from './storage.js';

const PREFIX = '#import=';

async function pipe(bytes, Stream, mode) {
  const stream = new Blob([bytes]).stream().pipeThrough(new Stream(mode));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** Build a shareable URL containing the given games. */
export async function buildExportUrl(games) {
  const json = JSON.stringify({ version: DB_VERSION, games });
  const packed = await pipe(new TextEncoder().encode(json), CompressionStream, 'deflate-raw');
  const base = location.href.split('#')[0];
  return base + PREFIX + toBase64Url(packed);
}

/** Returns the games encoded in the current URL hash, or null if none. */
export async function parseImportHash(hash = location.hash) {
  if (!hash.startsWith(PREFIX)) return null;
  const raw = await pipe(fromBase64Url(hash.slice(PREFIX.length)), DecompressionStream, 'deflate-raw');
  const payload = JSON.parse(new TextDecoder().decode(raw));
  if (!Array.isArray(payload.games)) throw new Error('Invalid payload');
  return payload.games.filter(isValidGame);
}

// Trust boundary: the URL comes from outside, validate shape before merging into storage.
function isValidGame(g) {
  return g && typeof g.id === 'string'
    && Array.isArray(g.players) && g.players.length >= 2 && g.players.length <= 6
    && g.players.every((p) => typeof p === 'string')
    && Array.isArray(g.rounds) && g.rounds.every((r) => Array.isArray(r) && r.length === g.players.length && r.every(Number.isFinite))
    && typeof g.createdAt === 'string' && typeof g.updatedAt === 'string';
}

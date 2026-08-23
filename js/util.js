/** Escape text for safe insertion into innerHTML. */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Sum of scores per player for a game. */
export function totals(game) {
  return game.players.map((_, i) => game.rounds.reduce((sum, r) => sum + (r[i] || 0), 0));
}

/**
 * Standard Rummikub scoring: each player enters the value of tiles left in hand.
 * Losers score negative; the winner (0 tiles) scores the sum of everyone else's tiles.
 * If no one has 0 (e.g. a blocked game) everyone just scores negative.
 */
export function scoreRound(tilesLeft) {
  const winners = tilesLeft.map((t, i) => (t === 0 ? i : -1)).filter((i) => i >= 0);
  const sum = tilesLeft.reduce((a, b) => a + b, 0);
  return tilesLeft.map((t, i) => (winners.length === 1 && winners[0] === i ? sum : -t));
}

/** Copy text to clipboard or open native share sheet. Returns a status message. */
export async function shareText(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return 'Shared.'; } catch { /* user cancelled */ }
  }
  await navigator.clipboard.writeText(text);
  return 'Link copied to clipboard.';
}

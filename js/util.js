/** Escape text for safe insertion into innerHTML. */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

/** Copy text to clipboard and show a toast. */
export async function copyWithToast(text, message) {
  await navigator.clipboard.writeText(text);
  toast(message);
}

let toastTimer;
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

/** Button group acting as a radio. `onPick(value)` is called and the active class updated. */
export function choiceGroup(options, value, name) {
  return `<div class="choice" data-name="${name}">${options.map(([v, label]) =>
    `<button type="button" data-value="${esc(v)}" class="${v === value ? 'active' : ''}">${esc(label)}</button>`).join('')}</div>`;
}
export function bindChoice(container, name, onPick) {
  const group = container.querySelector(`.choice[data-name="${name}"]`);
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    group.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    onPick(btn.dataset.value);
  });
}

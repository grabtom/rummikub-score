import { getGame, updateGame } from '../storage.js';
import { buildExportUrl } from '../share.js';
import { esc, formatDate, totals, scoreRound, shareText } from '../util.js';

function cell(n) {
  return `<td class="${n < 0 ? 'neg' : n > 0 ? 'pos' : ''}">${n > 0 ? '+' : ''}${n}</td>`;
}

function roundForm(game) {
  return `
    <form id="round-form" class="round-form stack">
      <div class="muted">Enter the value of tiles left in each hand. The player with 0 wins the round and scores the sum.</div>
      <div class="grid">
        ${game.players.map((p, i) => `<label>${esc(p)}<input type="number" name="p${i}" min="0" max="300" inputmode="numeric" value="0" required></label>`).join('')}
      </div>
      <div class="row">
        <button class="btn primary" type="submit">Add round</button>
        <button class="btn" type="button" id="round-cancel">Cancel</button>
      </div>
    </form>`;
}

export function render(root, { id }) {
  const game = getGame(id);
  if (!game) { root.innerHTML = '<p class="error">Game not found.</p><a href="#/">Back</a>'; return; }

  const t = totals(game);
  const max = Math.max(...t);

  root.innerHTML = `
    <div class="stack">
      <div class="row between">
        <a href="#/">← Games</a>
        <span class="muted">started ${formatDate(game.createdAt)}</span>
      </div>
      <table class="board">
        <thead><tr><th>#</th>${game.players.map((p) => `<th title="${esc(p)}">${esc(p)}</th>`).join('')}</tr></thead>
        <tbody>
          ${game.rounds.map((r, i) => `<tr data-round="${i}" title="Tap to delete"><td>${i + 1}</td>${r.map(cell).join('')}</tr>`).join('')}
        </tbody>
        <tfoot><tr><td>Σ</td>${t.map((n) => `<td class="${n === max && game.rounds.length ? 'leader' : ''}">${n}</td>`).join('')}</tr></tfoot>
      </table>
      <div id="round-slot"></div>
      <div class="row">
        <button class="btn primary" id="add-round">Add round</button>
        <button class="btn" id="export">Export game</button>
      </div>
      <p class="muted" id="status"></p>
    </div>`;

  const slot = root.querySelector('#round-slot');
  const addBtn = root.querySelector('#add-round');

  addBtn.addEventListener('click', () => {
    slot.innerHTML = roundForm(game);
    addBtn.hidden = true;
    const form = slot.querySelector('#round-form');
    const inputs = [...form.querySelectorAll('input')];
    inputs[0].focus();
    inputs[0].select();

    const highlight = () => inputs.forEach((i) => i.classList.toggle('winner', Number(i.value) === 0));
    form.addEventListener('input', highlight);
    highlight();

    form.querySelector('#round-cancel').addEventListener('click', () => render(root, { id }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const tiles = inputs.map((i) => Number(i.value));
      updateGame(id, (g) => g.rounds.push(scoreRound(tiles)));
      render(root, { id });
    });
  });

  root.querySelectorAll('tbody tr').forEach((tr) => {
    tr.addEventListener('click', () => {
      const n = Number(tr.dataset.round);
      if (!confirm(`Delete round ${n + 1}?`)) return;
      updateGame(id, (g) => g.rounds.splice(n, 1));
      render(root, { id });
    });
  });

  root.querySelector('#export').addEventListener('click', async () => {
    const url = await buildExportUrl([game]);
    root.querySelector('#status').textContent = await shareText('Rummikub game', url);
  });
}

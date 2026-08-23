import { listGames, deleteGame, updateGame } from '../storage.js';
import { buildExportUrl } from '../share.js';
import { esc, formatDate, totals, shareText } from '../util.js';

function gameItem(g) {
  const t = totals(g);
  const max = Math.max(...t);
  const standings = g.players.map((p, i) => `${esc(p)} ${t[i]}${t[i] === max && g.rounds.length ? ' ★' : ''}`).join(' · ');
  return `
    <li data-id="${g.id}">
      <a class="title" href="#/game/${g.id}">${esc(g.players.join(', '))}</a>
      <div class="meta">${g.rounds.length} rounds · started ${formatDate(g.createdAt)} · edited ${formatDate(g.updatedAt)}</div>
      <div class="muted">${standings}</div>
      <div class="row" style="margin-top:8px">
        <button class="btn small" data-action="archive">${g.archived ? 'Unarchive' : 'Archive'}</button>
        <button class="btn small" data-action="export">Export</button>
        <button class="btn small" data-action="delete">Delete</button>
      </div>
    </li>`;
}

export function render(root) {
  const games = listGames();
  const active = games.filter((g) => !g.archived);
  const archived = games.filter((g) => g.archived);

  root.innerHTML = `
    <div class="stack">
      <a class="btn primary block" href="#/new" style="display:block;text-align:center;text-decoration:none">New game</a>
      <h2>Games in progress</h2>
      ${active.length ? `<ul class="list">${active.map(gameItem).join('')}</ul>` : '<p class="muted">No games yet.</p>'}
      ${archived.length ? `<h2>Archived</h2><ul class="list archived">${archived.map(gameItem).join('')}</ul>` : ''}
      ${games.length ? '<button class="btn block" id="export-all">Export all games</button>' : ''}
      <p class="muted" id="status"></p>
    </div>`;

  const status = root.querySelector('#status');

  root.querySelectorAll('li[data-id] button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('li').dataset.id;
      const action = btn.dataset.action;
      if (action === 'delete') {
        if (!confirm('Delete this game? This cannot be undone.')) return;
        deleteGame(id);
      } else if (action === 'archive') {
        updateGame(id, (g) => { g.archived = !g.archived; });
      } else if (action === 'export') {
        const url = await buildExportUrl([games.find((g) => g.id === id)]);
        status.textContent = await shareText('Rummikub game', url);
        return;
      }
      render(root);
    });
  });

  root.querySelector('#export-all')?.addEventListener('click', async () => {
    const url = await buildExportUrl(games);
    status.textContent = await shareText('Rummikub games', url);
  });
}

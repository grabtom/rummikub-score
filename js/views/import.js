import { getGame, mergeGames } from '../storage.js';
import { parseImportHash } from '../share.js';
import { esc, formatDate } from '../util.js';

function statusOf(g) {
  const local = getGame(g.id);
  if (!local) return 'new';
  if (local.updatedAt === g.updatedAt) return 'already saved';
  return local.updatedAt < g.updatedAt ? 'newer than your copy' : 'older than your copy';
}

export async function render(root) {
  let games;
  try {
    games = await parseImportHash();
  } catch {
    root.innerHTML = '<p class="error">This import link is invalid or damaged.</p><a href="#/">Go to games</a>';
    return;
  }

  root.innerHTML = `
    <form id="import-form" class="stack">
      <h1>Import ${games.length} game${games.length === 1 ? '' : 's'}</h1>
      <p class="muted">Select the games to merge into this device. Games you already have are updated only if the imported copy is newer.</p>
      <div>
        ${games.map((g, i) => {
          const status = statusOf(g);
          return `<label class="import-item">
            <input type="checkbox" name="g" value="${i}" ${status === 'already saved' || status === 'older than your copy' ? '' : 'checked'}>
            <span><strong>${esc(g.players.join(', '))}</strong><br>
            <span class="muted">${g.rounds.length} rounds · edited ${formatDate(g.updatedAt)} · ${status}</span></span>
          </label>`;
        }).join('')}
      </div>
      <button class="btn primary block" type="submit">Import selected</button>
      <a class="btn link" href="#/">Skip</a>
    </form>`;

  root.querySelector('#import-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const picked = [...root.querySelectorAll('input[name=g]:checked')].map((i) => games[Number(i.value)]);
    mergeGames(picked);
    location.hash = '#/';
  });
}

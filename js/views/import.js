import { getGame, mergeGames } from '../storage.js';
import { parseImportHash } from '../share.js';
import { esc } from '../util.js';
import { t, formatDate } from '../i18n.js';

function statusOf(g) {
  const local = getGame(g.id);
  if (!local) return 'statusNew';
  if (local.updatedAt === g.updatedAt) return 'statusSame';
  return local.updatedAt < g.updatedAt ? 'statusNewer' : 'statusOlder';
}

export async function render(root) {
  let games;
  try {
    games = await parseImportHash();
  } catch {
    root.innerHTML = `<p class="error">${t('importInvalid')}</p><a href="#/">${t('goToGames')}</a>`;
    return;
  }

  root.innerHTML = `
    <form id="import-form" class="stack">
      <h1>${t('importTitle', { n: games.length })}</h1>
      <p class="muted">${t('importHint')}</p>
      <div>
        ${games.map((g, i) => {
          const status = statusOf(g);
          const checked = status === 'statusNew' || status === 'statusNewer';
          return `<label class="import-item">
            <input type="checkbox" name="g" value="${i}" ${checked ? 'checked' : ''}>
            <span><strong>${esc(g.players.join(', '))}</strong><br>
            <span class="muted">${t('rounds', { n: g.rounds.length })} · ${t('edited', { date: formatDate(g.updatedAt) })} · ${t(status)}</span></span>
          </label>`;
        }).join('')}
      </div>
      <button class="btn primary block" type="submit">${t('importSelected')}</button>
      <a class="btn link" href="#/">${t('skip')}</a>
    </form>`;

  root.querySelector('#import-form').addEventListener('submit', (e) => {
    e.preventDefault();
    mergeGames([...root.querySelectorAll('input[name=g]:checked')].map((i) => games[Number(i.value)]));
    location.hash = '#/';
  });
}

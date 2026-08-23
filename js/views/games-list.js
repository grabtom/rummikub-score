import { listGames, deleteGame, updateGame } from '../storage.js';
import { buildExportUrl } from '../share.js';
import { esc, totals, copyWithToast } from '../util.js';
import { t, formatDate } from '../i18n.js';
import { enableSwipe } from '../swipe.js';
import { openNewGameDialog } from './new-game.js';

const ICONS = {
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/></svg>',
  unarchive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h18v4H3zM5 8v12h14V8M12 18v-6M9 15l3-3 3 3"/></svg>',
  export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 8l5-5 5 5M4 14v6h16v-6"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

let showArchived = false;

function gameItem(g) {
  const tot = totals(g);
  const max = Math.max(...tot);
  const standings = g.players.map((p, i) => `${esc(p)} ${tot[i]}${tot[i] === max && g.rounds.length ? ' ★' : ''}`).join(' · ');
  const arch = g.archived ? 'unarchive' : 'archive';
  return `
    <li class="swipe" data-id="${g.id}">
      <div class="swipe-actions">
        <button class="act-archive" data-action="archive">${ICONS[arch]}${t(arch)}</button>
        <button class="act-export" data-action="export">${ICONS.export}${t('export')}</button>
        <button class="act-delete" data-action="delete">${ICONS.delete}${t('delete')}</button>
      </div>
      <div class="swipe-content">
        <a class="title" href="#/game/${g.id}">
          <span>${esc(g.players.join(', '))}</span>
          <span class="badge" title="${t('rounds', { n: g.rounds.length })}">${g.rounds.length}</span>
        </a>
        <div class="meta">${t('started', { date: formatDate(g.createdAt) })}</div>
        <div class="meta">${t('edited', { date: formatDate(g.updatedAt) })}</div>
        <div class="muted">${standings}</div>
      </div>
    </li>`;
}

export function render(root) {
  const games = listGames();
  const active = games.filter((g) => !g.archived);
  const archived = games.filter((g) => g.archived);

  root.innerHTML = `
    <div class="stack">
      <button class="btn primary block" id="new-game">${t('newGame')}</button>
      <h2>${t('gamesInProgress')}</h2>
      ${active.length ? `<ul class="list">${active.map(gameItem).join('')}</ul>` : `<p class="muted">${t('noGames')}</p>`}
      ${archived.length ? `<button class="btn block" id="toggle-archived">${showArchived ? t('hideArchived') : `${t('archivedGames')} (${archived.length})`}</button>` : ''}
      ${archived.length && showArchived ? `<ul class="list archived">${archived.map(gameItem).join('')}</ul>` : ''}
      ${games.length ? `<button class="btn block" id="export-all">${t('exportAll')}</button>` : ''}
    </div>`;

  root.querySelector('#new-game').addEventListener('click', openNewGameDialog);
  root.querySelector('#toggle-archived')?.addEventListener('click', () => { showArchived = !showArchived; render(root); });

  root.querySelectorAll('li[data-id] button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('li').dataset.id;
      const action = btn.dataset.action;
      if (action === 'delete') {
        if (!confirm(t('confirmDelete'))) return;
        deleteGame(id);
      } else if (action === 'archive') {
        updateGame(id, (g) => { g.archived = !g.archived; });
      } else if (action === 'export') {
        const url = await buildExportUrl([games.find((g) => g.id === id)]);
        copyWithToast(url, t('copied'));
        return;
      }
      render(root);
    });
  });
  enableSwipe(root);

  root.querySelector('#export-all')?.addEventListener('click', async () => {
    const url = await buildExportUrl(games);
    copyWithToast(url, t('copied'));
  });
}

import { getGame, updateGame } from '../storage.js';
import { buildExportUrl } from '../share.js';
import { esc, totals, scoreRound, copyWithToast } from '../util.js';
import { t, formatDate } from '../i18n.js';
import { closeOnBackdrop } from '../settings-ui.js';

function cell(n) {
  return `<td class="${n < 0 ? 'neg' : n > 0 ? 'pos' : ''}">${n > 0 ? '+' : ''}${n}</td>`;
}

/**
 * Round dialog. `index` null = add; otherwise edit that round.
 * Inputs hold "tiles left" values, so for edit we reverse the stored scores (negatives → tiles, winner → 0).
 */
function openRoundDialog(game, index, onDone) {
  const dialog = document.getElementById('round-dialog');
  const editing = index !== null;
  const tiles = editing ? game.rounds[index].map((n) => (n > 0 ? 0 : -n)) : game.players.map(() => 0);

  dialog.innerHTML = `
    <button class="dialog-close" data-close aria-label="${t('close')}">×</button>
    <h1>${editing ? t('editRound', { n: index + 1 }) : t('addRound')}</h1>
    <form id="round-form" class="stack">
      <div class="muted">${t('roundHint')}</div>
      <div class="grid">
        ${game.players.map((p, i) => `<label>${esc(p)}<input type="number" min="0" max="300" inputmode="numeric" value="${tiles[i]}" required></label>`).join('')}
      </div>
      <button class="btn primary block" type="submit">${editing ? t('save') : t('addRound')}</button>
      ${editing ? `<button class="btn block" type="button" id="round-delete">${t('deleteRound')}</button>` : ''}
    </form>`;

  const form = dialog.querySelector('#round-form');
  const inputs = [...form.querySelectorAll('input')];
  const highlight = () => inputs.forEach((i) => i.classList.toggle('winner', Number(i.value) === 0));
  form.addEventListener('input', highlight);
  highlight();

  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  if (!dialog.dataset.bound) { closeOnBackdrop(dialog); dialog.dataset.bound = '1'; }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const scores = scoreRound(inputs.map((i) => Number(i.value)));
    updateGame(game.id, (g) => { if (editing) g.rounds[index] = scores; else g.rounds.push(scores); });
    dialog.close();
    onDone();
  });
  dialog.querySelector('#round-delete')?.addEventListener('click', () => {
    if (!confirm(t('confirmDeleteRound', { n: index + 1 }))) return;
    updateGame(game.id, (g) => g.rounds.splice(index, 1));
    dialog.close();
    onDone();
  });

  dialog.showModal();
  inputs[0].focus();
  inputs[0].select();
}

export function render(root, { id }) {
  const game = getGame(id);
  if (!game) { root.innerHTML = `<p class="error">${t('gameNotFound')}</p><a href="#/">${t('back')}</a>`; return; }

  const tot = totals(game);
  const max = Math.max(...tot);

  root.innerHTML = `
    <div class="stack">
      <div class="row between">
        <a href="#/">← ${t('back')}</a>
        <span class="muted">${t('started', { date: formatDate(game.createdAt) })}</span>
      </div>
      <table class="board">
        <thead><tr><th>#</th>${game.players.map((p) => `<th title="${esc(p)}">${esc(p)}</th>`).join('')}</tr></thead>
        <tbody>
          ${game.rounds.map((r, i) => `<tr data-round="${i}"><td>${i + 1}</td>${r.map(cell).join('')}</tr>`).join('')}
        </tbody>
        <tfoot><tr><td>Σ</td>${tot.map((n) => `<td class="${n === max && game.rounds.length ? 'leader' : ''}">${n}</td>`).join('')}</tr></tfoot>
      </table>
      <div class="row center"><button class="btn primary" id="add-round">${t('addRound')}</button></div>
    </div>
    <button class="fab left" id="export" aria-label="${t('exportGame')}" title="${t('exportGame')}">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M4 14v6h16v-6"/></svg>
    </button>`;

  const rerender = () => render(root, { id });
  root.querySelector('#add-round').addEventListener('click', () => openRoundDialog(game, null, rerender));
  root.querySelectorAll('tbody tr').forEach((tr) => {
    tr.addEventListener('click', () => openRoundDialog(game, Number(tr.dataset.round), rerender));
  });
  root.querySelector('#export').addEventListener('click', async () => {
    copyWithToast(await buildExportUrl([game]), t('copied'));
  });
}

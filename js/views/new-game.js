// "New game" modal: pick player count, name players, start.
import { createGame } from '../storage.js';
import { t } from '../i18n.js';
import { closeOnBackdrop } from '../settings-ui.js';

export function openNewGameDialog() {
  const dialog = document.getElementById('new-game-dialog');
  dialog.innerHTML = `
    <button class="dialog-close" data-close aria-label="${t('close')}">×</button>
    <h1>${t('newGame')}</h1>
    <form id="new-game" class="stack">
      <label>${t('players')}
        <select name="count">${[2, 3, 4, 5, 6].map((n) => `<option ${n === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </label>
      <div id="names" class="stack"></div>
      <button class="btn primary block" type="submit">${t('start')}</button>
    </form>`;

  const form = dialog.querySelector('#new-game');
  const names = dialog.querySelector('#names');

  function renderNames() {
    const count = Number(form.count.value);
    const existing = [...names.querySelectorAll('input')].map((i) => i.value);
    names.innerHTML = Array.from({ length: count }, (_, i) =>
      `<label>${t('player', { n: i + 1 })}<input type="text" name="name" required maxlength="20" value="${existing[i] || ''}" placeholder="${t('name')}" autocomplete="off"></label>`,
    ).join('');
  }

  form.count.addEventListener('change', renderNames);
  renderNames();
  names.querySelector('input').autofocus = true;
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  if (!dialog.dataset.bound) { closeOnBackdrop(dialog); dialog.dataset.bound = '1'; }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const players = [...names.querySelectorAll('input')].map((i) => i.value.trim() || i.placeholder);
    const game = createGame(players);
    dialog.close();
    location.hash = `#/game/${game.id}`;
  });
  dialog.showModal();
}

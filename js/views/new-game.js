// "New game" modal: pick player count, name players, start.
import { createGame } from '../storage.js';
import { t } from '../i18n.js';
import { closeOnBackdrop } from '../settings-ui.js';
import { choiceGroup, bindChoice } from '../util.js';

export function openNewGameDialog() {
  const dialog = document.getElementById('new-game-dialog');
  dialog.innerHTML = `
    <button class="dialog-close" data-close aria-label="${t('close')}">×</button>
    <h1>${t('newGame')}</h1>
    <form id="new-game" class="stack">
      <label>${t('players')}</label>
      ${choiceGroup([2, 3, 4, 5, 6].map((n) => [String(n), String(n)]), '4', 'count')}
      <div id="names" class="stack"></div>
      <button class="btn primary block" type="submit">${t('start')}</button>
    </form>`;

  const form = dialog.querySelector('#new-game');
  const names = dialog.querySelector('#names');
  let count = 4;

  function renderNames() {
    const existing = [...names.querySelectorAll('input')].map((i) => i.value);
    names.innerHTML = Array.from({ length: count }, (_, i) =>
      `<label>${t('player', { n: i + 1 })}<input type="text" name="name" required maxlength="20" value="${existing[i] || ''}" placeholder="${t('name')}" autocomplete="off"></label>`,
    ).join('');
  }

  bindChoice(form, 'count', (v) => { count = Number(v); renderNames(); });
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

import { createGame } from '../storage.js';

export function render(root) {
  root.innerHTML = `
    <form id="new-game" class="stack">
      <h1>New game</h1>
      <label>Players
        <select name="count">${[2, 3, 4, 5, 6].map((n) => `<option ${n === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </label>
      <div id="names" class="stack"></div>
      <button class="btn primary block" type="submit">Start</button>
      <a class="btn link" href="#/">Cancel</a>
    </form>`;

  const form = root.querySelector('#new-game');
  const names = root.querySelector('#names');

  function renderNames() {
    const count = Number(form.count.value);
    const existing = [...names.querySelectorAll('input')].map((i) => i.value);
    names.innerHTML = Array.from({ length: count }, (_, i) =>
      `<label>Player ${i + 1}<input type="text" name="name" required maxlength="20" value="${existing[i] || ''}" placeholder="Name" autocomplete="off"></label>`,
    ).join('');
  }

  form.count.addEventListener('change', renderNames);
  renderNames();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const players = [...names.querySelectorAll('input')].map((i) => i.value.trim() || i.placeholder);
    const game = createGame(players);
    location.hash = `#/game/${game.id}`;
  });
}

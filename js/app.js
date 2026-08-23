// Hash router + bootstrap. Routes: #/  #/new  #/game/:id  #import=<payload>
import * as gamesList from './views/games-list.js';
import * as newGame from './views/new-game.js';
import * as scoreboard from './views/scoreboard.js';
import * as importView from './views/import.js';
import { mountTimerUi } from './timer-ui.js';

const root = document.getElementById('app');

function route() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#import=')) return importView.render(root);
  if (hash === '#/new') return newGame.render(root);
  const game = hash.match(/^#\/game\/([^/]+)$/);
  if (game) return scoreboard.render(root, { id: game[1] });
  return gamesList.render(root);
}

window.addEventListener('hashchange', route);
route();
mountTimerUi();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}

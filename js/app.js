// Hash router + bootstrap. Routes: #/  #/game/:id  #import=<payload>
import * as gamesList from './views/games-list.js';
import * as scoreboard from './views/scoreboard.js';
import * as importView from './views/import.js';
import { mountTimerUi } from './timer-ui.js';
import { mountSettingsUi, applyTheme } from './settings-ui.js';
import { t, currentLang } from './i18n.js';

const root = document.getElementById('app');

function route() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#import=')) return importView.render(root);
  const game = hash.match(/^#\/game\/([^/]+)$/);
  if (game) return scoreboard.render(root, { id: game[1] });
  return gamesList.render(root);
}

function applyLang() {
  document.documentElement.lang = currentLang();
  document.getElementById('brand').textContent = t('appName');
  document.getElementById('settings-btn').setAttribute('aria-label', t('settings'));
  document.getElementById('timer-fab').setAttribute('aria-label', t('timer'));
}

applyTheme();
applyLang();
const renderTimer = mountTimerUi();
mountSettingsUi(() => { applyLang(); renderTimer(); route(); });
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}

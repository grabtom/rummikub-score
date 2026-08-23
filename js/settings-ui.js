// Header gear → settings dialog (language, theme). Theme applied via <html data-theme>.
import { getSettings, setSettings } from './storage.js';
import { t, LANGUAGES } from './i18n.js';
import { choiceGroup, bindChoice } from './util.js';

export const THEMES = ['auto', 'light', 'dark', 'paper', 'ocean', 'forest', 'midnight'];

export function applyTheme() {
  document.documentElement.dataset.theme = getSettings().theme || 'auto';
}

export function mountSettingsUi(onChange) {
  const dialog = document.getElementById('settings-dialog');
  const gear = document.getElementById('settings-btn');

  function render() {
    const s = getSettings();
    dialog.innerHTML = `
      <button class="dialog-close" data-close aria-label="${t('close')}">×</button>
      <h1>${t('settings')}</h1>
      <div class="stack" style="text-align:left">
        <label>${t('language')}</label>
        ${choiceGroup([['', t('langAuto')], ...LANGUAGES.map((l) => [l, l.toUpperCase()])], s.lang || '', 'lang')}
        <label>${t('theme')}</label>
        ${choiceGroup(THEMES.map((th) => [th, t('theme' + th[0].toUpperCase() + th.slice(1))]), s.theme || 'auto', 'theme')}
      </div>`;
    bindChoice(dialog, 'lang', (v) => { setSettings({ lang: v }); render(); onChange(); });
    bindChoice(dialog, 'theme', (v) => { setSettings({ theme: v }); applyTheme(); });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  }

  gear.addEventListener('click', () => { render(); dialog.showModal(); });
  closeOnBackdrop(dialog);
}

/** Close a <dialog> when the backdrop (outside the box) is clicked. */
export function closeOnBackdrop(dialog) {
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}

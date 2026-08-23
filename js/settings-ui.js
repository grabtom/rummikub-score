// Header gear → settings dialog (language, theme). Theme applied via <html data-theme>.
import { getSettings, setSettings } from './storage.js';
import { t, LANGUAGES } from './i18n.js';

export const THEMES = ['auto', 'light', 'dark', 'paper', 'ocean', 'forest', 'midnight'];

export function applyTheme() {
  document.documentElement.dataset.theme = getSettings().theme || 'auto';
}

export function mountSettingsUi(onChange) {
  const dialog = document.getElementById('settings-dialog');
  const gear = document.getElementById('settings-btn');

  function render() {
    const s = getSettings();
    const opt = (v, label, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;
    dialog.innerHTML = `
      <button class="dialog-close" data-close aria-label="${t('close')}">×</button>
      <h1>${t('settings')}</h1>
      <div class="stack" style="text-align:left">
        <label>${t('language')}
          <select name="lang">${opt('', t('langAuto'), s.lang || '')}${LANGUAGES.map((l) => opt(l, l.toUpperCase(), s.lang)).join('')}</select>
        </label>
        <label>${t('theme')}
          <select name="theme">${THEMES.map((th) => opt(th, t('theme' + th[0].toUpperCase() + th.slice(1)), s.theme || 'auto')).join('')}</select>
        </label>
      </div>`;
    dialog.querySelector('[name=lang]').addEventListener('change', (e) => { setSettings({ lang: e.target.value }); render(); onChange(); });
    dialog.querySelector('[name=theme]').addEventListener('change', (e) => { setSettings({ theme: e.target.value }); applyTheme(); });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  }

  gear.addEventListener('click', () => { render(); dialog.showModal(); });
  closeOnBackdrop(dialog);
}

/** Close a <dialog> when the backdrop (outside the box) is clicked. */
export function closeOnBackdrop(dialog) {
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}

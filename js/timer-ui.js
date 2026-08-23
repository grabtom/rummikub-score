// Floating timer button + dialog. Mounted once; works on every view.
import { createTimer } from './timer.js';
import { getSettings, setSettings } from './storage.js';
import { t } from './i18n.js';
import { closeOnBackdrop } from './settings-ui.js';

export function mountTimerUi() {
  const $ = (id) => document.getElementById(id);
  const fab = $('timer-fab'), dialog = $('timer-dialog'), display = $('timer-display');
  const startBtn = $('timer-start'), resetBtn = $('timer-reset'), range = $('timer-duration'), rangeOut = $('timer-duration-out');

  const timer = createTimer({ onTick: render, onFinish: render });

  function render(remaining = timer.remaining) {
    const sec = Math.ceil(remaining);
    const level = !timer.running ? '' : sec <= 3 ? 'critical' : sec <= 15 ? 'warning' : '';
    display.textContent = sec;
    display.className = `timer-display ${level}`;
    fab.textContent = timer.running ? String(sec) : '⏱';
    fab.className = `fab ${level}`;
    startBtn.textContent = timer.running ? t('pause') : t('start');
    resetBtn.textContent = t('reset');
    $('timer-duration-label').textContent = t('duration');
    range.disabled = timer.running;
  }

  const { timerSeconds } = getSettings();
  range.value = timerSeconds;
  rangeOut.textContent = timerSeconds;
  timer.setDuration(timerSeconds);

  fab.addEventListener('click', () => { render(); dialog.showModal(); });
  $('timer-close').addEventListener('click', () => dialog.close());
  closeOnBackdrop(dialog);
  startBtn.addEventListener('click', () => {
    if (timer.running) timer.pause();
    else { if (timer.remaining <= 0) timer.reset(); timer.start(); }
    render();
  });
  resetBtn.addEventListener('click', () => timer.reset());
  range.addEventListener('input', () => {
    const sec = Number(range.value);
    rangeOut.textContent = sec;
    timer.setDuration(sec);
    setSettings({ timerSeconds: sec });
  });
  return render;
}

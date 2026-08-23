// Floating timer button + dialog. Mounted once; works on every view.
import { createTimer } from './timer.js';
import { getSettings, setSettings } from './storage.js';

export function mountTimerUi() {
  const fab = document.getElementById('timer-fab');
  const dialog = document.getElementById('timer-dialog');
  const display = document.getElementById('timer-display');
  const startBtn = document.getElementById('timer-start');
  const resetBtn = document.getElementById('timer-reset');
  const closeBtn = document.getElementById('timer-close');
  const range = document.getElementById('timer-duration');
  const rangeOut = document.getElementById('timer-duration-out');

  const timer = createTimer({ onTick: render, onFinish: render });

  function render(remaining = timer.remaining) {
    const sec = Math.ceil(remaining);
    const level = !timer.running ? '' : sec <= 3 ? 'critical' : sec <= 15 ? 'warning' : '';
    display.textContent = sec;
    display.className = `timer-display ${level}`;
    fab.textContent = timer.running ? String(sec) : '⏱';
    fab.className = `fab ${level}`;
    startBtn.textContent = timer.running ? 'Pause' : 'Start';
    range.disabled = timer.running;
  }

  const { timerSeconds } = getSettings();
  range.value = timerSeconds;
  rangeOut.textContent = timerSeconds;
  timer.setDuration(timerSeconds);

  fab.addEventListener('click', () => dialog.showModal());
  closeBtn.addEventListener('click', () => dialog.close());
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
}

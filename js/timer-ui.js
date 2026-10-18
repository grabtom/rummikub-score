// Floating timer button + dialog. Mounted once; works on every view.
import { createTimer } from './timer.js';
import { createVoice, voiceSupported } from './voice.js';
import { getSettings, setSettings } from './storage.js';
import { t, currentLang } from './i18n.js';
import { closeOnBackdrop } from './settings-ui.js';
import { toast } from './util.js';

const VOICE_ERRORS = { network: 'voiceNetwork', 'not-allowed': 'voiceDenied' };

export function mountTimerUi() {
  const $ = (id) => document.getElementById(id);
  const fab = $('timer-fab'), dialog = $('timer-dialog'), display = $('timer-display');
  const startBtn = $('timer-start'), resetBtn = $('timer-reset'), nextBtn = $('timer-next'), range = $('timer-duration'), rangeOut = $('timer-duration-out');
  const micBtn = $('timer-mic');
  let flash = null;

  const timer = createTimer({ onTick: render, onFinish: render });
  // Shared by the buttons and voice commands.
  const actions = {
    next() { timer.reset(); timer.start(); },
    reset() { timer.reset(); },
    start() { if (timer.running) return; if (timer.remaining <= 0) timer.reset(); timer.start(); },
    pause() { if (timer.running) timer.pause(); },
  };
  // Not persisted: off after reload. Keeps listening with the dialog closed (hands-free).
  const voice = createVoice({
    onCommand(cmd) {
      actions[cmd]();
      clearTimeout(flash);
      flash = setTimeout(() => { flash = null; render(); }, 300);
      render();
    },
    onChange(listening, error) {
      if (error) toast(VOICE_ERRORS[error] ? t(VOICE_ERRORS[error]) : t('voiceError', { error }));
      render();
    },
  });

  function render(remaining = timer.remaining) {
    const sec = Math.ceil(remaining);
    const level = !timer.running ? '' : sec <= 3 ? 'critical' : sec <= 15 ? 'warning' : '';
    display.textContent = sec;
    const hit = flash ? ' hit' : '';
    display.className = `timer-display ${level}${hit}`;
    fab.textContent = timer.running ? String(sec) : '⏱';
    fab.className = `fab ${level}${hit}${voice.listening ? ' listening' : ''}`;
    startBtn.textContent = timer.running ? t('pause') : t('start');
    resetBtn.textContent = t('reset');
    nextBtn.textContent = t('nextPlayer');
    $('timer-duration-label').textContent = t('duration');
    range.disabled = timer.running;
    micBtn.setAttribute('aria-pressed', voice.listening);
    micBtn.setAttribute('aria-label', t(voice.listening ? 'voiceOn' : 'voiceOff'));
    micBtn.title = micBtn.getAttribute('aria-label');
  }

  const { timerSeconds } = getSettings();
  range.value = timerSeconds;
  rangeOut.textContent = timerSeconds;
  timer.setDuration(timerSeconds);

  fab.addEventListener('click', () => { render(); dialog.showModal(); });
  $('timer-close').addEventListener('click', () => dialog.close());
  closeOnBackdrop(dialog);
  startBtn.addEventListener('click', () => { timer.running ? actions.pause() : actions.start(); render(); });
  resetBtn.addEventListener('click', () => actions.reset());
  // One tap on player change: restart from full duration.
  nextBtn.addEventListener('click', () => { actions.next(); render(); });
  micBtn.hidden = !voiceSupported;
  micBtn.addEventListener('click', () => {
    timer.unlockAudio(); // voice-triggered starts are not user gestures
    if (voice.listening) return voice.stop();
    // Commands are mostly Polish words: recognise in Polish whenever the user knows it, even with an English UI.
    const pl = currentLang() === 'pl' || (navigator.languages || []).some((l) => l.startsWith('pl'));
    voice.start(pl ? 'pl-PL' : 'en-US');
  });
  range.addEventListener('input', () => {
    const sec = Number(range.value);
    rangeOut.textContent = sec;
    timer.setDuration(sec);
    setSettings({ timerSeconds: sec });
  });
  return render;
}

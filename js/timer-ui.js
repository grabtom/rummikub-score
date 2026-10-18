// Floating timer button + dialog. Mounted once; works on every view.
import { createTimer } from './timer.js';
import { createVoice, voiceSupported } from './voice.js';
import { getSettings, setSettings } from './storage.js';
import { t, currentLang } from './i18n.js';
import { closeOnBackdrop } from './settings-ui.js';
import { toast } from './util.js';

export function mountTimerUi() {
  const $ = (id) => document.getElementById(id);
  const fab = $('timer-fab'), dialog = $('timer-dialog'), display = $('timer-display');
  const startBtn = $('timer-start'), resetBtn = $('timer-reset'), nextBtn = $('timer-next'), range = $('timer-duration'), rangeOut = $('timer-duration-out');
  const micBtn = $('timer-mic'), setupEl = $('voice-setup'), progress = $('voice-progress'), dlBtn = $('voice-download'), cancelBtn = $('voice-cancel');
  let flash = null;
  let setup = null; // model download: { lang, bytes } = asking, + { abort, loaded, total } = downloading

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
    onChange(error) {
      if (error) toast(error.name === 'NotAllowedError' ? t('voiceDenied') : t('voiceError', { error: error.message || error }));
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
    renderSetup();
  }

  const mb = (bytes) => Math.round(bytes / 1e6);
  function renderSetup() {
    const step = voice.loading ? 'prepare' : setup?.abort ? 'download' : setup ? 'ask' : '';
    setupEl.hidden = !step;
    if (!step) return;
    $('voice-setup-text').textContent = step === 'ask' ? t('voiceInfo', { mb: mb(setup.bytes) }) : t(step === 'download' ? 'voiceDownloading' : 'voicePreparing');
    progress.hidden = step === 'ask';
    if (step === 'download') { progress.max = setup.total; progress.value = setup.loaded; } else progress.removeAttribute('value'); // no value = indeterminate
    const info = $('voice-progress-text');
    info.hidden = step !== 'download';
    if (step === 'download') info.textContent = `${Math.floor((100 * setup.loaded) / setup.total)}% · ${(setup.loaded / 1e6).toFixed(1)} / ${mb(setup.total)} MB`;
    dlBtn.textContent = t('download');
    dlBtn.hidden = step !== 'ask';
    cancelBtn.textContent = t('cancel');
    cancelBtn.hidden = step === 'prepare';
  }

  const { timerSeconds } = getSettings();
  range.value = timerSeconds;
  rangeOut.textContent = timerSeconds;
  timer.setDuration(timerSeconds);

  fab.addEventListener('click', () => { render(); dialog.showModal(); });
  $('timer-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (setup && !setup.abort) { setup = null; render(); } });
  closeOnBackdrop(dialog);
  startBtn.addEventListener('click', () => { timer.running ? actions.pause() : actions.start(); render(); });
  resetBtn.addEventListener('click', () => actions.reset());
  // One tap on player change: restart from full duration.
  nextBtn.addEventListener('click', () => { actions.next(); render(); });
  micBtn.hidden = !voiceSupported;
  micBtn.addEventListener('click', async () => {
    timer.unlockAudio(); // voice-triggered starts are not user gestures
    if (voice.listening) return voice.stop();
    if (setup) return;
    // Model follows the app language. Nothing is downloaded without confirmation.
    const lang = currentLang(), bytes = await voice.missing(lang).catch((e) => toast(t('voiceError', { error: e.message })) ?? -1);
    if (!bytes) return voice.start(lang);
    if (bytes > 0) { setup = { lang, bytes }; render(); }
  });
  dlBtn.addEventListener('click', async () => {
    const mine = setup = { ...setup, abort: new AbortController(), loaded: 0, total: setup.bytes };
    render();
    try {
      await voice.download(mine.lang, mine.abort.signal, (loaded, total) => { Object.assign(mine, { loaded, total }); render(); });
      if (setup !== mine) return;
      setup = null;
      voice.start(mine.lang);
    } catch (e) {
      if (setup === mine) { setup = null; render(); }
      if (e.name !== 'AbortError') toast(t('voiceDownloadFailed', { error: e.message }));
    }
  });
  cancelBtn.addEventListener('click', () => { setup?.abort?.abort(); setup = null; render(); });
  range.addEventListener('input', () => {
    const sec = Number(range.value);
    rangeOut.textContent = sec;
    timer.setDuration(sec);
    setSettings({ timerSeconds: sec });
  });
  return render;
}

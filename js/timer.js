// Countdown timer with audible cues. Pure logic + Web Audio, no DOM.
// Cues: short warning beep at 15s, "pi - pi - piiii" for the last 3 seconds; soft chime for a recognised voice command.
const WARNING_AT = 15;

export function createTimer({ onTick, onFinish }) {
  let duration = 60;
  let endAt = 0;          // epoch ms when the countdown hits 0, 0 = not running
  let remaining = duration;
  let interval = null;
  let lastWholeSecond = null;
  let audio = null;

  function beep(freq, ms) {
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + ms / 1000);
  }

  // Soft two-note sine "ding-ding" with a fade-out; deliberately unlike the square-wave countdown beeps.
  function chime() {
    if (!audio) return;
    [784, 1047].forEach((freq, i) => {
      const t = audio.currentTime + i * 0.08;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  function cue(sec) {
    if (sec === WARNING_AT) beep(660, 150);
    else if (sec === 3 || sec === 2) beep(880, 120);
    else if (sec === 1) beep(880, 120);
    else if (sec === 0) beep(1100, 700);
  }

  function tick() {
    remaining = Math.max(0, (endAt - Date.now()) / 1000);
    const whole = Math.ceil(remaining);
    if (whole !== lastWholeSecond) {
      lastWholeSecond = whole;
      cue(whole);
    }
    onTick(remaining);
    if (remaining <= 0) {
      stop();
      onFinish();
    }
  }

  function stop() {
    clearInterval(interval);
    interval = null;
    endAt = 0;
  }

  return {
    get running() { return interval !== null; },
    get remaining() { return remaining; },
    get duration() { return duration; },
    chime,
    setDuration(sec) {
      duration = sec;
      if (!this.running) { remaining = sec; onTick(remaining); }
    },
    // AudioContext must be created from a user gesture (a click on start, or on the mic for voice starts).
    unlockAudio() {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    },
    start() {
      this.unlockAudio();
      endAt = Date.now() + remaining * 1000;
      lastWholeSecond = Math.ceil(remaining);
      interval = setInterval(tick, 100);
    },
    pause() {
      stop();
      onTick(remaining);
    },
    reset() {
      stop();
      remaining = duration;
      onTick(remaining);
    },
  };
}

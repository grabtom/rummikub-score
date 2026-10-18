// Voice commands via the Web Speech API: "hop hop" / "zmiana kolejki" / "następny gracz", start, pause/stop, reset.
const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const COOLDOWN = 1500; // Chrome re-emits "hop" then "hop hop" for one utterance; swallow the echo.
const FATAL = ['network', 'not-allowed', 'service-not-allowed', 'language-not-supported'];
// Order = priority when two commands match at the same position.
const COMMANDS = [
  ['next', /\b(w?h?o+p+(\s+w?h?o+p+)*|hob|hope|zmian\w*\s+kolej\w*|nast[eę]pn\w*\s+gracz\w*|next\s+player\w*)\b/i],
  ['reset', /\b(re[ -]?set\w*|rizet|riset)\b/i],
  ['start', /\b(start\w*|stard|stat)\b/i],
  ['pause', /\b(pau[sz]\w*|pałz\w*|pause|pose|paws|paus|stop|stopuj)\b/i],
];

// Only Google Chrome and Safari reliably have a speech backend (Brave, Edge, Opera, ... fail or differ).
function chromeOrSafari(nav = globalThis.navigator || {}) {
  const ua = nav.userAgent || '';
  if (nav.brave) return false;
  if (nav.userAgentData) return nav.userAgentData.brands.some((b) => b.brand === 'Google Chrome');
  return /CriOS/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|Android/.test(ua));
}

export const voiceSupported = !!SR && chromeOrSafari();

/** Commands in `text` after `offset`, earliest first: [[cmd, endOffset], ...]. */
export function matchCommands(text, offset = 0) {
  const out = [];
  for (;;) {
    const found = COMMANDS.map(([cmd, re]) => [cmd, re.exec(text.slice(offset))]).filter((f) => f[1]);
    if (!found.length) return out;
    const [cmd, m] = found.sort((a, b) => a[1].index - b[1].index)[0];
    offset += m.index + m[0].length;
    out.push([cmd, offset]);
  }
}

export function createVoice({ onCommand, onChange }) {
  let rec = null, wanted = false;
  const lastFired = {};

  function fire(cmd) {
    if (Date.now() - (lastFired[cmd] || 0) < COOLDOWN) return;
    lastFired[cmd] = Date.now();
    onCommand(cmd);
  }

  function listen(lang) {
    const r = rec = new SR();
    // Chrome keeps appending phrases to one result until a long silence: per result index,
    // remember how much of its best transcript was consumed and scan only what came after.
    const consumed = new Map();
    Object.assign(r, { lang, continuous: true, interimResults: true, maxAlternatives: 5 });
    r.onresult = (e) => {
      if (rec !== r) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i], text = res[0].transcript;
        for (const [cmd, end] of matchCommands(text, consumed.get(i) || 0)) { consumed.set(i, end); fire(cmd); }
        // Nothing in the best guess: on final, try the other alternatives once.
        if (consumed.has(i) || !res.isFinal) continue;
        for (const alt of Array.from(res).slice(1)) {
          const [m] = matchCommands(alt.transcript);
          if (m) { consumed.set(i, text.length); fire(m[0]); break; }
        }
      }
    };
    r.onerror = (e) => {
      // These do not fix themselves; restarting would just loop.
      if (rec === r && FATAL.includes(e.error)) { wanted = false; rec = null; onChange(false, e.error); }
    };
    r.onend = () => { if (wanted && rec === r) listen(lang); };
    r.start();
  }

  return {
    get listening() { return wanted; },
    start(lang) {
      if (wanted) return;
      wanted = true;
      listen(lang);
      onChange(true);
    },
    stop() {
      wanted = false;
      if (rec) { const r = rec; rec = null; r.abort(); }
      onChange(false);
    },
  };
}

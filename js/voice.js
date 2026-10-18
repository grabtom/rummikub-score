// Voice commands, offline via Vosk (WebAssembly): "hop hop" / "zmiana kolejki" / "następny gracz", start, pause/stop, reset.
// Storage: vosk.js lives in Cache Storage "vosk-v1". A model .tar.gz is put there only until Vosk has unpacked it into
// IndexedDB "/vosk" (keyed by the model URL, so a stable URL = one copy); then the archive is deleted.
const COOLDOWN = 1500; // the same command again within this time is an echo of one utterance
const CACHE = 'vosk-v1';
const BASE = new URL('../vendor/vosk/', import.meta.url).href;
const LIB = { url: BASE + 'vosk.js', size: 5804767 };
const MODELS = {
  pl: { url: BASE + 'vosk-model-small-pl-0.22.tar.gz', size: 52937845, words: 'hop zmiana kolejki następny gracz start stop pauza reset' },
  en: { url: BASE + 'vosk-model-small-en-us-0.15.tar.gz', size: 41183526, words: 'hop hoop next player start pause stop reset' },
};
const GRAMMAR = false; // true = recognise only MODELS[].words + [unk]; free recognition is the tested default
// Order = priority when two commands match at the same position.
const COMMANDS = [
  ['next', /\b(w?h?o+p+(\s+w?h?o+p+)*|hob|hope|zmian\w*\s+kolej\w*|nast[eę]pn\w*\s+gracz\w*|next\s+player\w*)\b/i],
  ['reset', /\b(re[ -]?set\w*|rizet|riset)\b/i],
  ['start', /\b(start\w*|stard|stat)\b/i],
  ['pause', /\b(pau[sz]\w*|pałz\w*|pause|pose|paws|paus|stop|stopuj)\b/i],
];

const g = globalThis;
export const voiceSupported = !!(g.WebAssembly && g.Worker && g.AudioContext && g.caches && g.indexedDB && g.navigator?.mediaDevices?.getUserMedia);

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

const modelOf = (lang) => MODELS[lang === 'pl' ? 'pl' : 'en'];

// IndexedDB paths of an unpacked model, same scheme as vosk-browser 0.0.8's worker.
const dir = (url) => `/vosk/${url.replace(/\W/g, '_')}`;

// Has Vosk finished unpacking this model into IndexedDB?
function unpacked(url) {
  return new Promise((resolve) => {
    const req = indexedDB.open('/vosk');
    req.onupgradeneeded = () => req.transaction.abort(); // no database yet: do not create an empty one
    req.onerror = () => resolve(false);
    req.onsuccess = () => {
      const db = req.result, done = (v) => { db.close(); resolve(v); };
      try {
        const c = db.transaction('FILE_DATA').objectStore('FILE_DATA').count(`${dir(url)}/extracted.ok`);
        c.onsuccess = () => done(c.result > 0);
        c.onerror = () => done(false);
      } catch { done(false); }
    };
  });
}

// Delete an unpacked model. Vosk loads every stored model into memory, so keep only the current language's.
function forget(url) {
  return new Promise((resolve) => {
    const req = indexedDB.open('/vosk');
    req.onerror = () => resolve();
    req.onsuccess = () => {
      const db = req.result, done = () => { db.close(); resolve(); };
      try {
        const tx = db.transaction('FILE_DATA', 'readwrite');
        tx.objectStore('FILE_DATA').delete(IDBKeyRange.bound(dir(url), dir(url) + '\uffff'));
        tx.oncomplete = tx.onerror = done;
      } catch { done(); }
    };
  });
}

async function loadLib() {
  if (g.Vosk) return;
  const res = await (await caches.open(CACHE)).match(LIB.url) || await fetch(LIB.url);
  const src = URL.createObjectURL(await res.blob());
  await new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src, onload: resolve, onerror: () => reject(new Error('vosk.js')) });
    document.head.append(s);
  }).finally(() => URL.revokeObjectURL(src));
}

// Vosk's worker fetches the model itself; serve it from our cache (no service worker needed, e.g. on localhost).
function newModel(url) {
  const W = g.Worker, q = JSON.stringify;
  g.Worker = class extends W {
    constructor(src, opts) {
      const pre = `self.fetch=((f)=>(u,o)=>u===${q(url)}?caches.match(u).then((r)=>r||f(u,o)):f(u,o))(self.fetch);importScripts(${q(String(src))});`;
      super(URL.createObjectURL(new Blob([pre], { type: 'text/javascript' })), opts);
    }
  };
  try { return new g.Vosk.Model(url); } finally { g.Worker = W; }
}

export function createVoice({ onCommand, onChange }) {
  let modelUrl = null, modelP = null, wanted = false, loading = false, session = 0;
  let ctx = null, stream = null, source = null, node = null, rec = null;
  const lastFired = {};

  function fire(cmd) {
    if (Date.now() - (lastFired[cmd] || 0) < COOLDOWN) return;
    lastFired[cmd] = Date.now();
    onCommand(cmd);
  }

  function loadModel({ url }) {
    if (url === modelUrl) return modelP;
    modelP?.then((m) => m.worker.terminate(), () => {});
    modelUrl = url;
    return modelP = (async () => {
      await loadLib();
      const m = newModel(url);
      await new Promise((resolve, reject) => {
        m.on('load', (msg) => (msg.result ? resolve() : reject(new Error('model'))));
        m.on('error', (msg) => reject(new Error(msg.error)));
      }).catch((e) => { m.worker.terminate(); throw e; }); // Model.terminate() throws in the worker if not loaded
      const c = await caches.open(CACHE);
      await c.delete(url); // now unpacked in IndexedDB; keep one copy only
      // Only after the new model works: drop the other language (archive and unpacked copy).
      for (const other of Object.values(MODELS)) if (other.url !== url) await Promise.all([c.delete(other.url), forget(other.url)]);
      return m;
    })().catch((e) => { if (modelUrl === url) modelUrl = modelP = null; throw e; });
  }

  function listen(model, { words }, rate) {
    const r = rec = new model.KaldiRecognizer(rate, GRAMMAR ? JSON.stringify([...words.split(' '), '[unk]']) : undefined);
    // Partials grow within one utterance: scan only past what was consumed; a final ends the utterance.
    let consumed = 0;
    const scan = (text) => { for (const [cmd, end] of matchCommands(text, consumed)) { consumed = end; fire(cmd); } };
    r.on('partialresult', (msg) => { if (rec === r && msg.result.partial) scan(msg.result.partial); });
    r.on('result', (msg) => { if (rec !== r) return; if (msg.result.text) scan(msg.result.text); consumed = 0; });
  }

  function teardown() {
    session++; wanted = loading = false;
    if (node) { node.onaudioprocess = null; node.disconnect(); node = null; }
    if (source) { source.disconnect(); source = null; }
    if (stream) { stream.getTracks().forEach((tr) => tr.stop()); stream = null; }
    if (ctx) { ctx.close(); ctx = null; }
    if (rec) { rec.remove(); rec = null; }
  }

  return {
    get listening() { return wanted; },
    get loading() { return loading; },
    /** Bytes still to download before `start(lang)` works; 0 = ready (also offline). */
    async missing(lang) {
      const m = modelOf(lang), c = await caches.open(CACHE);
      const [lib, model] = await Promise.all([
        g.Vosk || c.match(LIB.url),
        m.url === modelUrl || c.match(m.url).then((r) => r || unpacked(m.url)),
      ]);
      return (lib ? 0 : LIB.size) + (model ? 0 : m.size);
    },
    /** Fetch vosk.js and the model into Cache Storage; `onProgress(loaded, total)`. Nothing is stored unless complete. */
    async download(lang, signal, onProgress) {
      const m = modelOf(lang), c = await caches.open(CACHE);
      const todo = [];
      if (!await c.match(LIB.url)) todo.push(LIB);
      if (!await c.match(m.url) && !await unpacked(m.url)) todo.push(m);
      const total = todo.reduce((s, a) => s + a.size, 0);
      let loaded = 0;
      for (const { url } of todo) {
        const res = await fetch(url, { signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader(), parts = [];
        for (let r; !(r = await reader.read()).done;) { parts.push(r.value); loaded += r.value.length; onProgress(Math.min(loaded, total), total); }
        await c.put(url, new Response(new Blob(parts), { headers: { 'content-type': res.headers.get('content-type') || '' } }));
      }
      navigator.storage?.persist?.(); // ask the browser not to evict the model under storage pressure
    },
    async start(lang) {
      if (wanted) return;
      const run = ++session, m = modelOf(lang);
      wanted = loading = true; onChange();
      try {
        const model = await loadModel(m);
        if (run !== session) return;
        loading = false; onChange();
        const s = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
        if (run !== session) return s.getTracks().forEach((tr) => tr.stop());
        stream = s; ctx = new AudioContext(); ctx.resume();
        listen(model, m, ctx.sampleRate);
        source = ctx.createMediaStreamSource(stream);
        node = ctx.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = (e) => rec?.acceptWaveform(e.inputBuffer);
        source.connect(node); node.connect(ctx.destination); // silent output; Chrome only runs connected processors
      } catch (e) {
        if (run !== session) return;
        teardown();
        onChange(e);
      }
    },
    /** Stop the mic; the model stays in memory for a fast restart. */
    stop() {
      if (!wanted) return;
      teardown();
      onChange();
    },
  };
}

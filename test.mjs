// Smallest check that fails if scoring or the export/import codec breaks. Run: node test.mjs
import assert from 'node:assert/strict';

globalThis.location = { href: 'https://example.test/app/', hash: '' };
const { scoreRound, totals } = await import('./js/util.js');
const { buildExportUrl, parseImportHash } = await import('./js/share.js');

// Standard scoring: winner gets the sum, others negative.
assert.deepEqual(scoreRound([0, 12, 30]), [42, -12, -30]);
// Blocked game (no winner): everyone negative.
assert.deepEqual(scoreRound([5, 12]), [-5, -12]);
assert.deepEqual(totals({ players: ['a', 'b'], rounds: [[10, -10], [-3, 3]] }), [7, -7]);

// URL roundtrip + validation of junk entries.
const game = { id: 'g1', players: ['Ann', 'Bob'], rounds: [[10, -10]], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', archived: false };
const url = await buildExportUrl([game, { id: 'bad' }]);
assert.ok(url.startsWith('https://example.test/app/#import='));
assert.deepEqual(await parseImportHash(new URL(url).hash), [game]);
assert.equal(await parseImportHash('#/'), null);

// Voice command matcher.
const { matchCommands } = await import('./js/voice.js');
const cmds = (text, off) => matchCommands(text, off).map(([c]) => c);
assert.deepEqual(cmds('hop hop'), ['next']);
assert.deepEqual(cmds('hop hop hop hop stop'), ['next', 'pause']);
const [[, end]] = matchCommands('Hop hop');
assert.deepEqual(cmds('Hop hop start', end), ['start']);
assert.deepEqual(cmds('zmiana kolejki'), ['next']);
assert.deepEqual(cmds('Następny gracz'), ['next']);
for (const [text, cmd] of [['next player', 'next'], ['Hoop hoop', 'next'], ['whoop whoop', 'next'], ['Pause', 'pause'], ['paws', 'pause'], ['re-set', 'reset'], ['Start', 'start']])
  assert.deepEqual(cmds(text), [cmd], text);
for (const text of ['zmiana zdania', 'następny', 'gracz', 'stopa', 'restart', 'starość', 'oops', 'hopefully', 'next round']) assert.deepEqual(cmds(text), [], text);

console.log('ok');

// Single localStorage key holding the whole database.
// Shape: { version, games: { [id]: Game }, settings: { timerSeconds } }
// Game: { id, players: string[], rounds: number[][], createdAt, updatedAt, archived }
import { uid } from './util.js';

const KEY = 'rummikub-score';
export const DB_VERSION = 1;

function empty() {
  return { version: DB_VERSION, games: {}, settings: { timerSeconds: 60 } };
}

export function loadDb() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY));
    return db && db.games ? { ...empty(), ...db, settings: { ...empty().settings, ...db.settings } } : empty();
  } catch {
    return empty();
  }
}

export function saveDb(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function listGames() {
  return Object.values(loadDb().games).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getGame(id) {
  return loadDb().games[id] || null;
}

export function createGame(players) {
  const now = new Date().toISOString();
  const game = { id: uid(), players, rounds: [], createdAt: now, updatedAt: now, archived: false };
  const db = loadDb();
  db.games[game.id] = game;
  saveDb(db);
  return game;
}

/** Apply `fn(game)` and persist, bumping updatedAt. */
export function updateGame(id, fn) {
  const db = loadDb();
  const game = db.games[id];
  if (!game) return null;
  fn(game);
  game.updatedAt = new Date().toISOString();
  saveDb(db);
  return game;
}

export function deleteGame(id) {
  const db = loadDb();
  delete db.games[id];
  saveDb(db);
}

/** Merge imported games by id; newer updatedAt wins. Returns number of games written. */
export function mergeGames(games) {
  const db = loadDb();
  let written = 0;
  for (const g of games) {
    const existing = db.games[g.id];
    if (!existing || existing.updatedAt < g.updatedAt) { db.games[g.id] = g; written++; }
  }
  saveDb(db);
  return written;
}

export function getSettings() {
  return loadDb().settings;
}

export function setSettings(patch) {
  const db = loadDb();
  db.settings = { ...db.settings, ...patch };
  saveDb(db);
}

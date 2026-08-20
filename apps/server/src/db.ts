import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';

fs.mkdirSync(path.dirname(CONFIG.dbFile), { recursive: true });

export const db = new Database(CONFIG.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  is_admin      INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  xp            INTEGER NOT NULL DEFAULT 0,
  rating        INTEGER NOT NULL DEFAULT 1000,
  coin          INTEGER NOT NULL DEFAULT 500,
  diamond       INTEGER NOT NULL DEFAULT 20,
  season_token  INTEGER NOT NULL DEFAULT 0,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  draws         INTEGER NOT NULL DEFAULT 0,
  ban_reason    TEXT,
  ban_until     INTEGER,
  mute_until    INTEGER,
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_seed  TEXT NOT NULL,
  avatar_style TEXT NOT NULL DEFAULT 'adventurer',
  frame_id     TEXT,
  title_id     TEXT,
  background_id TEXT,
  bubble_id    TEXT,
  bio          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS game_stats (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  matches   INTEGER NOT NULL DEFAULT 0,
  wins      INTEGER NOT NULL DEFAULT 0,
  losses    INTEGER NOT NULL DEFAULT 0,
  rating    INTEGER NOT NULL DEFAULT 1000,
  PRIMARY KEY (user_id, game_type)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device     TEXT,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS friends (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS channels (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
  ref_id     TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read  INTEGER NOT NULL DEFAULT 0,
  muted      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id  TEXT NOT NULL,
  body       TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'text',
  filtered   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);

CREATE TABLE IF NOT EXISTS matches (
  id         TEXT PRIMARY KEY,
  game_type  TEXT NOT NULL,
  mode       TEXT NOT NULL,
  room_id    TEXT,
  status     TEXT NOT NULL,
  seed       TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at   INTEGER
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id     TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  seat         INTEGER NOT NULL,
  result       TEXT,
  score        INTEGER NOT NULL DEFAULT 0,
  place        INTEGER NOT NULL DEFAULT 0,
  rating_delta INTEGER NOT NULL DEFAULT 0,
  xp_gain      INTEGER NOT NULL DEFAULT 0,
  coin_gain    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS game_states (
  match_id   TEXT PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  version    INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  rng_state  INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_actions (
  action_id  TEXT PRIMARY KEY,
  match_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  version    INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_actions_match ON match_actions(match_id, version);

CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  rarity        TEXT NOT NULL,
  price_coin    INTEGER,
  price_diamond INTEGER,
  payload       TEXT NOT NULL DEFAULT '{}',
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS inventory (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL REFERENCES items(id),
  quantity    INTEGER NOT NULL DEFAULT 1,
  equipped    INTEGER NOT NULL DEFAULT 0,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  type          TEXT NOT NULL,
  currency      TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'completed',
  ref           TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at);

CREATE TABLE IF NOT EXISTS quests (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  metric         TEXT NOT NULL,
  target         INTEGER NOT NULL,
  reward_coin    INTEGER NOT NULL DEFAULT 0,
  reward_xp      INTEGER NOT NULL DEFAULT 0,
  reward_diamond INTEGER NOT NULL DEFAULT 0,
  game_type      TEXT,
  start_at       INTEGER,
  end_at         INTEGER,
  active         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_quests (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id  TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  period    TEXT NOT NULL,
  progress  INTEGER NOT NULL DEFAULT 0,
  claimed   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quest_id, period)
);

CREATE TABLE IF NOT EXISTS achievements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  metric      TEXT NOT NULL,
  target      INTEGER NOT NULL,
  reward_coin INTEGER NOT NULL DEFAULT 0,
  reward_xp   INTEGER NOT NULL DEFAULT 0,
  emoji       TEXT NOT NULL DEFAULT '🏆'
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress       INTEGER NOT NULL DEFAULT 0,
  unlocked_at    INTEGER,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  banner      TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL,
  start_at    INTEGER NOT NULL,
  end_at      INTEGER NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  payload    TEXT NOT NULL DEFAULT '{}',
  read_at    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  target_type TEXT NOT NULL,
  reason      TEXT NOT NULL,
  evidence    TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  handled_by  TEXT,
  handled_at  INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  detail     TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  name       TEXT NOT NULL,
  props      TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_events(name, created_at);

CREATE TABLE IF NOT EXISTS daily_counters (
  user_id TEXT NOT NULL,
  day     TEXT NOT NULL,
  metric  TEXT NOT NULL,
  value   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, metric)
);
`);

export function nowMs(): number {
  return Date.now();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoWeek(): string {
  const d = new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

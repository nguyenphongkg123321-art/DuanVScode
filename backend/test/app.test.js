import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';

class FakePool {
  constructor() {
    this.users = [];
    this.scores = [];
  }

  async query(text, params = []) {
    const sql = text.replace(/\s+/g, ' ').trim();
    if (sql === 'SELECT 1') return { rows: [{ '?column?': 1 }], rowCount: 1 };

    if (sql.startsWith('INSERT INTO users')) {
      const [username, passwordHash] = params;
      if (this.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        const error = new Error('duplicate');
        error.code = '23505';
        throw error;
      }
      const user = {
        id: `user-${this.users.length + 1}`,
        username,
        password_hash: passwordHash,
        avatar: 'neon',
        play_time_seconds: 0,
        created_at: new Date('2026-01-01T00:00:00Z'),
      };
      this.users.push(user);
      return { rows: [user], rowCount: 1 };
    }

    if (sql.startsWith('SELECT id, password_hash FROM users')) {
      const user = this.users.find((entry) => entry.username.toLowerCase() === params[0].toLowerCase());
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (sql.startsWith('SELECT id, username, avatar')) {
      const user = this.users.find((entry) => entry.id === params[0]);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (sql.includes('COUNT(*)::int AS games_played')) {
      const scores = this.scores.filter((entry) => entry.user_id === params[0]);
      return { rows: [{
        games_played: scores.length,
        snake: Math.max(0, ...scores.filter((entry) => entry.game === 'SNAKE').map((entry) => entry.score)),
        block: Math.max(0, ...scores.filter((entry) => entry.game === 'BLOCK').map((entry) => entry.score)),
        caro_x: scores.filter((entry) => entry.game === 'CARO' && entry.winner === 'X').length,
        caro_o: scores.filter((entry) => entry.game === 'CARO' && entry.winner === 'O').length,
      }], rowCount: 1 };
    }

    if (sql.startsWith('SELECT id, game, score, winner')) {
      return { rows: this.scores.filter((entry) => entry.user_id === params[0]), rowCount: this.scores.length };
    }

    if (sql.startsWith('INSERT INTO scores')) {
      const [userId, game, score, winner] = params;
      const entry = {
        id: this.scores.length + 1,
        user_id: userId,
        game,
        score,
        winner,
        created_at: new Date('2026-01-02T00:00:00Z'),
      };
      this.scores.push(entry);
      return { rows: [entry], rowCount: 1 };
    }

    throw new Error(`Unexpected query in test: ${sql}`);
  }
}

async function json(response) {
  return { response, body: await response.json() };
}

test('auth and score API use the authenticated user and hide password hashes', async (context) => {
  const pool = new FakePool();
  const app = createApp({
    pool,
    jwtSecret: 'test-secret-that-is-long-enough-for-tests',
    secureCookies: false,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const registered = await json(await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'PlayerOne', password: 'safe-password' }),
  }));
  assert.equal(registered.response.status, 201);
  assert.equal(registered.body.user.username, 'PlayerOne');
  assert.equal(JSON.stringify(registered.body).includes('password'), false);

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'playerone', password: 'safe-password' }),
  });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get('set-cookie').split(';')[0];

  const submitted = await json(await fetch(`${baseUrl}/api/scores`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ user_id: 'another-user', game: 'CARO', score: 999999, winner: 'X' }),
  }));
  assert.equal(submitted.response.status, 201);
  assert.equal(pool.scores[0].user_id, 'user-1');
  assert.equal(pool.scores[0].score, 1);

  const unauthenticated = await fetch(`${baseUrl}/api/scores`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ game: 'BLOCK', score: 100 }),
  });
  assert.equal(unauthenticated.status, 401);
});

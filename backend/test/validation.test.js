import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCredentials, validateScore } from '../src/validation.js';

test('registration validates username and password', () => {
  assert.ok(validateCredentials({ username: 'ab', password: '123' }, { registration: true }).errors.username);
  assert.ok(validateCredentials({ username: 'valid_user', password: '123' }, { registration: true }).errors.password);
  assert.deepEqual(validateCredentials({ username: ' Người_Chơi ', password: 'password123' }, { registration: true }).errors, {});
});

test('score validation never accepts a client-provided Caro total', () => {
  assert.deepEqual(validateScore({ game: 'CARO', score: 999999, winner: 'X' }), { game: 'CARO', score: 1, winner: 'X' });
  assert.deepEqual(validateScore({ game: 'CARO', score: 999999 }), { game: 'CARO', score: 0, winner: null });
});

test('arcade scores must be bounded non-negative integers', () => {
  assert.equal(validateScore({ game: 'SNAKE', score: -1 }).error, 'Điểm phải là số nguyên từ 0 đến 10.000.000.');
  assert.equal(validateScore({ game: 'BLOCK', score: 10.5 }).error, 'Điểm phải là số nguyên từ 0 đến 10.000.000.');
  assert.deepEqual(validateScore({ game: 'BLOCK', score: 420 }), { game: 'BLOCK', score: 420, winner: null });
});

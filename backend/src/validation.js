export const GAMES = new Set(['CARO', 'SNAKE', 'BLOCK']);
export const AVATARS = new Set(['neon', 'cyber', 'astro', 'ghost', 'robot']);

export function validateCredentials(input = {}, { registration = false } = {}) {
  const errors = {};
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!username) errors.username = 'Tên tài khoản không được để trống.';
  else if (username.length < 3 || username.length > 20) errors.username = 'Tên tài khoản phải từ 3–20 ký tự.';
  else if (!/^[\p{L}\p{N}_. -]+$/u.test(username)) errors.username = 'Tên tài khoản chứa ký tự không hợp lệ.';

  if (!password) errors.password = 'Mật khẩu không được để trống.';
  else if (registration && password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  else if (Buffer.byteLength(password, 'utf8') > 72) errors.password = 'Mật khẩu không được dài quá 72 byte.';

  return { username, password, errors };
}

export function validateScore(input = {}) {
  const game = typeof input.game === 'string' ? input.game.toUpperCase() : '';
  if (!GAMES.has(game)) return { error: 'Trò chơi không hợp lệ.' };

  if (game === 'CARO') {
    const winner = input.winner == null || input.winner === '' ? null : String(input.winner).toUpperCase();
    if (winner !== null && winner !== 'X' && winner !== 'O') return { error: 'Kết quả Caro không hợp lệ.' };
    return { game, score: winner ? 1 : 0, winner };
  }

  const score = Number(input.score);
  if (!Number.isSafeInteger(score) || score < 0 || score > 10_000_000) {
    return { error: 'Điểm phải là số nguyên từ 0 đến 10.000.000.' };
  }
  return { game, score, winner: null };
}

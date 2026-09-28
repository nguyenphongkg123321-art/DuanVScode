import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { getLeaderboard, getUserDashboard } from './data.js';
import { AVATARS, GAMES, validateCredentials, validateScore } from './validation.js';

const SESSION_COOKIE = 'mgh_session';
const DUMMY_PASSWORD_HASH = '$2b$12$lkVf3bK5hTdu7uMk9Dzq8e5fD0TZQ4QmVpxh.qnUIcxnTZGHPIyWi';

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function durationMilliseconds(value) {
  const match = String(value).match(/^(\d+)([smhd])$/);
  if (!match) throw new Error('JWT_EXPIRES_IN must use s, m, h, or d (for example: 7d).');
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * multipliers[match[2]];
}

export function createApp({ pool, jwtSecret, jwtExpiresIn = '7d', appOrigin = '', secureCookies = true }) {
  const app = express();
  // Requests pass through the VPS proxy and the frontend Nginx container.
  app.set('trust proxy', 2);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !appOrigin) return next();
    const origin = req.get('origin');
    if (!origin || origin === appOrigin) return next();
    return res.status(403).json({ error: 'Nguồn yêu cầu không hợp lệ.' });
  });

  const cookieOptions = {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'strict',
    path: '/',
    maxAge: durationMilliseconds(jwtExpiresIn),
  };

  function setSession(res, userId) {
    const token = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: jwtExpiresIn, issuer: 'mini-game-hub' });
    res.cookie(SESSION_COOKIE, token, cookieOptions);
  }

  function clearSession(res) {
    const { maxAge, ...options } = cookieOptions;
    res.clearCookie(SESSION_COOKIE, options);
  }

  function requireAuth(req, res, next) {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: 'Bạn cần đăng nhập.' });
    try {
      const payload = jwt.verify(token, jwtSecret, { issuer: 'mini-game-hub' });
      if (typeof payload.sub !== 'string') throw new Error('Invalid subject');
      req.userId = payload.sub;
      return next();
    } catch {
      clearSession(res);
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' });
    }
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Quá nhiều lần thử. Vui lòng đợi rồi thử lại.' },
  });
  const scoreLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Bạn gửi điểm quá nhanh. Vui lòng thử lại sau.' },
  });

  app.get('/api/health', asyncRoute(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  }));

  app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
    const { username, password, errors } = validateCredentials(req.body, { registration: true });
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Dữ liệu đăng ký không hợp lệ.', errors });

    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const result = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
        [username, passwordHash],
      );
      const user = result.rows[0];
      return res.status(201).json({
        user: { id: user.id, username: user.username, createdAt: user.created_at },
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Tên tài khoản đã tồn tại.', errors: { username: 'Tên tài khoản đã tồn tại.' } });
      }
      throw error;
    }
  }));

  app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
    const { username, password, errors } = validateCredentials(req.body);
    if (errors.username || errors.password) return res.status(401).json({ error: 'Không đúng tên tài khoản hoặc mật khẩu.' });

    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [username],
    );
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !validPassword) return res.status(401).json({ error: 'Không đúng tên tài khoản hoặc mật khẩu.' });

    setSession(res, user.id);
    return res.json(await getUserDashboard(pool, user.id));
  }));

  app.post('/api/auth/logout', (_req, res) => {
    clearSession(res);
    res.status(204).end();
  });

  app.get('/api/me', requireAuth, asyncRoute(async (req, res) => {
    const dashboard = await getUserDashboard(pool, req.userId);
    if (!dashboard) {
      clearSession(res);
      return res.status(401).json({ error: 'Tài khoản không còn tồn tại.' });
    }
    return res.json(dashboard);
  }));

  app.patch('/api/me', requireAuth, asyncRoute(async (req, res) => {
    const avatar = typeof req.body.avatar === 'string' ? req.body.avatar : '';
    if (!AVATARS.has(avatar)) return res.status(400).json({ error: 'Hình đại diện không hợp lệ.' });
    await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.userId]);
    return res.json(await getUserDashboard(pool, req.userId));
  }));

  app.post('/api/playtime', requireAuth, asyncRoute(async (req, res) => {
    const seconds = Number(req.body.seconds);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86_400) {
      return res.status(400).json({ error: 'Thời gian chơi không hợp lệ.' });
    }
    await pool.query('UPDATE users SET play_time_seconds = play_time_seconds + $1 WHERE id = $2', [seconds, req.userId]);
    return res.status(204).end();
  }));

  app.post('/api/scores', scoreLimiter, requireAuth, asyncRoute(async (req, res) => {
    const score = validateScore(req.body);
    if (score.error) return res.status(400).json({ error: score.error });

    const result = await pool.query(`
      INSERT INTO scores (user_id, game, score, winner)
      VALUES ($1, $2, $3, $4)
      RETURNING id, game, score, winner, created_at
    `, [req.userId, score.game, score.score, score.winner]);
    return res.status(201).json({ score: result.rows[0], dashboard: await getUserDashboard(pool, req.userId) });
  }));

  app.get('/api/leaderboard', asyncRoute(async (req, res) => {
    const requestedGame = typeof req.query.game === 'string' ? req.query.game.toUpperCase() : '';
    if (requestedGame && !GAMES.has(requestedGame)) return res.status(400).json({ error: 'Trò chơi không hợp lệ.' });
    return res.json({ entries: await getLeaderboard(pool, requestedGame || null) });
  }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API không tồn tại.' }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'JSON không hợp lệ.' });
    return res.status(500).json({ error: 'Máy chủ gặp lỗi. Vui lòng thử lại sau.' });
  });

  return app;
}

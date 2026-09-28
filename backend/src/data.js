function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export async function getUserDashboard(pool, userId) {
  const [userResult, statsResult, historyResult] = await Promise.all([
    pool.query(
      'SELECT id, username, avatar, play_time_seconds, created_at FROM users WHERE id = $1',
      [userId],
    ),
    pool.query(`
      SELECT
        COUNT(*)::int AS games_played,
        COALESCE(MAX(score) FILTER (WHERE game = 'SNAKE'), 0)::int AS snake,
        COALESCE(MAX(score) FILTER (WHERE game = 'BLOCK'), 0)::int AS block,
        COUNT(*) FILTER (WHERE game = 'CARO' AND winner = 'X')::int AS caro_x,
        COUNT(*) FILTER (WHERE game = 'CARO' AND winner = 'O')::int AS caro_o
      FROM scores
      WHERE user_id = $1
    `, [userId]),
    pool.query(`
      SELECT id, game, score, winner, created_at
      FROM scores
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `, [userId]),
  ]);

  const user = userResult.rows[0];
  if (!user) return null;
  const stats = statsResult.rows[0];
  const publicUser = {
    id: user.id,
    username: user.username,
    createdAt: user.created_at,
  };

  return {
    user: publicUser,
    data: {
      profile: {
        username: user.username,
        avatar: user.avatar,
        gamesPlayed: stats.games_played,
        playTime: Number(user.play_time_seconds),
      },
      scores: {
        snake: stats.snake,
        block: stats.block,
        caroX: stats.caro_x,
        caroO: stats.caro_o,
      },
      history: historyResult.rows.map((entry) => ({
        id: String(entry.id),
        userId: user.id,
        player: user.username,
        game: entry.game,
        score: entry.score,
        winner: entry.winner,
        date: dateOnly(entry.created_at),
      })),
    },
  };
}

export async function getLeaderboard(pool, game = null) {
  const result = await pool.query(`
    SELECT
      u.id AS user_id,
      u.username AS player,
      s.game,
      CASE WHEN s.game = 'CARO' THEN SUM(s.score) ELSE MAX(s.score) END::int AS score,
      MAX(s.created_at) AS last_played_at
    FROM scores s
    JOIN users u ON u.id = s.user_id
    WHERE ($1::text IS NULL OR s.game = $1) AND s.score > 0
    GROUP BY u.id, u.username, s.game
    ORDER BY score DESC, last_played_at ASC
    LIMIT 100
  `, [game]);

  return result.rows.map((entry) => ({
    userId: entry.user_id,
    player: entry.player,
    game: entry.game,
    score: entry.score,
    date: dateOnly(entry.last_played_at),
  }));
}

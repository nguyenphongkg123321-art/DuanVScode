function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getConfig() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');

  const appOrigin = process.env.APP_ORIGIN?.replace(/\/$/, '') || '';
  if (appOrigin) {
    const url = new URL(appOrigin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== appOrigin) {
      throw new Error('APP_ORIGIN must be an origin such as https://game.example.com.');
    }
  }

  return {
    port,
    databaseUrl: required('DATABASE_URL'),
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    appOrigin,
    secureCookies: (process.env.COOKIE_SECURE || 'true').toLowerCase() === 'true',
  };
}

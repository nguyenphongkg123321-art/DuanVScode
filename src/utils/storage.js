import { apiRequest } from './api.js';

const SETTINGS_KEY = 'mini-game-hub-settings-v1';
const defaultSettings = {
  theme: 'dark',
  soundEnabled: true,
  volume: 0.35,
  musicTrack: 'neon-drive',
};

function readSettings() {
  try {
    const current = localStorage.getItem(SETTINGS_KEY);
    const legacyGlobal = localStorage.getItem('mini-game-hub-global-v1');
    const legacySingle = localStorage.getItem('mini-game-hub-v1');
    const value = JSON.parse(current || legacyGlobal || legacySingle);
    const storedSettings = current ? value : value?.settings;
    return { ...defaultSettings, ...(storedSettings && typeof storedSettings === 'object' ? storedSettings : {}) };
  } catch {
    return { ...defaultSettings };
  }
}

function emptyUserData(username = 'NGƯỜI CHƠI') {
  return {
    profile: { username, avatar: 'neon', gamesPlayed: 0, playTime: 0 },
    scores: { snake: 0, block: 0, caroX: 0, caroO: 0 },
    history: [],
  };
}

let userData = emptyUserData();
let currentUser = null;
let leaderboard = [];
let settings = readSettings();
localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
let scoreWriteQueue = Promise.resolve();

function emitDataChange() {
  window.dispatchEvent(new CustomEvent('hub:data-change'));
}

export function hydrateSession(payload) {
  currentUser = payload?.user || null;
  userData = payload?.data
    ? {
        profile: { ...emptyUserData(currentUser?.username).profile, ...payload.data.profile },
        scores: { ...emptyUserData().scores, ...payload.data.scores },
        history: Array.isArray(payload.data.history) ? payload.data.history : [],
      }
    : emptyUserData(currentUser?.username);
  emitDataChange();
  return currentUser;
}

export function clearSessionData() {
  currentUser = null;
  userData = emptyUserData();
  leaderboard = [];
  emitDataChange();
}

export function getSessionUser() {
  return currentUser;
}

export async function refreshSession() {
  const payload = await apiRequest('/api/me');
  hydrateSession(payload);
  return payload;
}

export function getData() {
  return {
    profile: userData.profile,
    scores: userData.scores,
    history: userData.history,
    leaderboard,
    settings,
  };
}

export function saveSettings(nextSettings) {
  settings = { ...settings, ...nextSettings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  emitDataChange();
  return settings;
}

export async function saveProfile(profile) {
  const payload = await apiRequest('/api/me', { method: 'PATCH', body: { avatar: profile.avatar } });
  hydrateSession(payload);
  return payload.data.profile;
}

export function addPlayTime(seconds) {
  const rounded = Math.round(seconds);
  if (rounded < 1 || !currentUser) return Promise.resolve();
  userData.profile.playTime += rounded;
  return apiRequest('/api/playtime', { method: 'POST', keepalive: true, body: { seconds: rounded } })
    .catch((error) => console.error('Không thể lưu thời gian chơi:', error));
}

export function recordResult(game, score, options = {}) {
  if (!currentUser) return Promise.resolve(getData());
  const normalizedGame = String(game).toUpperCase();
  userData.profile.gamesPlayed += 1;
  if (normalizedGame === 'SNAKE') userData.scores.snake = Math.max(userData.scores.snake, Number(score) || 0);
  if (normalizedGame === 'BLOCK') userData.scores.block = Math.max(userData.scores.block, Number(score) || 0);
  if (normalizedGame === 'CARO' && options.winner) {
    const key = options.winner === 'X' ? 'caroX' : 'caroO';
    userData.scores[key] += 1;
  }
  emitDataChange();
  scoreWriteQueue = scoreWriteQueue.catch(() => {}).then(() => apiRequest('/api/scores', {
    method: 'POST',
    body: { game: normalizedGame, score: Number(score) || 0, winner: options.winner || null },
  }));
  return scoreWriteQueue.then((payload) => {
    hydrateSession(payload.dashboard);
    return getData();
  }).catch((error) => {
    console.error('Không thể lưu điểm:', error);
    return refreshSession().catch(() => getData());
  });
}

export async function refreshLeaderboard(game = 'ALL') {
  const query = game && game !== 'ALL' ? `?game=${encodeURIComponent(game)}` : '';
  const payload = await apiRequest(`/api/leaderboard${query}`);
  leaderboard = Array.isArray(payload.entries) ? payload.entries : [];
  emitDataChange();
  return leaderboard;
}

export function formatPlayTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours) return `${hours} giờ ${minutes % 60} phút`;
  return `${minutes} phút`;
}

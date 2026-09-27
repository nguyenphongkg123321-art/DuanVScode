const LEGACY_KEY = 'mini-game-hub-v1';
const AUTH_KEY = 'mini-game-hub-auth-v1';
const USER_DATA_KEY = 'mini-game-hub-user-data-v1';
const GLOBAL_DATA_KEY = 'mini-game-hub-global-v1';

const starterScores = [
  { player: 'NOVA', game: 'SNAKE', score: 1240, date: '2026-03-18' },
  { player: 'PIXEL', game: 'BLOCK', score: 980, date: '2026-03-20' },
  { player: 'BYTE', game: 'CARO', score: 8, date: '2026-03-19' },
  { player: 'LUNA', game: 'SNAKE', score: 760, date: '2026-03-16' },
  { player: 'KIRA', game: 'BLOCK', score: 620, date: '2026-03-14' },
];

const defaultSettings = {
  theme: 'dark',
  soundEnabled: true,
  volume: 0.35,
  musicTrack: 'neon-drive',
};

function parseJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}

function defaultUserData(username = 'NGƯỜI CHƠI') {
  return {
    profile: { username, avatar: 'neon', gamesPlayed: 0, playTime: 0 },
    scores: { snake: 0, block: 0, caroX: 0, caroO: 0 },
    history: [],
  };
}

function normalizeUserData(raw, username = 'NGƯỜI CHƠI') {
  const base = defaultUserData(username);
  if (!raw || typeof raw !== 'object') return base;
  return {
    profile: { ...base.profile, ...(raw.profile || {}), username },
    scores: { ...base.scores, ...(raw.scores || {}) },
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

function readLegacyData() {
  const raw = parseJson(LEGACY_KEY, null);
  if (!raw) return null;
  return {
    profile: { ...defaultUserData().profile, ...(raw.profile || {}) },
    scores: { ...defaultUserData().scores, ...(raw.scores || {}) },
    leaderboard: Array.isArray(raw.leaderboard) ? raw.leaderboard : starterScores,
    settings: { ...defaultSettings, ...(raw.settings || {}) },
  };
}

function readGlobalData() {
  const raw = parseJson(GLOBAL_DATA_KEY, null);
  const legacy = readLegacyData();
  return {
    leaderboard: Array.isArray(raw?.leaderboard)
      ? raw.leaderboard
      : (legacy?.leaderboard || [...starterScores]),
    settings: { ...defaultSettings, ...(legacy?.settings || {}), ...(raw?.settings || {}) },
  };
}

function writeGlobalData(data) {
  localStorage.setItem(GLOBAL_DATA_KEY, JSON.stringify({
    leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : starterScores,
    settings: { ...defaultSettings, ...(data.settings || {}) },
  }));
}

function readUserDataMap() {
  const raw = parseJson(USER_DATA_KEY, {});
  return raw && !Array.isArray(raw) ? raw : {};
}

function writeUserDataMap(userDataMap) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userDataMap));
}

function emitDataChange() {
  window.dispatchEvent(new CustomEvent('hub:data-change'));
}

export function getAuthState() {
  const raw = parseJson(AUTH_KEY, {});
  const users = Array.isArray(raw.users) ? raw.users : [];
  let currentUserId = typeof raw.currentUserId === 'string' ? raw.currentUserId : null;
  if (currentUserId && !users.some((user) => user.id === currentUserId)) {
    currentUserId = null;
    localStorage.setItem(AUTH_KEY, JSON.stringify({ users, currentUserId: null }));
  }
  return { users, currentUserId };
}

export function saveAuthState(authState) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({
    users: Array.isArray(authState.users) ? authState.users : [],
    currentUserId: authState.currentUserId || null,
  }));
  emitDataChange();
}

export function initializeUserData(user) {
  const userDataMap = readUserDataMap();
  if (userDataMap[user.id]) return;

  const legacy = Object.keys(userDataMap).length === 0 ? readLegacyData() : null;
  const initialData = legacy
    ? {
        profile: { ...legacy.profile, username: user.username },
        scores: legacy.scores,
        history: [],
      }
    : defaultUserData(user.username);
  userDataMap[user.id] = normalizeUserData(initialData, user.username);
  writeUserDataMap(userDataMap);
}

export function getCurrentUserId() {
  return getAuthState().currentUserId;
}

export function getData() {
  const globalData = readGlobalData();
  const authState = getAuthState();
  const currentUser = authState.users.find((user) => user.id === authState.currentUserId);
  const userDataMap = readUserDataMap();
  const userData = currentUser
    ? normalizeUserData(userDataMap[currentUser.id], currentUser.username)
    : defaultUserData('NGƯỜI CHƠI');

  return {
    ...userData,
    leaderboard: globalData.leaderboard,
    settings: globalData.settings,
  };
}

export function saveData(data) {
  const globalData = readGlobalData();
  writeGlobalData({
    leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : globalData.leaderboard,
    settings: { ...globalData.settings, ...(data.settings || {}) },
  });

  const authState = getAuthState();
  const currentUser = authState.users.find((user) => user.id === authState.currentUserId);
  if (currentUser) {
    const userDataMap = readUserDataMap();
    userDataMap[currentUser.id] = normalizeUserData(data, currentUser.username);
    writeUserDataMap(userDataMap);
  }
  emitDataChange();
}

export function updateData(updater) {
  const current = getData();
  const next = updater(current) || current;
  saveData(next);
  return next;
}

export function saveProfile(profile) {
  return updateData((data) => {
    data.profile = { ...data.profile, ...profile, username: data.profile.username };
    return data;
  });
}

export function saveSettings(settings) {
  return updateData((data) => {
    data.settings = { ...data.settings, ...settings };
    return data;
  });
}

export function addPlayTime(seconds) {
  if (seconds < 1 || !getCurrentUserId()) return;
  updateData((data) => {
    data.profile.playTime += Math.round(seconds);
    return data;
  });
}

export function recordResult(game, score, options = {}) {
  const userId = getCurrentUserId();
  if (!userId) return getData();
  return updateData((data) => {
    data.profile.gamesPlayed += 1;
    if (game === 'SNAKE') data.scores.snake = Math.max(data.scores.snake, score);
    if (game === 'BLOCK') data.scores.block = Math.max(data.scores.block, score);
    if (game === 'CARO' && options.winner) {
      const key = options.winner === 'X' ? 'caroX' : 'caroO';
      data.scores[key] += 1;
    }

    const result = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId,
      player: data.profile.username,
      game,
      score,
      date: new Date().toISOString().slice(0, 10),
    };
    data.history.unshift(result);
    data.history = data.history.slice(0, 100);

    if (score > 0 || game === 'CARO') {
      data.leaderboard.push(result);
      data.leaderboard = data.leaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);
    }
    return data;
  });
}

export function formatPlayTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours) return `${hours} giờ ${minutes % 60} phút`;
  return `${minutes} phút`;
}

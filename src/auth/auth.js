import { getAuthState, initializeUserData, saveAuthState } from '../utils/storage.js';

const encoder = new TextEncoder();
const HASH_ITERATIONS = 120000;

function normalizeUsername(username) {
  return username.trim().toLocaleLowerCase('vi-VN');
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export async function hashPassword(password, salt) {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: HASH_ITERATIONS,
    hash: 'SHA-256',
  }, passwordKey, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export async function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const passwordHash = await hashPassword(password, base64ToBytes(user.passwordSalt));
  return passwordHash === user.passwordHash;
}

export function validateRegistration({ username, password, confirmPassword }) {
  const errors = {};
  const cleanUsername = username.trim();
  if (!cleanUsername) errors.username = 'Tên tài khoản không được để trống.';
  else if (cleanUsername.length < 3 || cleanUsername.length > 20) errors.username = 'Tên tài khoản phải từ 3–20 ký tự.';
  else if (getAuthState().users.some((user) => user.usernameNormalized === normalizeUsername(cleanUsername))) {
    errors.username = 'Tên tài khoản đã tồn tại.';
  }

  if (!password) errors.password = 'Mật khẩu không được để trống.';
  else if (password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (!confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Hai mật khẩu không giống nhau.';
  return errors;
}

export async function registerAccount({ username, password, confirmPassword }) {
  const errors = validateRegistration({ username, password, confirmPassword });
  if (Object.keys(errors).length) return { ok: false, errors };

  const authState = getAuthState();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const user = {
    id: crypto.randomUUID?.() || `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    username: username.trim(),
    usernameNormalized: normalizeUsername(username),
    passwordHash: await hashPassword(password, salt),
    passwordSalt: bytesToBase64(salt),
    hashAlgorithm: `PBKDF2-SHA256-${HASH_ITERATIONS}`,
    createdAt: new Date().toISOString(),
  };
  authState.users.push(user);
  saveAuthState(authState);
  initializeUserData(user);
  return { ok: true, user: publicUser(user) };
}

export async function loginAccount({ username, password }) {
  const authState = getAuthState();
  const user = authState.users.find((candidate) => candidate.usernameNormalized === normalizeUsername(username));
  if (!user || !password) return { ok: false, message: 'Không đúng tên tài khoản hoặc mật khẩu.' };

  if (!await verifyPassword(password, user)) {
    return { ok: false, message: 'Không đúng tên tài khoản hoặc mật khẩu.' };
  }
  authState.currentUserId = user.id;
  saveAuthState(authState);
  initializeUserData(user);
  return { ok: true, user: publicUser(user) };
}

export function logoutAccount() {
  const authState = getAuthState();
  authState.currentUserId = null;
  saveAuthState(authState);
}

export function getCurrentUser() {
  const authState = getAuthState();
  const user = authState.users.find((candidate) => candidate.id === authState.currentUserId);
  return user ? publicUser(user) : null;
}

export const createUser = registerAccount;
export const login = loginAccount;
export const logout = logoutAccount;

function publicUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

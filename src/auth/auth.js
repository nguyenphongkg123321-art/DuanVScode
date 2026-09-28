import { ApiError, apiRequest } from '../utils/api.js';
import { clearSessionData, getSessionUser, hydrateSession } from '../utils/storage.js';

export function validateRegistration({ username = '', password = '', confirmPassword = '' }) {
  const errors = {};
  const cleanUsername = username.trim();
  if (!cleanUsername) errors.username = 'Tên tài khoản không được để trống.';
  else if (cleanUsername.length < 3 || cleanUsername.length > 20) errors.username = 'Tên tài khoản phải từ 3–20 ký tự.';
  else if (!/^[\p{L}\p{N}_. -]+$/u.test(cleanUsername)) errors.username = 'Tên tài khoản chứa ký tự không hợp lệ.';

  if (!password) errors.password = 'Mật khẩu không được để trống.';
  else if (password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Hai mật khẩu không giống nhau.';
  return errors;
}

export async function initializeAuth() {
  try {
    const payload = await apiRequest('/api/me');
    return hydrateSession(payload);
  } catch (error) {
    clearSessionData();
    if (!(error instanceof ApiError) || ![0, 401].includes(error.status)) console.error(error);
    return null;
  }
}

export async function registerAccount({ username, password, confirmPassword }) {
  const errors = validateRegistration({ username, password, confirmPassword });
  if (Object.keys(errors).length) return { ok: false, errors };
  try {
    const payload = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { username: username.trim(), password },
    });
    return { ok: true, user: payload.user };
  } catch (error) {
    return {
      ok: false,
      errors: error.details?.errors || {},
      message: error.message,
    };
  }
}

export async function loginAccount({ username, password }) {
  try {
    const payload = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: username.trim(), password },
    });
    hydrateSession(payload);
    return { ok: true, user: payload.user };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export async function logoutAccount() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Không thể thông báo đăng xuất tới máy chủ:', error);
  } finally {
    clearSessionData();
  }
}

export function getCurrentUser() {
  return getSessionUser();
}

export const createUser = registerAccount;
export const login = loginAccount;
export const logout = logoutAccount;

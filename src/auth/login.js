import { loginAccount } from './auth.js';

export function renderLogin({ onLogin, onShowRegister, notice = '' }) {
  const screen = document.createElement('main');
  screen.className = 'auth-screen enter';
  screen.innerHTML = `
    <div class="auth-ambient" aria-hidden="true"><i></i><i></i><i></i></div>
    <section class="auth-card glass">
      <div class="auth-brand">
        <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
        <span>KHO <b>TRÒ CHƠI</b></span>
      </div>
      <div class="auth-heading"><span>KHU VỰC NGƯỜI CHƠI</span><h1>ĐĂNG NHẬP</h1><p>Trở lại đấu trường và tiếp tục hành trình lập kỷ lục.</p></div>
      ${notice ? '<div class="auth-notice"></div>' : ''}
      <form novalidate>
        <div class="auth-field">
          <label for="login-username">TÊN TÀI KHOẢN</label>
          <div class="auth-input"><span>◎</span><input id="login-username" name="username" minlength="3" maxlength="20" autocomplete="username" placeholder="Nhập tên tài khoản" /></div>
          <small class="field-error" data-error="username"></small>
        </div>
        <div class="auth-field">
          <label for="login-password">MẬT KHẨU</label>
          <div class="auth-input"><span>◇</span><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" /><button type="button" class="password-toggle" aria-label="Hiện mật khẩu">👁</button></div>
          <small class="field-error" data-error="password"></small>
        </div>
        <p class="auth-general-error" role="alert"></p>
        <button class="auth-submit" type="submit"><span>ĐĂNG NHẬP</span><b>→</b></button>
      </form>
      <p class="auth-switch">Chưa có tài khoản? <button type="button">Đăng ký</button></p>
      <div class="auth-security"><i>◆</i><span>Phiên đăng nhập an toàn, mật khẩu không lưu trên trình duyệt</span></div>
    </section>`;

  const form = screen.querySelector('form');
  const usernameInput = form.elements.username;
  const passwordInput = form.elements.password;
  const generalError = screen.querySelector('.auth-general-error');
  const submitButton = screen.querySelector('.auth-submit');
  if (notice) screen.querySelector('.auth-notice').textContent = `✓ ${notice}`;

  screen.querySelector('.password-toggle').addEventListener('click', (event) => {
    const visible = passwordInput.type === 'text';
    passwordInput.type = visible ? 'password' : 'text';
    event.currentTarget.classList.toggle('active', !visible);
    event.currentTarget.setAttribute('aria-label', visible ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
  });
  screen.querySelector('.auth-switch button').addEventListener('click', onShowRegister);
  [usernameInput, passwordInput].forEach((input) => input.addEventListener('input', () => {
    screen.querySelector(`[data-error="${input.name}"]`).textContent = '';
    generalError.textContent = '';
  }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    screen.querySelector('[data-error="username"]').textContent = username ? '' : 'Vui lòng nhập tên tài khoản.';
    screen.querySelector('[data-error="password"]').textContent = password ? '' : 'Vui lòng nhập mật khẩu.';
    if (!username || !password) return;

    submitButton.disabled = true;
    submitButton.querySelector('span').textContent = 'ĐANG XÁC THỰC...';
    try {
      const result = await loginAccount({ username, password });
      if (!result.ok) generalError.textContent = result.message || 'Không thể đăng nhập.';
      else onLogin(result.user);
    } catch {
      generalError.textContent = 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector('span').textContent = 'ĐĂNG NHẬP';
    }
  });
  queueMicrotask(() => usernameInput.focus());
  return screen;
}

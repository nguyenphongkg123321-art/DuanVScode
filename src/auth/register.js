import { registerAccount, validateRegistration } from './auth.js';

export function renderRegister({ onRegistered, onShowLogin }) {
  const screen = document.createElement('main');
  screen.className = 'auth-screen enter';
  screen.innerHTML = `
    <div class="auth-ambient" aria-hidden="true"><i></i><i></i><i></i></div>
    <section class="auth-card auth-card-register glass">
      <div class="auth-brand">
        <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
        <span>KHO <b>TRÒ CHƠI</b></span>
      </div>
      <div class="auth-heading"><span>TẠO HỒ SƠ NGƯỜI CHƠI</span><h1>ĐĂNG KÝ</h1><p>Tạo tài khoản trên trình duyệt và bắt đầu hành trình của bạn.</p></div>
      <form novalidate>
        <div class="auth-field">
          <label for="register-username">TÊN TÀI KHOẢN</label>
          <div class="auth-input"><span>◎</span><input id="register-username" name="username" minlength="3" maxlength="20" autocomplete="username" placeholder="3–20 ký tự" /></div>
          <small class="field-error" data-error="username"></small>
        </div>
        <div class="auth-field">
          <label for="register-password">MẬT KHẨU</label>
          <div class="auth-input"><span>◇</span><input id="register-password" name="password" type="password" minlength="6" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự" /><button type="button" class="password-toggle" aria-label="Hiện mật khẩu">👁</button></div>
          <small class="field-error" data-error="password"></small>
        </div>
        <div class="auth-field">
          <label for="register-confirm">NHẬP LẠI MẬT KHẨU</label>
          <div class="auth-input"><span>◇</span><input id="register-confirm" name="confirmPassword" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" /><button type="button" class="password-toggle" aria-label="Hiện mật khẩu">👁</button></div>
          <small class="field-error" data-error="confirmPassword"></small>
        </div>
        <p class="auth-general-error" role="alert"></p>
        <button class="auth-submit" type="submit"><span>TẠO TÀI KHOẢN</span><b>＋</b></button>
      </form>
      <p class="auth-switch">Đã có tài khoản? <button type="button">Đăng nhập</button></p>
      <div class="auth-security"><i>◆</i><span>Không yêu cầu email, số điện thoại hoặc OTP</span></div>
    </section>`;

  const form = screen.querySelector('form');
  const submitButton = screen.querySelector('.auth-submit');
  const generalError = screen.querySelector('.auth-general-error');

  function values() {
    return {
      username: form.elements.username.value,
      password: form.elements.password.value,
      confirmPassword: form.elements.confirmPassword.value,
    };
  }

  function showErrors(errors, onlyField) {
    ['username', 'password', 'confirmPassword'].forEach((field) => {
      if (!onlyField || field === onlyField) screen.querySelector(`[data-error="${field}"]`).textContent = errors[field] || '';
    });
  }

  screen.querySelectorAll('.password-toggle').forEach((button) => button.addEventListener('click', () => {
    const input = button.parentElement.querySelector('input');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.classList.toggle('active', !visible);
    button.setAttribute('aria-label', visible ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
  }));
  screen.querySelector('.auth-switch button').addEventListener('click', onShowLogin);
  ['username', 'password', 'confirmPassword'].forEach((field) => {
    form.elements[field].addEventListener('blur', () => showErrors(validateRegistration(values()), field));
    form.elements[field].addEventListener('input', () => {
      screen.querySelector(`[data-error="${field}"]`).textContent = '';
      if (field === 'password' && form.elements.confirmPassword.value) showErrors(validateRegistration(values()), 'confirmPassword');
      generalError.textContent = '';
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errors = validateRegistration(values());
    showErrors(errors);
    if (Object.keys(errors).length) return;
    submitButton.disabled = true;
    submitButton.querySelector('span').textContent = 'ĐANG TẠO...';
    try {
      const result = await registerAccount(values());
      if (!result.ok) showErrors(result.errors);
      else onRegistered(result.user);
    } catch {
      generalError.textContent = 'Không thể tạo tài khoản lúc này. Vui lòng thử lại.';
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector('span').textContent = 'TẠO TÀI KHOẢN';
    }
  });
  queueMicrotask(() => form.elements.username.focus());
  return screen;
}

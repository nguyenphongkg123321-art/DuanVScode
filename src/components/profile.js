import { formatPlayTime, getData, saveProfile } from '../utils/storage.js';
import { escapeHtml } from './navbar.js';
import { sound } from '../utils/sound.js';

const avatars = ['neon', 'cyber', 'astro', 'ghost', 'robot'];

export function renderProfilePage(onSaved) {
  const data = getData();
  const page = document.createElement('section');
  page.className = 'page profile-page enter';
  page.innerHTML = `
    <div class="section-kicker">THÔNG TIN NGƯỜI CHƠI <span></span></div>
    <div class="page-heading"><div><h1>HỒ SƠ <span>CỦA BẠN</span></h1><p>Tùy chỉnh hình đại diện và theo dõi hành trình chơi game.</p></div></div>
    <div class="profile-grid">
      <form class="profile-editor glass">
        <div class="large-avatar avatar-${data.profile.avatar}" id="selected-avatar"><span>${escapeHtml(data.profile.username.slice(0, 1))}</span></div>
        <label for="username">TÊN TÀI KHOẢN</label>
        <input id="username" maxlength="20" value="${escapeHtml(data.profile.username)}" autocomplete="username" readonly />
        <small class="profile-account-note">Tên tài khoản được quản lý bởi thông tin đăng nhập.</small>
        <label>CHỌN HÌNH ĐẠI DIỆN</label>
        <div class="avatar-picker">
          ${avatars.map((avatar, index) => `<button type="button" class="avatar-option avatar-${avatar} ${avatar === data.profile.avatar ? 'selected' : ''}" data-avatar="${avatar}" aria-label="Hình đại diện ${index + 1}"><span>${['N','C','A','G','R'][index]}</span></button>`).join('')}
        </div>
        <button class="primary-button" type="submit">LƯU HỒ SƠ <span>✓</span></button>
        <p class="save-message" role="status"></p>
      </form>
      <div class="profile-stats">
        ${[
          ['◈', 'TỔNG SỐ TRẬN', data.profile.gamesPlayed],
          ['⌁', 'ĐIỂM CAO GAME RẮN', data.scores.snake.toLocaleString('vi-VN')],
          ['▦', 'ĐIỂM CAO XẾP KHỐI', data.scores.block.toLocaleString('vi-VN')],
          ['×', 'SỐ TRẬN CARO THẮNG', data.scores.caroX + data.scores.caroO],
          ['◷', 'THỜI GIAN ĐÃ CHƠI', formatPlayTime(data.profile.playTime)],
        ].map(([icon, label, value]) => `<article class="profile-stat glass"><i>${icon}</i><div><small>${label}</small><strong>${value}</strong></div></article>`).join('')}
      </div>
    </div>`;

  let selected = data.profile.avatar;
  page.querySelectorAll('.avatar-option').forEach((button) => button.addEventListener('click', () => {
    selected = button.dataset.avatar;
    page.querySelector('.avatar-option.selected')?.classList.remove('selected');
    button.classList.add('selected');
    page.querySelector('#selected-avatar').className = `large-avatar avatar-${selected}`;
    sound.click();
  }));
  page.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      await saveProfile({ avatar: selected });
      page.querySelector('.save-message').textContent = 'Đã lưu hồ sơ thành công.';
      sound.score();
      onSaved?.();
    } catch (error) {
      page.querySelector('.save-message').textContent = error.message || 'Không thể lưu hồ sơ.';
    } finally {
      submit.disabled = false;
    }
  });
  return page;
}

import { getData, saveSettings } from '../utils/storage.js';
import { MUSIC_TRACKS, sound } from '../utils/sound.js';

const icons = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  games: '<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v4M6 13h4m6-1h.01M18 14h.01"/>',
  leaderboard: '<path d="M8 21h8m-4-4v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
};

function svg(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
}

export function renderNavbar(activeRoute, navigate, onLogout) {
  const data = getData();
  const nav = document.createElement('header');
  nav.className = 'navbar glass';
  nav.innerHTML = `
    <button class="brand" data-route="home" aria-label="Kho Trò Chơi - Trang chủ">
      <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
      <span>KHO <b>TRÒ CHƠI</b></span>
    </button>
    <nav class="nav-links" aria-label="Điều hướng chính">
      ${[['home', 'Trang chủ'], ['games', 'Trò chơi'], ['leaderboard', 'Xếp hạng'], ['profile', 'Hồ sơ']].map(([route, label]) => `
        <button class="nav-link ${activeRoute === route ? 'active' : ''}" data-route="${route}">
          ${svg(route)}<span>${label}</span>
        </button>`).join('')}
    </nav>
    <div class="nav-actions">
      <div class="sound-popover">
        <button class="icon-button" id="sound-toggle" aria-label="Bật tắt âm thanh">${data.settings.soundEnabled ? '♪' : '×'}</button>
        <div class="sound-panel glass">
          <div class="sound-panel-title"><span>♫</span><div><strong>ĐÀI NHẠC TRÒ CHƠI</strong><small>NHẠC ĐIỆN TỬ NGUYÊN BẢN</small></div></div>
          <label for="music-track">BÀI NHẠC</label>
          <select id="music-track">
            ${['SÔI ĐỘNG', 'THƯ GIÃN'].map((group) => `<optgroup label="${group}">
              ${MUSIC_TRACKS.filter((track) => track.group === group).map((track) => `<option value="${track.id}" ${sound.track === track.id ? 'selected' : ''}>${track.name}</option>`).join('')}
            </optgroup>`).join('')}
          </select>
          <label for="volume-control">ÂM LƯỢNG <output>${Math.round(data.settings.volume * 100)}%</output></label>
          <input id="volume-control" class="volume-control" type="range" min="0" max="1" step="0.05" value="${data.settings.volume}" aria-label="Âm lượng" />
        </div>
      </div>
      <button class="icon-button" id="theme-toggle" aria-label="Đổi giao diện">${data.settings.theme === 'dark' ? '☼' : '☾'}</button>
      <button class="player-chip" data-route="profile">
        <span class="mini-avatar avatar-${data.profile.avatar}"></span>
        <span>${escapeHtml(data.profile.username)}</span>
      </button>
      <button class="logout-button" id="logout-button" aria-label="Đăng xuất"><span>ĐĂNG XUẤT</span> ↪</button>
      <button class="menu-toggle" aria-label="Mở menu"><span></span><span></span><span></span></button>
    </div>`;

  nav.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => { sound.click(); navigate(button.dataset.route); });
  });
  nav.querySelector('.menu-toggle').addEventListener('click', () => nav.classList.toggle('menu-open'));
  nav.querySelector('#logout-button').addEventListener('click', onLogout);
  nav.querySelector('#theme-toggle').addEventListener('click', (event) => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    event.currentTarget.textContent = next === 'dark' ? '☼' : '☾';
    saveSettings({ theme: next });
    sound.click();
  });
  nav.querySelector('#sound-toggle').addEventListener('click', (event) => {
    sound.setEnabled(!sound.enabled);
    event.currentTarget.textContent = sound.enabled ? '♪' : '×';
    if (sound.enabled) sound.click();
  });
  nav.querySelector('#music-track').addEventListener('change', (event) => {
    sound.setTrack(event.target.value);
    sound.click();
  });
  nav.querySelector('#volume-control').addEventListener('input', (event) => {
    sound.setVolume(event.target.value);
    nav.querySelector('.sound-panel output').textContent = `${Math.round(event.target.value * 100)}%`;
  });
  return nav;
}

export function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value ?? '';
  return element.innerHTML;
}

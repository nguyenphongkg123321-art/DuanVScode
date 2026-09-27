import './style.css';
import { escapeHtml, renderNavbar } from './components/navbar.js';
import { gameCard } from './components/gameCard.js';
import { renderLeaderboardPage } from './components/leaderboard.js';
import { renderProfilePage } from './components/profile.js';
import { createCaroGame } from './games/caro.js';
import { createSnakeGame } from './games/snake.js';
import { createBlockGame } from './games/block.js';
import { getData } from './utils/storage.js';
import { sound } from './utils/sound.js';
import { getCurrentUser, logoutAccount } from './auth/auth.js';
import { renderLogin } from './auth/login.js';
import { renderRegister } from './auth/register.js';

const app = document.querySelector('#app');
let currentGame = null;
let authNotice = '';

const gameInfo = [
  { id: 'caro', number: '01', category: 'CHIẾN THUẬT', title: 'CỜ CARO', description: 'Đấu trí với đối thủ. Xếp năm quân liên tiếp để chiến thắng.', scoreLabel: 'TỔNG TRẬN THẮNG', accent: 'pink' },
  { id: 'snake', number: '02', category: 'HÀNH ĐỘNG', title: 'RẮN TIẾN HÓA', description: 'Ăn táo, lớn dần và mở khóa những hình dạng rắn mới.', scoreLabel: 'ĐIỂM CAO NHẤT', accent: 'cyan' },
  { id: 'block', number: '03', category: 'XẾP HÌNH', title: 'XẾP KHỐI', description: 'Đặt khối thông minh, phá hàng và tạo chuỗi liên hoàn.', scoreLabel: 'ĐIỂM CAO NHẤT', accent: 'lime' },
];

function routeFromHash() {
  return location.hash.replace('#/', '') || 'home';
}

function navigate(route) {
  if (routeFromHash() === route) render();
  else location.hash = `/${route}`;
}

function scoreFor(id, data) {
  if (id === 'caro') return data.scores.caroX + data.scores.caroO;
  return data.scores[id];
}

function renderHome(gamesOnly = false) {
  const data = getData();
  const page = document.createElement('main');
  page.className = `page home-page enter ${gamesOnly ? 'games-page' : ''}`;
  if (!gamesOnly) {
    page.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><i></i> HỆ THỐNG SẴN SÀNG <span>CHƠI. TRANH TÀI. CHINH PHỤC.</span></div>
          <h1 class="hero-title">
            <span class="hero-title-line hero-title-game"><b>TRÒ CHƠI</b><em>CỦA BẠN</em></span>
            <span class="hero-title-line hero-title-arena"><b>ĐẤU TRƯỜNG</b><em>CỦA BẠN</em></span>
          </h1>
          <p>Ba trò chơi, thử thách bất tận và một nơi để bạn chứng minh kỹ năng.</p>
          <div class="hero-actions"><button class="primary-button" data-scroll-games>KHÁM PHÁ TRÒ CHƠI <span>↓</span></button><button class="text-button" data-route="leaderboard">XEM BẢNG XẾP HẠNG →</button></div>
        </div>
        <div class="hero-orbit" aria-hidden="true">
          <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit-core"><span>G</span></div>
          <span class="orbit-tag tag-one">03 TRÒ CHƠI</span><span class="orbit-tag tag-two">TRỰC TUYẾN</span><span class="orbit-tag tag-three">∞ LƯỢT CHƠI</span>
        </div>
      </section>
      <section class="player-overview glass">
        <div class="welcome"><span class="overview-avatar avatar-${data.profile.avatar}">${escapeHtml(data.profile.username.slice(0, 1))}</span><div><small>CHÀO MỪNG TRỞ LẠI</small><strong>${escapeHtml(data.profile.username)}</strong></div></div>
        <div class="overview-stat"><small>SỐ TRẬN ĐÃ CHƠI</small><strong>${data.profile.gamesPlayed}</strong></div>
        <div class="overview-stat"><small>ĐIỂM CAO NHẤT</small><strong>${Math.max(data.scores.snake, data.scores.block).toLocaleString('vi-VN')}</strong></div>
        <div class="overview-stat rank-stat"><small>TRẠNG THÁI</small><strong><i></i> ĐANG HOẠT ĐỘNG</strong></div>
      </section>`;
  }

  const gamesSection = document.createElement('section');
  gamesSection.className = 'games-section';
  gamesSection.id = 'games-list';
  gamesSection.innerHTML = `
    <div class="section-kicker">${gamesOnly ? 'KHO TRÒ CHƠI' : 'CHỌN THỬ THÁCH'} <span></span></div>
    <div class="section-heading"><h2>${gamesOnly ? 'TẤT CẢ ' : 'CHỌN '}<span>TRÒ CHƠI</span></h2><p>Chọn đấu trường và thiết lập kỷ lục mới.</p></div>
    <div class="game-grid"></div>`;
  const grid = gamesSection.querySelector('.game-grid');
  gameInfo.forEach((game) => grid.append(gameCard({ ...game, score: scoreFor(game.id, data) })));
  page.append(gamesSection);

  if (!gamesOnly) {
    const strip = document.createElement('section');
    strip.className = 'feature-strip';
    strip.innerHTML = '<span>KHÔNG CẦN TẢI</span><i>✦</i><span>CHƠI NGAY</span><i>✦</i><span>LƯU ĐIỂM CỤC BỘ</span><i>✦</i><span>HỖ TRỢ DI ĐỘNG</span>';
    page.append(strip);
  }

  page.querySelectorAll('[data-play]').forEach((button) => button.addEventListener('click', () => { sound.click(); navigate(`game/${button.dataset.play}`); }));
  page.querySelector('[data-scroll-games]')?.addEventListener('click', () => page.querySelector('#games-list').scrollIntoView({ behavior: 'smooth' }));
  page.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.route)));
  return page;
}

function renderFooter() {
  const footer = document.createElement('footer');
  footer.innerHTML = '<div class="footer-brand"><span class="brand-mark"><i></i><i></i><i></i><i></i></span> KHO <b>TRÒ CHƠI</b></div><p>ĐƯỢC TẠO CHO NGƯỜI CHƠI // VẬN HÀNH BẰNG JAVASCRIPT THUẦN</p><span>© 2026 KTC</span>';
  return footer;
}

function render() {
  currentGame?.destroy?.();
  currentGame = null;
  const route = routeFromHash();
  app.innerHTML = '';
  const currentUser = getCurrentUser();

  if (!currentUser) {
    if (route === 'register') {
      app.append(renderRegister({
        onRegistered: (user) => {
          authNotice = 'Tạo tài khoản thành công!';
          navigate('login');
        },
        onShowLogin: () => navigate('login'),
      }));
    } else {
      app.append(renderLogin({
        notice: authNotice,
        onLogin: () => {
          authNotice = '';
          navigate('home');
        },
        onShowRegister: () => {
          authNotice = '';
          navigate('register');
        },
      }));
    }
    return;
  }

  if (route === 'login' || route === 'register') {
    navigate('home');
    return;
  }

  const isGame = route.startsWith('game/');
  if (!isGame) app.append(renderNavbar(route, navigate, () => {
    sound.stopMusic();
    logoutAccount();
    authNotice = '';
    navigate('login');
  }));

  if (route === 'home') app.append(renderHome(false));
  else if (route === 'games') app.append(renderHome(true));
  else if (route === 'leaderboard') app.append(renderLeaderboardPage());
  else if (route === 'profile') app.append(renderProfilePage(render));
  else if (isGame) {
    const id = route.split('/')[1];
    const factories = { caro: createCaroGame, snake: createSnakeGame, block: createBlockGame };
    const factory = factories[id];
    if (factory) {
      currentGame = factory({ onBack: () => navigate('games') });
      app.append(currentGame.element);
    } else navigate('games');
  } else navigate('home');
  if (!isGame) app.append(renderFooter());
  window.scrollTo({ top: 0, behavior: 'instant' });
}

const settings = getData().settings;
document.documentElement.dataset.theme = settings.theme;
window.addEventListener('hashchange', render);
window.addEventListener('beforeunload', () => currentGame?.destroy?.());
document.addEventListener('pointerdown', () => {
  if (getCurrentUser()) sound.startMusic();
});
render();

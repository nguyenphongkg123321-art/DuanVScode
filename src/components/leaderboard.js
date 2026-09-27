import { getData } from '../utils/storage.js';
import { escapeHtml } from './navbar.js';

const GAME_LABELS = { CARO: 'CỜ CARO', SNAKE: 'RẮN', BLOCK: 'XẾP KHỐI' };
const FILTERS = [
  { value: 'ALL', label: 'TẤT CẢ' },
  { value: 'CARO', label: 'CỜ CARO' },
  { value: 'SNAKE', label: 'RẮN' },
  { value: 'BLOCK', label: 'XẾP KHỐI' },
];

export function renderLeaderboardPage() {
  const page = document.createElement('section');
  page.className = 'page leaderboard-page enter';
  page.innerHTML = `
    <div class="section-kicker">BẢNG VINH DANH <span></span></div>
    <div class="page-heading">
      <div><h1>BẢNG <span>XẾP HẠNG</span></h1><p>Những người chơi đang dẫn đầu đấu trường.</p></div>
      <div class="filter-tabs" role="tablist">
        ${FILTERS.map((tab) => `<button class="filter-tab ${tab.value === 'ALL' ? 'active' : ''}" data-filter="${tab.value}">${tab.label}</button>`).join('')}
      </div>
    </div>
    <div id="leaderboard-content"></div>`;

  const draw = (filter = 'ALL') => {
    const scores = getData().leaderboard
      .filter((entry) => filter === 'ALL' || entry.game === filter)
      .sort((a, b) => b.score - a.score);
    const content = page.querySelector('#leaderboard-content');
    content.innerHTML = `
      <div class="podium">
        ${scores.slice(0, 3).map((entry, index) => `<div class="podium-card rank-${index + 1}">
          <span class="rank-medal">${['Ⅰ', 'Ⅱ', 'Ⅲ'][index]}</span>
          <span class="podium-avatar">${escapeHtml(entry.player.slice(0, 1).toUpperCase())}</span>
          <strong>${escapeHtml(entry.player)}</strong><small>${GAME_LABELS[entry.game] || entry.game}</small><b>${Number(entry.score).toLocaleString('vi-VN')}</b>
        </div>`).join('')}
      </div>
      <div class="score-table glass">
        <div class="score-row score-header"><span>HẠNG</span><span>NGƯỜI CHƠI</span><span>TRÒ CHƠI</span><span>ĐIỂM</span><span>NGÀY</span></div>
        ${scores.map((entry, index) => `<div class="score-row"><span class="table-rank">#${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(entry.player)}</strong><span><i class="game-pill ${entry.game.toLowerCase()}">${GAME_LABELS[entry.game] || entry.game}</i></span><b>${Number(entry.score).toLocaleString('vi-VN')}</b><time>${new Date(`${entry.date}T00:00:00`).toLocaleDateString('vi-VN')}</time></div>`).join('') || '<div class="empty-state">Chưa có điểm ở chế độ này.</div>'}
      </div>`;
  };
  draw();
  page.querySelectorAll('.filter-tab').forEach((tab) => tab.addEventListener('click', () => {
    page.querySelector('.filter-tab.active')?.classList.remove('active');
    tab.classList.add('active');
    draw(tab.dataset.filter);
  }));
  return page;
}

const art = {
  caro: `<div class="caro-art"><span>×</span><span>○</span><span>×</span><span>○</span><span>×</span><span>○</span><span>×</span><span>○</span><span>×</span></div>`,
  snake: `<div class="snake-art"><i></i><i></i><i></i><i></i><i class="head"></i><b></b></div>`,
  block: `<div class="block-art"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>`,
};

export function gameCard({ id, number, category, title, description, scoreLabel, score, accent }) {
  const card = document.createElement('article');
  card.className = `game-card glass accent-${accent}`;
  card.innerHTML = `
    <div class="game-visual">
      <span class="game-number">${number}</span>
      <span class="game-category">${category}</span>
      ${art[id]}
      <div class="visual-glow"></div>
    </div>
    <div class="game-card-body">
      <div class="game-title-row"><h3>${title}</h3><span class="status-dot"><i></i> SẴN SÀNG</span></div>
      <p>${description}</p>
      <div class="card-footer">
        <div class="high-score"><small>${scoreLabel}</small><strong>${Number(score).toLocaleString('vi-VN')}</strong></div>
        <button class="play-button" data-play="${id}"><span>CHƠI NGAY</span><b>↗</b></button>
      </div>
    </div>`;
  return card;
}

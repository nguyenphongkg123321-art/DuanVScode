const art = {
  caro: `<div class="caro-art"><span>×</span><span>○</span><span>×</span><span>○</span><span>×</span><span>○</span><span>×</span><span>○</span><span>×</span></div>`,
  snake: `<svg class="snake-art" viewBox="0 0 230 150" aria-hidden="true">
    <defs>
      <linearGradient id="card-snake-skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b6d86a"/><stop offset=".48" stop-color="#59913f"/><stop offset="1" stop-color="#234d31"/></linearGradient>
      <radialGradient id="card-snake-head" cx="35%" cy="28%"><stop stop-color="#d8ed8e"/><stop offset=".5" stop-color="#659f48"/><stop offset="1" stop-color="#24482e"/></radialGradient>
      <radialGradient id="card-apple" cx="35%" cy="28%"><stop stop-color="#ff9fb1"/><stop offset=".4" stop-color="#ff426d"/><stop offset="1" stop-color="#9d1635"/></radialGradient>
      <filter id="card-snake-shadow"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-opacity=".65"/></filter>
    </defs>
    <path class="snake-card-shadow" d="M24 116C57 142 104 132 102 98C100 71 119 51 151 66C174 77 187 60 194 43"/>
    <path class="snake-card-body" d="M24 116C57 142 104 132 102 98C100 71 119 51 151 66C174 77 187 60 194 43"/>
    <path class="snake-card-spine" d="M24 116C57 142 104 132 102 98C100 71 119 51 151 66C174 77 187 60 194 43"/>
    <g class="snake-card-pattern">
      <path d="m57 128 8-7 8 6-8 6z"/><path d="m94 111 7-8 6 7-6 8z"/><path d="m108 77 7-6 7 7-8 6z"/><path d="m145 65 7-5 7 7-8 5z"/>
    </g>
    <path class="snake-card-head" d="M184 43c2-10 11-17 21-14 9 3 13 13 8 21-6 9-20 10-29 3-4-3-4-7 0-10Z"/>
    <circle class="snake-card-eye" cx="204" cy="36" r="2.3"/><circle class="snake-card-eye-glint" cx="203.3" cy="35.3" r=".7"/>
    <path class="snake-card-tongue" d="m212 45 10 1 5-3m-5 3 4 4"/>
    <circle class="snake-card-apple" cx="55" cy="44" r="12"/><path class="snake-card-stem" d="M55 33c0-7 3-10 7-12"/><path class="snake-card-leaf" d="M62 22c7-3 11 0 12 4-6 3-10 1-12-4Z"/>
  </svg>`,
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

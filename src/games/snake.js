import { addPlayTime, getData, recordResult } from '../utils/storage.js';
import { sound } from '../utils/sound.js';

const GRID = 26;
const SIZE = 702;
const CELL = SIZE / GRID;
const APPLES_PER_LEVEL = 3;
const SPEED_BY_LEVEL = [230, 215, 200, 185, 170, 155, 145, 135, 125];
const SNAKE_EVOLUTIONS = [
  { name: 'RẮN CỎ', edge: '#172617', flank: '#385527', body: '#66893b', ridge: '#86a94f', sheen: 'rgba(225,238,162,.16)', pattern: 'rgba(29,54,23,.72)', accent: 'rgba(205,222,127,.42)', headLight: '#b7ce72', headMid: '#6f943e', headDark: '#294421', eye: '#d4aa32' },
  { name: 'RẮN LỤC NGỌC', edge: '#092e24', flank: '#125943', body: '#23996c', ridge: '#54c790', sheen: 'rgba(190,255,221,.22)', pattern: 'rgba(5,64,46,.72)', accent: 'rgba(186,255,203,.55)', headLight: '#9aebaf', headMid: '#31a66e', headDark: '#0b4d38', eye: '#f1ca43' },
  { name: 'TRĂN HOÀNG KIM', edge: '#35230d', flank: '#674817', body: '#b4842c', ridge: '#ddb750', sheen: 'rgba(255,239,164,.24)', pattern: 'rgba(67,39,10,.76)', accent: 'rgba(255,232,126,.62)', headLight: '#ffe38a', headMid: '#bd8930', headDark: '#5c3d13', eye: '#ffdf55' },
  { name: 'RẮN SAN HÔ', edge: '#38141d', flank: '#6d2633', body: '#b84558', ridge: '#df6b70', sheen: 'rgba(255,210,178,.22)', pattern: 'rgba(60,15,25,.78)', accent: 'rgba(255,189,105,.62)', headLight: '#ffad83', headMid: '#c24b58', headDark: '#5e202d', eye: '#ffd25d' },
  { name: 'RẮN BẠCH NGỌC', edge: '#273048', flank: '#465479', body: '#7888b4', ridge: '#bac6e3', sheen: 'rgba(255,255,255,.32)', pattern: 'rgba(38,47,75,.7)', accent: 'rgba(232,242,255,.72)', headLight: '#f2f5ff', headMid: '#8d9bc1', headDark: '#3c486b', eye: '#82e9ff' },
  { name: 'RẮN THIÊN HÀ', edge: '#102d30', flank: '#175b5c', body: '#269c91', ridge: '#6ee3ce', sheen: 'rgba(216,255,247,.34)', pattern: 'rgba(29,25,71,.78)', accent: 'rgba(255,219,104,.78)', headLight: '#c8fff0', headMid: '#45b5a3', headDark: '#194e50', eye: '#ffe978' },
  { name: 'RẮN HẮC DIỆM', edge: '#16090d', flank: '#461522', body: '#882b3f', ridge: '#f14d5f', sheen: 'rgba(255,177,128,.3)', pattern: 'rgba(25,7,12,.84)', accent: 'rgba(255,126,58,.82)', headLight: '#ff9b68', headMid: '#a63245', headDark: '#3a101a', eye: '#ffbd45' },
  { name: 'RẮN BĂNG TINH', edge: '#10263c', flank: '#215779', body: '#4097b8', ridge: '#91e8f4', sheen: 'rgba(226,253,255,.4)', pattern: 'rgba(20,45,82,.8)', accent: 'rgba(213,250,255,.88)', headLight: '#d8fbff', headMid: '#5bb8d0', headDark: '#193f5c', eye: '#a7ffff' },
  { name: 'RẮN ĐẾ VƯƠNG', edge: '#1b0b2c', flank: '#442064', body: '#75409d', ridge: '#efc75e', sheen: 'rgba(255,239,170,.42)', pattern: 'rgba(34,13,54,.86)', accent: 'rgba(255,215,99,.94)', headLight: '#fff0a8', headMid: '#9560b4', headDark: '#351647', eye: '#ffe35d' },
];
const ARENA_DETAILS = Array.from({ length: 52 }, (_, index) => ({
  x: 14 + ((index * 137) % (SIZE - 28)),
  y: 14 + ((index * 83) % (SIZE - 28)),
  size: 2 + (index % 5),
  type: index % 4,
  rotation: (index * 47 % 360) * Math.PI / 180,
}));
const SOIL_TEXTURE = Array.from({ length: 190 }, (_, index) => ({
  x: 5 + ((index * 109) % (SIZE - 10)),
  y: 5 + ((index * 173) % (SIZE - 10)),
  size: .6 + (index % 5) * .38,
  type: index % 5,
  rotation: (index * 61 % 360) * Math.PI / 180,
}));

export function createSnakeGame({ onBack }) {
  const startedAt = Date.now();
  let snake;
  let direction;
  let nextDirection;
  let foods;
  let score;
  let level;
  let applesEaten;
  let loopId = null;
  let evolveTimer = null;
  let paused = false;
  let ended = false;
  let recorded = false;
  let pulse = 0;
  let swipeState = null;

  const root = document.createElement('section');
  root.className = 'game-shell snake-game enter';
  root.innerHTML = `
    <div class="game-topbar">
      <button class="back-button">← <span>VỀ KHO TRÒ CHƠI</span></button>
      <div class="game-label"><i></i> RẮN // KHU SINH CẢNH</div>
      <button class="restart-icon" aria-label="Chơi lại">↻</button>
    </div>
    <div class="game-layout snake-layout">
      <aside class="game-sidebar glass snake-stats">
        <div class="snake-panel-head"><div><span class="habitat-dot"></span><small>MÔI TRƯỜNG HOANG DÃ</small></div><b>HOẠT ĐỘNG</b></div>
        <div class="stat-display"><small>ĐIỂM HIỆN TẠI</small><strong id="snake-score">0000</strong><span>ĐIỂM</span><em id="snake-form">RẮN CỎ</em></div>
        <div class="stat-pair"><div><small>ĐIỂM CAO NHẤT</small><strong id="snake-high">0</strong></div><div><small>CẤP ĐỘ</small><strong id="snake-level">1</strong></div></div>
        <div class="level-progress"><div><span>TIẾN HÓA</span><small id="snake-next-level">3 QUẢ TÁO NỮA</small></div><span class="level-track"><i id="snake-level-progress"></i></span></div>
        <div class="controls-help"><strong>DI CHUYỂN</strong><div><kbd>W</kbd><br><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><p>Phím WASD · Phím mũi tên · Nút cảm ứng</p></div>
        <button class="secondary-button pause-button" aria-pressed="false">Ⅱ TẠM DỪNG</button>
        <button class="secondary-button restart-button">↻ CHƠI LẠI</button>
      </aside>
      <div class="canvas-frame glass">
        <div class="habitat-topline"><span><i></i> KHU NUÔI ĐANG HOẠT ĐỘNG</span><b id="snake-position">X10 · Y13</b></div>
        <canvas width="702" height="702" aria-label="Sân chơi game Rắn"></canvas>
        <div class="evolution-toast"><small>ĐÃ MỞ KHÓA TIẾN HÓA</small><strong id="evolution-name">RẮN LỤC NGỌC</strong></div>
        <div class="snake-pause-overlay"><small>TRÒ CHƠI ĐANG TẠM DỪNG</small><strong>NGHỈ MỘT CHÚT</strong><span>Nhấn phím cách hoặc nút Tiếp tục để chơi</span></div>
        <div class="canvas-overlay"><small>LƯỢT CHƠI KẾT THÚC</small><strong>TRÒ CHƠI KẾT THÚC</strong><span>Điểm <b>0</b></span><button>CHƠI LẠI</button></div>
        <div class="habitat-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="touch-controls glass" aria-label="Điều khiển cảm ứng">
        <div class="touch-controls-heading"><div><strong>ĐIỀU KHIỂN</strong><small>Vuốt trên sân hoặc dùng bàn phím</small></div><span>CHẠM NHẸ</span></div>
        <div class="touch-controls-body">
          <div class="mobile-dpad" role="group" aria-label="Chọn hướng di chuyển">
            <button data-dir="up" aria-label="Đi lên"><span>▲</span></button>
            <button data-dir="left" aria-label="Sang trái"><span>◀</span></button>
            <i class="dpad-center" aria-hidden="true"><b></b></i>
            <button data-dir="right" aria-label="Sang phải"><span>▶</span></button>
            <button data-dir="down" aria-label="Đi xuống"><span>▼</span></button>
          </div>
          <div class="mobile-game-actions">
            <button class="pause-button" aria-pressed="false"><span>Ⅱ</span>TẠM DỪNG</button>
            <button class="restart-button"><span>↻</span>CHƠI LẠI</button>
          </div>
        </div>
      </div>
    </div>
    `;

  const canvas = root.querySelector('canvas');
  const context = canvas.getContext('2d');
  const overlay = root.querySelector('.canvas-overlay');
  const pauseButtons = [...root.querySelectorAll('.pause-button')];

  function randomFood(existingFoods = []) {
    let next;
    do {
      next = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (
      snake.some((part) => part.x === next.x && part.y === next.y)
      || existingFoods.some((item) => item.x === next.x && item.y === next.y)
    );
    return next;
  }

  function draw() {
    const arena = context.createLinearGradient(0, 0, SIZE, SIZE);
    arena.addColorStop(0, '#493721');
    arena.addColorStop(0.42, '#332517');
    arena.addColorStop(1, '#1c140d');
    context.fillStyle = arena;
    context.fillRect(0, 0, SIZE, SIZE);

    const warmSoil = context.createRadialGradient(SIZE * .25, SIZE * .22, 10, SIZE * .25, SIZE * .22, SIZE * .55);
    warmSoil.addColorStop(0, 'rgba(132, 95, 49, .2)');
    warmSoil.addColorStop(.62, 'rgba(75, 51, 27, .08)');
    warmSoil.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = warmSoil;
    context.fillRect(0, 0, SIZE, SIZE);

    const dampSoil = context.createRadialGradient(SIZE * .74, SIZE * .68, 8, SIZE * .74, SIZE * .68, SIZE * .5);
    dampSoil.addColorStop(0, 'rgba(20, 34, 18, .24)');
    dampSoil.addColorStop(.7, 'rgba(31, 25, 16, .08)');
    dampSoil.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = dampSoil;
    context.fillRect(0, 0, SIZE, SIZE);

    drawSoilTexture();

    const arenaGlow = context.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * .1, SIZE / 2, SIZE / 2, SIZE * .7);
    arenaGlow.addColorStop(0, 'rgba(155, 123, 70, .07)');
    arenaGlow.addColorStop(.72, 'rgba(0, 0, 0, 0)');
    arenaGlow.addColorStop(1, 'rgba(0, 0, 0, .54)');
    context.fillStyle = arenaGlow;
    context.fillRect(0, 0, SIZE, SIZE);
    drawArenaDetails();

    pulse += 0.12;
    foods.forEach((item, index) => drawApple(item, index));

    drawRealisticSnake();

    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(158,121,73,.38)'; context.lineWidth = 2;
    context.strokeRect(1, 1, SIZE - 2, SIZE - 2);
  }

  function drawSoilTexture() {
    context.save();
    SOIL_TEXTURE.forEach((grain) => {
      context.save();
      context.translate(grain.x, grain.y);
      context.rotate(grain.rotation);
      if (grain.type <= 1) {
        context.fillStyle = grain.type === 0 ? 'rgba(202,159,91,.12)' : 'rgba(24,17,11,.22)';
        context.beginPath(); context.ellipse(0, 0, grain.size * 1.5, grain.size, 0, 0, Math.PI * 2); context.fill();
      } else if (grain.type === 2) {
        context.strokeStyle = 'rgba(111,79,42,.2)'; context.lineWidth = .7;
        context.beginPath(); context.moveTo(-grain.size * 2.5, 0); context.quadraticCurveTo(0, -grain.size, grain.size * 2.5, 0); context.stroke();
      } else if (grain.type === 3) {
        context.fillStyle = 'rgba(118,91,56,.14)';
        context.beginPath(); context.arc(0, 0, grain.size * 1.2, 0, Math.PI * 2); context.fill();
      } else {
        context.strokeStyle = 'rgba(58,42,25,.2)'; context.lineWidth = .8;
        context.beginPath(); context.moveTo(-grain.size * 2, 0); context.lineTo(grain.size * 2, 0); context.stroke();
      }
      context.restore();
    });
    context.restore();
  }

  function drawApple(item, index) {
    const foodScale = 0.78 + Math.sin(pulse + index * 1.7) * 0.06;
    const foodX = item.x * CELL + CELL / 2;
    const foodY = item.y * CELL + CELL / 2;
    context.save();
    context.translate(foodX, foodY);
    context.scale(foodScale, foodScale);
    context.shadowColor = '#ff315f'; context.shadowBlur = 22;
    const apple = context.createRadialGradient(-5, -6, 2, 0, 1, CELL * .6);
    apple.addColorStop(0, '#ffadbd');
    apple.addColorStop(.22, '#ff426d');
    apple.addColorStop(1, '#9f1239');
    context.fillStyle = apple;
    context.beginPath();
    context.moveTo(0, 10);
    context.bezierCurveTo(-11, 9, -13, -7, -5, -9);
    context.bezierCurveTo(-2, -10, 0, -8, 0, -7);
    context.bezierCurveTo(3, -10, 11, -9, 12, -2);
    context.bezierCurveTo(13, 6, 7, 11, 0, 10);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = '#7b4929'; context.lineWidth = 2.2;
    context.beginPath(); context.moveTo(0, -7); context.quadraticCurveTo(0, -13, 4, -15); context.stroke();
    context.save(); context.translate(5, -13); context.rotate(-.45); context.fillStyle = '#74e06f';
    context.beginPath(); context.ellipse(3, 0, 5, 2.5, 0, 0, Math.PI * 2); context.fill(); context.restore();
    context.restore();
  }

  function drawArenaDetails() {
    context.save();
    ARENA_DETAILS.forEach((detail) => {
      context.save();
      context.translate(detail.x, detail.y);
      context.rotate(detail.rotation);
      if (detail.type === 0) {
        context.fillStyle = 'rgba(118,105,82,.38)';
        context.beginPath(); context.ellipse(0, 0, detail.size * 1.4, detail.size, 0, 0, Math.PI * 2); context.fill();
        context.strokeStyle = 'rgba(205,184,145,.18)'; context.lineWidth = .7; context.stroke();
      } else if (detail.type === 1) {
        context.strokeStyle = 'rgba(104,151,69,.38)'; context.lineWidth = 1.2;
        for (const offset of [-2, 0, 2]) {
          context.beginPath(); context.moveTo(offset, 3); context.quadraticCurveTo(offset - 1, -2, offset + (offset ? 1 : 0), -detail.size * 2); context.stroke();
        }
      } else if (detail.type === 2) {
        context.fillStyle = 'rgba(111,91,48,.28)';
        context.beginPath(); context.ellipse(0, 0, detail.size * 1.8, detail.size * .65, 0, 0, Math.PI * 2); context.fill();
        context.strokeStyle = 'rgba(189,144,76,.2)'; context.beginPath(); context.moveTo(-detail.size, 0); context.lineTo(detail.size, 0); context.stroke();
      } else {
        context.fillStyle = 'rgba(43,31,19,.3)';
        context.beginPath(); context.arc(0, 0, detail.size * .8, 0, Math.PI * 2); context.fill();
      }
      context.restore();
    });
    context.restore();
  }

  function drawRealisticSnake() {
    const points = snake.map((part) => ({
      x: part.x * CELL + CELL / 2,
      y: part.y * CELL + CELL / 2,
    }));
    if (!points.length) return;
    const evolution = SNAKE_EVOLUTIONS[Math.min(level - 1, SNAKE_EVOLUTIONS.length - 1)];

    drawTaperedTail(points, evolution);
    drawEvolutionAura(points, evolution);
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Deep contact shadow keeps the snake grounded without a neon outline.
    traceSnakeBody(points);
    context.strokeStyle = evolution.edge;
    context.lineWidth = CELL * .92;
    context.shadowColor = 'rgba(0,0,0,.78)';
    context.shadowBlur = 14;
    context.shadowOffsetY = 7;
    context.stroke();

    // Layered strokes simulate a rounded body with darker flanks.
    traceSnakeBody(points);
    context.strokeStyle = evolution.flank;
    context.lineWidth = CELL * .82;
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.stroke();

    traceSnakeBody(points);
    context.strokeStyle = evolution.body;
    context.lineWidth = CELL * .69;
    context.stroke();

    traceSnakeBody(points);
    context.strokeStyle = evolution.ridge;
    context.lineWidth = CELL * .48;
    context.stroke();

    traceSnakeBody(points);
    context.strokeStyle = evolution.sheen;
    context.lineWidth = CELL * .13;
    context.stroke();
    context.restore();

    drawScalePattern(points, evolution);
    drawDorsalCrest(points, evolution);
    drawSnakeHead(points[0], evolution);
  }

  function drawEvolutionAura(points, evolution) {
    if (level < 3) return;
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalAlpha = .06 + level * .012;
    context.strokeStyle = evolution.ridge;
    context.lineWidth = CELL * (.92 + level * .012);
    context.shadowColor = evolution.headLight;
    context.shadowBlur = 10 + level * 2;
    traceSnakeBody(points);
    context.stroke();
    context.restore();
  }

  function traceSnakeBody(points) {
    const tailIndex = points.length - 1;
    context.beginPath();
    context.moveTo(points[tailIndex].x, points[tailIndex].y);
    if (points.length === 1) return;
    for (let index = tailIndex - 1; index > 0; index -= 1) {
      const current = points[index];
      const next = points[index - 1];
      context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    context.quadraticCurveTo(points[0].x, points[0].y, points[0].x, points[0].y);
  }

  function drawTaperedTail(points, evolution) {
    if (points.length < 2) return;
    const tail = points.at(-1);
    const beforeTail = points.at(-2);
    const angle = Math.atan2(tail.y - beforeTail.y, tail.x - beforeTail.x);
    const tipX = tail.x + Math.cos(angle) * 18;
    const tipY = tail.y + Math.sin(angle) * 18;
    const sideX = Math.cos(angle + Math.PI / 2) * 8;
    const sideY = Math.sin(angle + Math.PI / 2) * 8;
    context.save();
    const tailSkin = context.createLinearGradient(tail.x, tail.y, tipX, tipY);
    tailSkin.addColorStop(0, evolution.body);
    tailSkin.addColorStop(.55, evolution.flank);
    tailSkin.addColorStop(1, evolution.edge);
    context.fillStyle = tailSkin;
    context.strokeStyle = evolution.edge; context.lineWidth = 2;
    context.shadowColor = 'rgba(0,0,0,.62)'; context.shadowBlur = 9; context.shadowOffsetY = 5;
    context.beginPath();
    context.moveTo(tail.x + sideX, tail.y + sideY);
    context.lineTo(tipX, tipY);
    context.lineTo(tail.x - sideX, tail.y - sideY);
    context.closePath(); context.fill(); context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = evolution.sheen; context.lineWidth = 1.2;
    context.beginPath(); context.moveTo(tail.x, tail.y); context.lineTo(tipX - Math.cos(angle) * 3, tipY - Math.sin(angle) * 3); context.stroke();
    context.restore();
  }

  function drawScalePattern(points, evolution) {
    context.save();
    for (let index = 1; index < points.length; index += 1) {
      const front = points[index - 1];
      const back = points[index];
      const angle = Math.atan2(front.y - back.y, front.x - back.x);
      const x = (front.x + back.x) / 2;
      const y = (front.y + back.y) / 2;
      const tailFade = Math.max(.38, 1 - index / Math.max(points.length, 7) * .58);

      context.save();
      context.translate(x, y);
      context.rotate(angle);

      // One broad saddle per body section reads cleanly even while turning.
      if (index % 2 === 0) {
        context.fillStyle = evolution.pattern;
        context.strokeStyle = evolution.sheen;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(7.4 * tailFade, 0);
        context.bezierCurveTo(3.5, -5.7 * tailFade, -3.8, -5.7 * tailFade, -7.2 * tailFade, 0);
        context.bezierCurveTo(-3.8, 5.7 * tailFade, 3.5, 5.7 * tailFade, 7.4 * tailFade, 0);
        context.fill(); context.stroke();

        context.fillStyle = evolution.accent;
        context.beginPath(); context.ellipse(0, 0, 2.8 * tailFade, 1.5 * tailFade, 0, 0, Math.PI * 2); context.fill();
      } else {
        context.fillStyle = evolution.pattern;
        context.beginPath(); context.ellipse(0, -4.4 * tailFade, 3.8 * tailFade, 2.1 * tailFade, -.25, 0, Math.PI * 2); context.fill();
        context.beginPath(); context.ellipse(0, 4.4 * tailFade, 3.8 * tailFade, 2.1 * tailFade, .25, 0, Math.PI * 2); context.fill();
      }

      // A few restrained scale seams add skin texture without visual clutter.
      context.strokeStyle = evolution.sheen;
      context.lineWidth = .65;
      for (const offset of [-5, 5]) {
        context.beginPath();
        context.arc(-1, offset * tailFade, 3.3 * tailFade, -.95, .95);
        context.stroke();
      }
      context.restore();
    }
    context.restore();
  }

  function drawDorsalCrest(points, evolution) {
    if (level < 2 || points.length < 3) return;
    context.save();
    for (let index = 2; index < points.length; index += level >= 4 ? 2 : 3) {
      const front = points[index - 1];
      const back = points[index];
      const x = (front.x + back.x) / 2;
      const y = (front.y + back.y) / 2;
      const angle = Math.atan2(front.y - back.y, front.x - back.x);
      const tailFade = Math.max(.4, 1 - index / Math.max(points.length, 8) * .55);
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.shadowColor = evolution.headLight;
      context.shadowBlur = level >= 5 ? 8 : 0;
      context.fillStyle = evolution.edge;
      context.strokeStyle = evolution.accent;
      context.lineWidth = .8;
      context.beginPath();
      context.moveTo(5.2 * tailFade, 0);
      context.lineTo(-1.5 * tailFade, -3.4 * tailFade);
      context.lineTo(-4.5 * tailFade, 0);
      context.lineTo(-1.5 * tailFade, 3.4 * tailFade);
      context.closePath();
      context.fill(); context.stroke();
      context.restore();
    }
    context.restore();
  }

  function drawSnakeHead(head, evolution) {
    const angle = Math.atan2(direction.y, direction.x);
    context.save();
    context.translate(head.x, head.y);
    context.rotate(angle);
    context.scale(1 + Math.sin(pulse * .45) * .006, 1);
    context.shadowColor = 'rgba(0,0,0,.72)'; context.shadowBlur = 12; context.shadowOffsetY = 6;
    const headSkin = context.createRadialGradient(5, -6, 1, -3, 0, 23);
    headSkin.addColorStop(0, evolution.headLight);
    headSkin.addColorStop(.35, evolution.headMid);
    headSkin.addColorStop(.72, evolution.body);
    headSkin.addColorStop(1, evolution.headDark);
    context.fillStyle = headSkin;
    context.strokeStyle = evolution.edge; context.lineWidth = 2.3;
    context.beginPath();
    context.moveTo(17, 0);
    context.bezierCurveTo(16, -5.5, 11, -7, 5, -8);
    context.bezierCurveTo(0, -11.8, -8, -12.5, -14.5, -7.2);
    context.quadraticCurveTo(-17, 0, -14.5, 7.2);
    context.bezierCurveTo(-8, 12.5, 0, 11.8, 5, 8);
    context.bezierCurveTo(11, 7, 16, 5.5, 17, 0);
    context.fill(); context.shadowBlur = 0; context.stroke();

    // Large symmetrical head plates look more natural than scattered dots.
    context.fillStyle = evolution.pattern;
    context.beginPath(); context.moveTo(-11, 0); context.lineTo(-4, -7.5); context.lineTo(3, 0); context.lineTo(-4, 7.5); context.closePath(); context.fill();
    context.fillStyle = evolution.accent;
    context.beginPath(); context.moveTo(1, 0); context.lineTo(7, -4.7); context.lineTo(12, 0); context.lineTo(7, 4.7); context.closePath(); context.fill();
    context.strokeStyle = evolution.sheen; context.lineWidth = .8;
    context.beginPath(); context.moveTo(-12, 0); context.lineTo(-4, -7.5); context.lineTo(3, 0); context.lineTo(-4, 7.5); context.closePath(); context.stroke();

    for (const side of [-1, 1]) {
      context.fillStyle = '#1b2b18';
      context.beginPath(); context.ellipse(3.5, side * 7.1, 4.2, 3.15, 0, 0, Math.PI * 2); context.fill();
      const iris = context.createRadialGradient(4.5, side * 7, .3, 4, side * 7, 2.7);
      iris.addColorStop(0, '#fff1a1');
      iris.addColorStop(.5, evolution.eye);
      iris.addColorStop(1, '#69500e');
      context.fillStyle = iris;
      context.shadowColor = evolution.eye;
      context.shadowBlur = 3 + level * 1.2;
      context.beginPath(); context.ellipse(4.2, side * 7.15, 2.65, 2.35, 0, 0, Math.PI * 2); context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#030503';
      context.beginPath(); context.ellipse(4.8, side * 7.15, .66, 2.12, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = 'rgba(255,255,255,.88)';
      context.beginPath(); context.arc(3.55, side * 6.55, .55, 0, Math.PI * 2); context.fill();

      context.strokeStyle = evolution.edge;
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-1.5, side * 9.4);
      context.quadraticCurveTo(4, side * 10.2, 8.2, side * 7.9);
      context.stroke();
    }

    if (level >= 4) {
      for (const side of [-1, 1]) {
        context.fillStyle = evolution.headDark;
        context.strokeStyle = evolution.accent;
        context.lineWidth = .7;
        context.beginPath();
        context.moveTo(-3.5, side * 10.2);
        context.lineTo(-7.5, side * (14 + Math.min(level, 6) * .35));
        context.lineTo(1, side * 10.1);
        context.closePath();
        context.fill(); context.stroke();
      }
    }

    if (level >= 3) {
      context.strokeStyle = evolution.accent;
      context.lineWidth = 1.1;
      context.shadowColor = evolution.headLight;
      context.shadowBlur = level >= 5 ? 6 : 0;
      context.beginPath();
      context.moveTo(-9, 0);
      context.lineTo(-3, -3.4);
      context.lineTo(3, 0);
      context.lineTo(-3, 3.4);
      context.closePath();
      context.stroke();
      context.shadowBlur = 0;
    }

    context.fillStyle = '#10180e';
    for (const side of [-1, 1]) {
      context.beginPath(); context.ellipse(12.7, side * 2.35, .9, .62, 0, 0, Math.PI * 2); context.fill();
    }

    context.strokeStyle = 'rgba(17, 28, 14, .58)'; context.lineWidth = 1;
    context.beginPath(); context.moveTo(15.2, -1); context.quadraticCurveTo(11, -5.2, 7, -6.2); context.stroke();
    context.beginPath(); context.moveTo(15.2, 1); context.quadraticCurveTo(11, 5.2, 7, 6.2); context.stroke();

    if (Math.sin(pulse * 2.1) > .35) {
      context.strokeStyle = '#e24d72'; context.lineWidth = 1.35; context.lineCap = 'round';
      context.beginPath(); context.moveTo(16, 0); context.quadraticCurveTo(22, .8, 26, 0); context.lineTo(30.5, -2.8); context.moveTo(26, 0); context.lineTo(30.5, 2.8); context.stroke();
    }
    context.restore();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  }

  function scheduleLoop() {
    clearInterval(loopId);
    const speed = SPEED_BY_LEVEL[Math.min(level - 1, SPEED_BY_LEVEL.length - 1)];
    loopId = setInterval(tick, speed);
  }

  function showEvolution() {
    clearTimeout(evolveTimer);
    const evolution = SNAKE_EVOLUTIONS[level - 1];
    const toast = root.querySelector('.evolution-toast');
    root.querySelector('#evolution-name').textContent = evolution.name;
    toast.classList.remove('show');
    canvas.classList.remove('snake-evolve');
    void toast.offsetWidth;
    toast.classList.add('show');
    canvas.classList.add('snake-evolve');
    evolveTimer = setTimeout(() => {
      toast.classList.remove('show');
      canvas.classList.remove('snake-evolve');
    }, 1800);
  }

  function updateStats() {
    const evolution = SNAKE_EVOLUTIONS[level - 1];
    const isMaxLevel = level === SNAKE_EVOLUTIONS.length;
    const applesIntoLevel = applesEaten % APPLES_PER_LEVEL;
    root.querySelector('#snake-score').textContent = String(score).padStart(4, '0');
    root.querySelector('#snake-high').textContent = Math.max(score, getData().scores.snake);
    root.querySelector('#snake-level').textContent = level;
    root.querySelector('#snake-form').textContent = evolution.name;
    root.style.setProperty('--snake-form-color', evolution.ridge);
    root.style.setProperty('--snake-form-glow', evolution.headLight);
    root.querySelector('#snake-level-progress').style.width = isMaxLevel ? '100%' : `${applesIntoLevel / APPLES_PER_LEVEL * 100}%`;
    root.querySelector('#snake-next-level').textContent = isMaxLevel ? 'TIẾN HÓA TỐI ĐA' : `CÒN ${APPLES_PER_LEVEL - applesIntoLevel} QUẢ TÁO`;
    if (snake?.[0]) root.querySelector('#snake-position').textContent = `X${String(snake[0].x).padStart(2, '0')} · Y${String(snake[0].y).padStart(2, '0')}`;
  }

  function tick() {
    if (paused || ended) return;
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
    const eatenFoodIndex = foods.findIndex((item) => head.x === item.x && head.y === item.y);
    const grows = eatenFoodIndex !== -1;
    const bodyToCheck = grows ? snake : snake.slice(0, -1);
    const hitSelf = bodyToCheck.some((part) => part.x === head.x && part.y === head.y);
    if (hitWall || hitSelf) return gameOver();
    snake.unshift(head);
    if (grows) {
      score += 10 * level;
      applesEaten += 1;
      const nextLevel = Math.min(Math.floor(applesEaten / APPLES_PER_LEVEL) + 1, SNAKE_EVOLUTIONS.length);
      const remainingFoods = foods.filter((_, index) => index !== eatenFoodIndex);
      foods[eatenFoodIndex] = randomFood(remainingFoods);
      sound.score();
      if (nextLevel !== level) {
        level = nextLevel;
        showEvolution();
        scheduleLoop();
      }
      canvas.classList.remove('food-pop');
      void canvas.offsetWidth;
      canvas.classList.add('food-pop');
    } else snake.pop();
    updateStats();
    draw();
  }

  function gameOver() {
    ended = true;
    clearInterval(loopId);
    root.querySelector('.snake-pause-overlay').classList.remove('visible');
    if (!recorded) { recordResult('SNAKE', score); recorded = true; }
    overlay.querySelector('b').textContent = score;
    overlay.classList.add('visible');
    updateStats();
    sound.gameOver();
  }

  function restart() {
    clearInterval(loopId);
    clearTimeout(evolveTimer);
    snake = [{ x: 10, y: 13 }, { x: 9, y: 13 }, { x: 8, y: 13 }];
    direction = { x: 1, y: 0 };
    nextDirection = { ...direction };
    foods = [];
    const foodCount = 2 + Math.floor(Math.random() * 2);
    for (let index = 0; index < foodCount; index += 1) foods.push(randomFood(foods));
    score = 0;
    level = 1;
    applesEaten = 0;
    paused = false;
    ended = false;
    recorded = false;
    pauseButtons.forEach((button, index) => {
      button.innerHTML = index === 0 ? 'Ⅱ TẠM DỪNG' : '<span>Ⅱ</span>TẠM DỪNG';
      button.setAttribute('aria-pressed', 'false');
    });
    root.querySelector('.snake-pause-overlay').classList.remove('visible');
    root.querySelector('.evolution-toast').classList.remove('show');
    canvas.classList.remove('snake-evolve');
    overlay.classList.remove('visible');
    updateStats(); draw(); scheduleLoop();
  }

  function setDirection(name) {
    const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const candidate = directions[name];
    if (!candidate || candidate.x + direction.x === 0 && candidate.y + direction.y === 0) return;
    nextDirection = candidate;
  }

  function vibrate(duration = 9) {
    navigator.vibrate?.(duration);
  }

  function handleSwipeStart(event) {
    if (event.pointerType === 'mouse' || ended || paused) return;
    swipeState = { id: event.pointerId, x: event.clientX, y: event.clientY, handled: false };
    canvas.setPointerCapture?.(event.pointerId);
  }

  function handleSwipeMove(event) {
    if (!swipeState || swipeState.id !== event.pointerId || swipeState.handled) return;
    const deltaX = event.clientX - swipeState.x;
    const deltaY = event.clientY - swipeState.y;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 20) return;
    const swipeDirection = Math.abs(deltaX) > Math.abs(deltaY)
      ? (deltaX > 0 ? 'right' : 'left')
      : (deltaY > 0 ? 'down' : 'up');
    setDirection(swipeDirection);
    swipeState.handled = true;
    vibrate();
  }

  function handleSwipeEnd(event) {
    if (swipeState?.id === event.pointerId) swipeState = null;
  }

  function handleKey(event) {
    const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keys[event.key]) { event.preventDefault(); setDirection(keys[event.key]); }
    if (event.key === ' ') { event.preventDefault(); togglePause(); }
  }

  function togglePause() {
    if (ended) return;
    paused = !paused;
    pauseButtons.forEach((button, index) => {
      const icon = paused ? '▶' : 'Ⅱ';
      const label = paused ? 'TIẾP TỤC' : 'TẠM DỪNG';
      button.innerHTML = index === 0 ? `${icon} ${label}` : `<span>${icon}</span>${label}`;
      button.setAttribute('aria-pressed', String(paused));
    });
    root.querySelector('.snake-pause-overlay').classList.toggle('visible', paused);
    sound.click();
  }

  window.addEventListener('keydown', handleKey);
  canvas.addEventListener('pointerdown', handleSwipeStart);
  canvas.addEventListener('pointermove', handleSwipeMove);
  canvas.addEventListener('pointerup', handleSwipeEnd);
  canvas.addEventListener('pointercancel', handleSwipeEnd);
  root.querySelectorAll('[data-dir]').forEach((button) => button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    setDirection(button.dataset.dir);
    vibrate();
  }));
  root.querySelectorAll('.restart-button, .restart-icon').forEach((button) => button.addEventListener('click', restart));
  root.querySelector('.back-button').addEventListener('click', onBack);
  root.querySelector('.canvas-overlay button').addEventListener('click', restart);
  pauseButtons.forEach((button) => button.addEventListener('click', togglePause));
  restart();

  return {
    element: root,
    destroy() {
      clearInterval(loopId);
      clearTimeout(evolveTimer);
      window.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('pointerdown', handleSwipeStart);
      canvas.removeEventListener('pointermove', handleSwipeMove);
      canvas.removeEventListener('pointerup', handleSwipeEnd);
      canvas.removeEventListener('pointercancel', handleSwipeEnd);
      addPlayTime((Date.now() - startedAt) / 1000);
    },
  };
}

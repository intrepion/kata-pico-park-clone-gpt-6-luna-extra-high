(() => {
  'use strict';

  const WIDTH = 960;
  const HEIGHT = 540;
  const FLOOR = 480;
  const GRAVITY = 0.62;
  const JUMP_SPEED = -13.4;
  const SPEED = 3.5;
  const PLAYER_COLORS = ['#61d5ae', '#f4c75d', '#fa817f', '#81adf7'];
  const PLAYER_DARKS = ['#287e68', '#a97936', '#a84f60', '#4c6eaa'];
  const CONTROL_MAP = [
    { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], label: 'A / D', jumpLabel: 'W / Space' },
    { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], label: '← / →', jumpLabel: '↑' },
    { left: ['KeyJ'], right: ['KeyL'], jump: ['KeyI'], label: 'J / L', jumpLabel: 'I' },
    { left: ['KeyF'], right: ['KeyH'], jump: ['KeyT'], label: 'F / H', jumpLabel: 'T' },
  ];
  const LEVELS = [
    {
      name: 'Sunny Side Up',
      overline: 'ROOM 01  /  FIND THE KEY',
      objective: 'Find the key, then bring everyone to the door.',
      platforms: [
        { x: 0, y: FLOOR, w: WIDTH, h: 60, kind: 'ground' },
        { x: 220, y: 403, w: 150, h: 17 },
        { x: 432, y: 346, w: 150, h: 17 },
        { x: 645, y: 403, w: 142, h: 17 },
      ],
      key: { x: 494, y: 305 },
      switches: [],
      gate: null,
      exit: { x: 872, y: 400, w: 54, h: 80 },
      spawn: [80, 120, 160, 200],
      scenery: 'meadow',
    },
    {
      name: 'Hold That Thought',
      overline: 'ROOM 02  /  STAY TOGETHER',
      objective: 'Hold the switch so a teammate can reach the key.',
      platforms: [
        { x: 0, y: FLOOR, w: WIDTH, h: 60, kind: 'ground' },
        { x: 184, y: 407, w: 126, h: 17 },
        { x: 373, y: 365, w: 140, h: 17 },
        { x: 535, y: 407, w: 90, h: 17 },
        { x: 755, y: 404, w: 115, h: 17 },
      ],
      key: { x: 817, y: 439 },
      switches: [{ x: 518, y: 468, w: 62, h: 12, label: 'HOLD' }],
      gate: { x: 683, y: 250, w: 22, h: 230, open: false, latched: false },
      exit: { x: 891, y: 400, w: 48, h: 80 },
      spawn: [72, 112, 152, 192],
      scenery: 'cave',
    },
    {
      name: 'Two Of A Kind',
      overline: 'ROOM 03  /  TWO SWITCHES',
      objective: 'Stand on both switches together to open the way.',
      platforms: [
        { x: 0, y: FLOOR, w: WIDTH, h: 60, kind: 'ground' },
        { x: 175, y: 402, w: 118, h: 17 },
        { x: 387, y: 360, w: 140, h: 17 },
        { x: 576, y: 402, w: 118, h: 17 },
        { x: 764, y: 402, w: 100, h: 17 },
      ],
      key: { x: 816, y: 438 },
      switches: [
        { x: 268, y: 468, w: 60, h: 12, label: 'ONE' },
        { x: 562, y: 468, w: 60, h: 12, label: 'TWO' },
      ],
      gate: { x: 707, y: 250, w: 22, h: 230, open: false, latched: false },
      exit: { x: 891, y: 400, w: 48, h: 80 },
      spawn: [74, 111, 148, 185],
      scenery: 'night',
    },
  ];

  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const overlay = document.querySelector('#overlay');
  const menuCard = document.querySelector('#menu-card');
  const resultCard = document.querySelector('#result-card');
  const startButton = document.querySelector('#start-button');
  const resultButton = document.querySelector('#result-button');
  const menuButton = document.querySelector('#menu-button');
  const restartButton = document.querySelector('#restart-button');
  const statusIcon = document.querySelector('#status-icon');
  const statusOverline = document.querySelector('#status-overline');
  const statusText = document.querySelector('#status-text');
  const progressDots = [...document.querySelectorAll('.progress-dot')];
  const playerButtons = [...document.querySelectorAll('.crew-option')];
  const keysDown = new Set();

  const state = {
    mode: 'menu',
    levelIndex: 0,
    playerCount: 2,
    level: null,
    players: [],
    time: 0,
    lastFrame: 0,
    collected: false,
    switchesLatched: false,
  };

  function makePlayers(level) {
    return Array.from({ length: state.playerCount }, (_, index) => ({
      id: index + 1,
      x: level.spawn[index],
      y: FLOOR - 34,
      w: 26,
      h: 34,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: 1,
      blink: 0,
    }));
  }

  function loadLevel(index) {
    state.levelIndex = index;
    state.level = structuredClone(LEVELS[index]);
    state.players = makePlayers(state.level);
    state.collected = false;
    state.switchesLatched = false;
    state.mode = 'playing';
    keysDown.clear();
    updateInterface();
    overlay.hidden = true;
  }

  function startAdventure() {
    loadLevel(0);
  }

  function showMenu() {
    state.mode = 'menu';
    state.levelIndex = 0;
    state.level = structuredClone(LEVELS[0]);
    state.players = makePlayers(state.level);
    state.collected = false;
    state.switchesLatched = false;
    keysDown.clear();
    menuCard.hidden = false;
    resultCard.hidden = true;
    overlay.hidden = false;
    updateInterface();
  }

  function updateInterface() {
    const level = state.level || LEVELS[0];
    if (state.mode === 'menu') {
      statusIcon.textContent = '✦';
      statusOverline.textContent = 'READY WHEN YOU ARE';
      statusText.textContent = 'Choose your crew and press start.';
      progressDots.forEach((dot, index) => dot.classList.toggle('active', index === 0));
      progressDots.forEach((dot, index) => dot.classList.remove('done'));
    } else if (state.mode === 'playing') {
      statusIcon.textContent = state.collected ? '🔑' : '✦';
      statusOverline.textContent = level.overline;
      if (state.collected) statusText.textContent = 'Key found! Get the whole crew to the glowing door.';
      else if (state.levelIndex === 1 && !state.level.gate.open) statusText.textContent = 'One of you has to hold the floor switch.';
      else if (state.levelIndex === 2 && !state.level.gate.open) statusText.textContent = 'Two players. Two switches. At the same time.';
      else statusText.textContent = level.objective;
      progressDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === state.levelIndex);
        dot.classList.toggle('done', index < state.levelIndex);
      });
    } else {
      statusIcon.textContent = '✦';
      statusOverline.textContent = state.mode === 'complete' ? 'ALL ROOMS CLEARED' : `${level.overline}  /  CLEAR`;
      statusText.textContent = state.mode === 'complete' ? 'The whole crew made it. That was lovely.' : 'The team crossed together. On to the next room!';
      progressDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === state.levelIndex);
        dot.classList.toggle('done', index <= state.levelIndex);
      });
    }
    updateControlLabels();
  }

  function updateControlLabels() {
    const moveElement = document.querySelector('#move-controls');
    const jumpElement = document.querySelector('#jump-controls');
    const selected = CONTROL_MAP.slice(0, state.playerCount);
    moveElement.innerHTML = selected.map((control) => control.label).join(' <i>·</i> ');
    jumpElement.innerHTML = selected.map((control) => control.jumpLabel).join(' <i>·</i> ');
  }

  function setPlayerCount(count) {
    state.playerCount = count;
    playerButtons.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.players) === count)));
    if (state.mode === 'menu') {
      state.players = makePlayers(state.level || LEVELS[0]);
      updateControlLabels();
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function playerTouches(player, area) {
    return rectsOverlap({ x: player.x + 2, y: player.y + 2, w: player.w - 4, h: player.h - 2 }, area);
  }

  function movePlayer(player, control, step) {
    const left = control.left.some((key) => keysDown.has(key));
    const right = control.right.some((key) => keysDown.has(key));
    if (left === right) player.vx *= 0.72;
    else {
      player.vx = left ? -SPEED : SPEED;
      player.facing = left ? -1 : 1;
    }

    const previousBottom = player.y + player.h;
    const previousX = player.x;
    const nextX = Math.max(0, Math.min(WIDTH - player.w, player.x + player.vx * step));
    player.x = nextX;

    if (state.level.gate && !state.level.gate.open) {
      const gate = state.level.gate;
      if (player.y + player.h > gate.y && player.y < gate.y + gate.h && rectsOverlap(player, gate)) {
        if (player.vx > 0 && previousX + player.w <= gate.x + 2) player.x = gate.x - player.w;
        else if (player.vx < 0 && previousX >= gate.x + gate.w - 2) player.x = gate.x + gate.w;
        player.vx = 0;
      }
    }

    player.vy += GRAVITY * step;
    player.y += player.vy * step;
    player.grounded = false;
    const currentBottom = player.y + player.h;
    if (player.vy >= 0) {
      for (const platform of state.level.platforms) {
        const horizontalOverlap = player.x + player.w > platform.x && player.x < platform.x + platform.w;
        if (horizontalOverlap && previousBottom <= platform.y + 2 && currentBottom >= platform.y) {
          player.y = platform.y - player.h;
          player.vy = 0;
          player.grounded = true;
        }
      }
      if (state.level.gate && !state.level.gate.open) {
        const gate = state.level.gate;
        const horizontalOverlap = player.x + player.w > gate.x && player.x < gate.x + gate.w;
        if (horizontalOverlap && previousBottom <= gate.y + 2 && currentBottom >= gate.y) {
          player.y = gate.y - player.h;
          player.vy = 0;
          player.grounded = true;
        }
      }
    }
    if (player.y > HEIGHT + 50) {
      player.x = state.level.spawn[player.id - 1];
      player.y = FLOOR - player.h;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
    }
    player.blink += step;
  }

  function update(step) {
    state.time += step;
    if (state.mode !== 'playing') return;

    state.players.forEach((player, index) => movePlayer(player, CONTROL_MAP[index], step));

    if (!state.collected) {
      const keyRect = { x: state.level.key.x - 9, y: state.level.key.y - 8, w: 29, h: 31 };
      if (state.players.some((player) => playerTouches(player, keyRect))) {
        state.collected = true;
        if (state.level.gate) state.level.gate.latched = true;
        updateInterface();
      }
    }

    const activeSwitches = state.level.switches.map((switchPad) => state.players.some((player) =>
      player.x + player.w > switchPad.x && player.x < switchPad.x + switchPad.w &&
      player.y + player.h >= FLOOR - 2 && player.y + player.h <= FLOOR + 4,
    ));
    if (state.level.switches.length === 1) {
      state.level.switches[0].active = activeSwitches[0];
      state.level.gate.open = activeSwitches[0] || state.level.gate.latched;
    } else if (activeSwitches.length > 1) {
      state.level.switches.forEach((switchPad, index) => { switchPad.active = activeSwitches[index]; });
      if (activeSwitches.every(Boolean)) {
        state.switchesLatched = true;
        state.level.gate.latched = true;
      }
      state.level.gate.open = state.switchesLatched || state.level.gate.latched;
    }

    const exitReady = state.collected && (!state.level.switches.length || state.level.gate.open);
    if (exitReady && state.players.every((player) => player.x + player.w * .55 >= state.level.exit.x + 10 && player.y + player.h >= FLOOR - 2)) {
      finishLevel();
    }
  }

  function finishLevel() {
    state.mode = state.levelIndex === LEVELS.length - 1 ? 'complete' : 'won';
    menuCard.hidden = true;
    resultCard.hidden = false;
    const completed = state.mode === 'complete';
    document.querySelector('#result-eyebrow').textContent = completed ? 'THE WHOLE ADVENTURE' : `ROOM 0${state.levelIndex + 1} CLEAR`;
    document.querySelector('#result-title').textContent = completed ? 'Look at you, team!' : ['A lovely bit of teamwork.', 'Held it together!', 'Perfectly in sync.'][state.levelIndex];
    document.querySelector('#result-copy').textContent = completed ? 'Three rooms, one brilliant crew. Play another round?' : 'Everybody got through together. Ready for the next room?';
    resultButton.innerHTML = completed ? 'Play again <span>↗</span>' : 'Next room <span>↗</span>';
    resultButton.onclick = completed ? startAdventure : () => loadLevel(state.levelIndex + 1);
    overlay.hidden = false;
    updateInterface();
  }

  function roundedRect(x, y, w, h, radius, fill, stroke = null, lineWidth = 1) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawBackground() {
    const scene = state.level.scenery;
    let top = '#173d43';
    let bottom = '#32675b';
    if (scene === 'cave') { top = '#263749'; bottom = '#435c60'; }
    if (scene === 'night') { top = '#172e43'; bottom = '#315c60'; }
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 56; i += 1) {
      const x = (i * 173 + 41) % WIDTH;
      const y = (i * 97 + 23) % 330;
      const twinkle = .3 + (Math.sin(state.time * .045 + i) + 1) * .16;
      ctx.fillStyle = scene === 'night' ? `rgba(230,239,204,${twinkle})` : `rgba(207,229,191,${twinkle * .65})`;
      ctx.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
    }

    if (scene === 'meadow') {
      ctx.fillStyle = 'rgba(109, 159, 119, .2)';
      ctx.beginPath(); ctx.moveTo(0, 330); ctx.quadraticCurveTo(168, 274, 337, 338); ctx.quadraticCurveTo(530, 286, 697, 333); ctx.quadraticCurveTo(839, 285, 960, 330); ctx.lineTo(960, 480); ctx.lineTo(0, 480); ctx.fill();
      drawCloud(145, 135, .85); drawCloud(800, 174, .62);
    } else if (scene === 'cave') {
      for (let i = 0; i < 9; i += 1) {
        const x = i * 122 + 16;
        const h = 34 + ((i * 29) % 47);
        ctx.fillStyle = 'rgba(10, 27, 39, .24)';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 25, h); ctx.lineTo(x + 52, 0); ctx.fill();
      }
      ctx.fillStyle = 'rgba(226, 194, 118, .08)';
      ctx.fillRect(0, 365, WIDTH, 115);
    } else {
      ctx.fillStyle = 'rgba(99, 160, 143, .16)';
      ctx.beginPath(); ctx.moveTo(0, 380); ctx.quadraticCurveTo(220, 314, 405, 370); ctx.quadraticCurveTo(640, 311, 960, 367); ctx.lineTo(960, 480); ctx.lineTo(0, 480); ctx.fill();
      drawMoon(805, 98);
    }

    ctx.fillStyle = 'rgba(12, 35, 36, .08)';
    for (let x = 0; x < WIDTH; x += 48) ctx.fillRect(x, 0, 1, FLOOR);
    for (let y = 0; y < FLOOR; y += 48) ctx.fillRect(0, y, WIDTH, 1);
  }

  function drawCloud(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(231, 237, 202, .13)';
    ctx.fillRect(0, 8, 76, 20); ctx.fillRect(12, 0, 25, 32); ctx.fillRect(43, 2, 22, 28);
    ctx.restore();
  }

  function drawMoon(x, y) {
    ctx.save(); ctx.shadowColor = 'rgba(242, 204, 118, .45)'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#eed18a'; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#203d4b'; ctx.beginPath(); ctx.arc(x + 11, y - 8, 24, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function drawPlatforms() {
    for (const platform of state.level.platforms) {
      if (platform.kind === 'ground') {
        ctx.fillStyle = '#23483e'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = '#79ad77'; ctx.fillRect(platform.x, platform.y, platform.w, 7);
        ctx.fillStyle = 'rgba(205,224,162,.17)'; ctx.fillRect(platform.x, platform.y + 8, platform.w, 2);
        for (let x = platform.x + 13; x < platform.x + platform.w; x += 44) {
          ctx.fillStyle = 'rgba(10,37,34,.13)'; ctx.fillRect(x, platform.y + 23, 1, 20); ctx.fillRect(x + 14, platform.y + 37, 9, 2);
        }
        ctx.fillStyle = 'rgba(12,35,33,.19)'; ctx.fillRect(platform.x, platform.y + 53, platform.w, 7);
      } else {
        ctx.fillStyle = '#264d45'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h + 5);
        ctx.fillStyle = '#97c485'; ctx.fillRect(platform.x, platform.y, platform.w, 5);
        ctx.fillStyle = 'rgba(10,34,32,.22)'; ctx.fillRect(platform.x, platform.y + platform.h, platform.w, 5);
        ctx.fillStyle = 'rgba(232,237,194,.25)';
        for (let x = platform.x + 11; x < platform.x + platform.w; x += 26) ctx.fillRect(x, platform.y + 8, 5, 2);
      }
    }
  }

  function drawSwitches() {
    state.level.switches.forEach((switchPad) => {
      const active = switchPad.active;
      ctx.fillStyle = active ? 'rgba(243, 202, 98, .22)' : 'rgba(8, 25, 26, .28)';
      ctx.fillRect(switchPad.x - 8, FLOOR - 5, switchPad.w + 16, 6);
      ctx.fillStyle = active ? '#f1ca67' : '#617970';
      ctx.fillRect(switchPad.x, FLOOR - (active ? 5 : 8), switchPad.w, active ? 5 : 8);
      ctx.fillStyle = active ? '#fff0af' : '#a9bda5';
      ctx.fillRect(switchPad.x + 8, FLOOR - (active ? 5 : 8), switchPad.w - 16, 2);
      ctx.font = 'bold 8px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? '#f5d783' : 'rgba(219,231,204,.47)';
      ctx.fillText(switchPad.label, switchPad.x + switchPad.w / 2, FLOOR - 17);
    });
  }

  function drawGate() {
    const gate = state.level.gate;
    if (!gate) return;
    if (gate.open) {
      ctx.fillStyle = 'rgba(125, 219, 167, .2)';
      ctx.fillRect(gate.x - 5, gate.y, gate.w + 10, gate.h);
      ctx.fillStyle = 'rgba(167, 237, 174, .26)';
      ctx.fillRect(gate.x + 7, gate.y, 2, gate.h);
      ctx.fillStyle = '#bcdfa0';
      ctx.fillRect(gate.x - 5, gate.y, gate.w + 10, 4);
      ctx.fillRect(gate.x - 5, gate.y + gate.h - 4, gate.w + 10, 4);
      return;
    }
    ctx.fillStyle = 'rgba(12, 23, 28, .26)'; ctx.fillRect(gate.x - 4, gate.y - 3, gate.w + 8, gate.h + 3);
    ctx.fillStyle = '#d57962'; ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
    ctx.fillStyle = '#f0b271'; ctx.fillRect(gate.x + 3, gate.y, 3, gate.h);
    for (let y = gate.y + 12; y < gate.y + gate.h - 3; y += 22) {
      ctx.fillStyle = 'rgba(71, 50, 48, .33)'; ctx.fillRect(gate.x + 9, y, 9, 4);
    }
    ctx.fillStyle = '#ffcb73'; ctx.fillRect(gate.x - 3, gate.y, gate.w + 6, 5);
  }

  function drawKey() {
    if (state.collected) return;
    const key = state.level.key;
    const bob = Math.sin(state.time * .075) * 4;
    const x = key.x;
    const y = key.y + bob;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 212, 97, .75)'; ctx.shadowBlur = 19;
    ctx.strokeStyle = '#f8d86f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8, y + 7); ctx.lineTo(x + 20, y + 19); ctx.stroke();
    ctx.lineCap = 'square'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 15, y + 14); ctx.lineTo(x + 19, y + 10); ctx.moveTo(x + 19, y + 18); ctx.lineTo(x + 23, y + 14); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(250,221,121,.55)';
    ctx.fillRect(x - 3, y - 23, 3, 3); ctx.fillRect(x + 22, y - 8, 2, 2); ctx.fillRect(x - 19, y + 11, 2, 2);
  }

  function drawDoor() {
    const exit = state.level.exit;
    const ready = state.collected && (!state.level.switches.length || state.level.gate.open);
    ctx.fillStyle = 'rgba(11, 28, 30, .22)'; ctx.fillRect(exit.x - 6, exit.y + 4, exit.w + 12, exit.h);
    ctx.fillStyle = ready ? '#e8c663' : '#668071'; ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = ready ? '#f4df93' : '#9cae8c'; ctx.fillRect(exit.x + 5, exit.y + 5, exit.w - 10, exit.h - 5);
    ctx.fillStyle = ready ? '#4a7258' : '#31534b'; ctx.fillRect(exit.x + 10, exit.y + 10, exit.w - 20, exit.h - 10);
    ctx.fillStyle = ready ? '#b0d68f' : '#598170'; ctx.fillRect(exit.x + 15, exit.y + 18, exit.w - 30, exit.h - 18);
    ctx.fillStyle = ready ? '#f6d36d' : '#d2bc69'; ctx.fillRect(exit.x + exit.w - 15, exit.y + 43, 4, 6);
    ctx.fillStyle = ready ? 'rgba(242,213,113,.25)' : 'rgba(11,28,30,.1)';
    ctx.fillRect(exit.x - 10, exit.y - 8, exit.w + 20, 2);
    if (ready) {
      ctx.save(); ctx.shadowColor = 'rgba(244,213,105,.8)'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffe88e'; ctx.fillRect(exit.x - 3, exit.y - 4, exit.w + 6, 4); ctx.restore();
      ctx.fillStyle = '#f5d46d'; ctx.font = 'bold 8px ui-monospace, monospace'; ctx.textAlign = 'center';
      ctx.fillText('GO!', exit.x + exit.w / 2, exit.y - 13);
    }
  }

  function drawPlayer(player) {
    const { x, y, w, h, id, facing } = player;
    const color = PLAYER_COLORS[id - 1];
    const dark = PLAYER_DARKS[id - 1];
    const bob = player.grounded && Math.abs(player.vx) < .3 ? Math.sin(state.time * .09 + id) * 1.2 : 0;
    const drawY = Math.round(y + bob);
    ctx.fillStyle = 'rgba(10, 28, 28, .26)'; ctx.fillRect(x + 2, FLOOR - 2, w + 5, 4);
    ctx.fillStyle = dark; ctx.fillRect(x + 1, drawY + 2, w - 2, h - 3);
    ctx.fillStyle = color; ctx.fillRect(x + 3, drawY + 1, w - 6, h - 7);
    ctx.fillStyle = color; ctx.fillRect(x + 6, drawY - 3, w - 12, 4);
    ctx.fillStyle = '#edf0d7'; ctx.fillRect(x + (facing > 0 ? 15 : 6), drawY + 10, 5, 7);
    ctx.fillStyle = '#203b39'; ctx.fillRect(x + (facing > 0 ? 17 : 7), drawY + 12, 2, 4);
    ctx.fillStyle = dark; ctx.fillRect(x + 4, drawY + h - 7, 7, 5); ctx.fillRect(x + w - 11, drawY + h - 7, 7, 5);
    ctx.fillStyle = '#193932'; ctx.font = 'bold 9px ui-monospace, monospace'; ctx.textAlign = 'center';
    ctx.fillText(String(id), x + w / 2, drawY - 7);
    if (player.grounded && Math.abs(player.vx) > 1) {
      const foot = Math.floor(state.time / 4 + id) % 2;
      ctx.fillStyle = dark;
      if (foot) { ctx.fillRect(x + 4, drawY + h - 3, 8, 3); ctx.fillRect(x + w - 12, drawY + h - 6, 8, 3); }
    }
  }

  function drawWorld() {
    drawBackground();
    drawPlatforms();
    drawSwitches();
    drawGate();
    drawDoor();
    drawKey();
    state.players.forEach(drawPlayer);
    drawTopHud();
  }

  function drawTopHud() {
    roundedRect(18, 17, 179, 43, 5, 'rgba(13, 37, 37, .64)', 'rgba(221,235,204,.13)');
    ctx.fillStyle = '#f0cd70'; ctx.font = 'bold 9px ui-monospace, monospace'; ctx.textAlign = 'left';
    ctx.fillText(`ROOM 0${state.levelIndex + 1}`, 31, 35);
    ctx.fillStyle = 'rgba(224,236,210,.72)'; ctx.font = '10px ui-monospace, monospace';
    ctx.fillText(state.level.name.toUpperCase(), 31, 50);
    const progressX = WIDTH - 19;
    roundedRect(progressX - 150, 18, 132, 31, 4, 'rgba(13, 37, 37, .56)', 'rgba(221,235,204,.12)');
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(224,236,210,.77)'; ctx.font = '9px ui-monospace, monospace';
    ctx.fillText(`${state.playerCount} LITTLE FRIENDS`, progressX - 30, 37);
    ctx.fillStyle = state.collected ? '#f4d36f' : '#91aa91';
    ctx.fillRect(progressX - 19, 28, 8, 8);
    if (state.collected) { ctx.fillStyle = '#fff0ae'; ctx.fillRect(progressX - 18, 25, 3, 3); }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const scale = rect.width / WIDTH;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function frame(timestamp) {
    if (!state.lastFrame) state.lastFrame = timestamp;
    const step = Math.min((timestamp - state.lastFrame) / 16.6667, 2);
    state.lastFrame = timestamp;
    update(step);
    drawWorld();
    window.requestAnimationFrame(frame);
  }

  playerButtons.forEach((button) => button.addEventListener('click', () => setPlayerCount(Number(button.dataset.players))));
  startButton.addEventListener('click', startAdventure);
  menuButton.addEventListener('click', showMenu);
  restartButton.addEventListener('click', () => {
    if (state.mode === 'playing') loadLevel(state.levelIndex);
    else if (state.mode === 'won' || state.mode === 'complete') loadLevel(state.levelIndex);
  });
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code) && state.mode === 'playing') event.preventDefault();
    if (event.repeat) return;
    keysDown.add(event.code);
    if (event.code === 'KeyR' && state.mode === 'playing') loadLevel(state.levelIndex);
    if (event.code === 'Escape' && state.mode !== 'menu') showMenu();
    if (state.mode === 'playing') {
      state.players.forEach((player, index) => {
        if (CONTROL_MAP[index].jump.includes(event.code) && player.grounded) {
          player.vy = JUMP_SPEED;
          player.grounded = false;
        }
      });
    }
  });
  window.addEventListener('keyup', (event) => keysDown.delete(event.code));
  window.addEventListener('blur', () => keysDown.clear());

  state.level = structuredClone(LEVELS[0]);
  state.players = makePlayers(state.level);
  resizeCanvas();
  updateInterface();
  window.requestAnimationFrame(frame);
})();

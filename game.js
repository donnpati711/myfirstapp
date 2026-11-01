const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const message = document.querySelector("#game-message");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const coinCount = document.querySelector("#coin-count");
const healthCount = document.querySelector("#health-count");
const arrowCount = document.querySelector("#arrow-count");
const timerCount = document.querySelector("#timer-count");
const itemStatus = document.querySelector("#item-status");
const worldName = document.querySelector("#world-name");
const stageNumber = document.querySelector("#stage-number");
const messageIcon = document.querySelector("#message-icon");
const messageKicker = document.querySelector("#message-kicker");
const messageTitle = document.querySelector("#message-title");
const messageCopy = document.querySelector("#message-copy");

const WORLD_LENGTH = 4400;
const EXIT_X = 4270;
const PLAYER_WIDTH = 27;
const PLAYER_HEIGHT = 36;
const GRAVITY = 1550;
const JUMP_SPEED = 555;
const MOVE_SPEED = 250;
const STAGE_TIME = 90;
const STAGES_PER_WORLD = 5;

const worlds = [
  {
    name: "GREEN HILLS",
    japaneseName: "緑の草原",
    theme: "meadow",
    sky: ["#a9d2dc", "#e5ead4"],
    far: "#9bbda0",
    near: "#82ad87",
    ground: "#56875e",
    grass: "#a6ce83",
    platform: "#66945e",
    accent: "#f1c95d",
    sun: "#ffecb1",
  },
  {
    name: "SUNSET DESERT",
    japaneseName: "夕焼けの砂漠",
    theme: "desert",
    sky: ["#e6a980", "#f7dfb0"],
    far: "#d9a476",
    near: "#c89063",
    ground: "#9c684b",
    grass: "#d7a66e",
    platform: "#ab7855",
    accent: "#ffe08a",
    sun: "#fff0bc",
  },
  {
    name: "FROST PEAK",
    japaneseName: "氷の雪山",
    theme: "frost",
    sky: ["#86b8d1", "#e1eff0"],
    far: "#96bac7",
    near: "#759eae",
    ground: "#557a8c",
    grass: "#d0e8e4",
    platform: "#648b9a",
    accent: "#a9e3ed",
    sun: "#fff5d5",
  },
];

const itemCatalog = [
  { id: "speed", name: "疾風ブーツ", duration: 10 },
  { id: "jump", name: "ジャンプの羽", duration: 12 },
  { id: "shield", name: "ガードシールド", duration: 0 },
  { id: "magnet", name: "コイン磁石", duration: 12 },
  { id: "double", name: "コイン2倍", duration: 12 },
  { id: "time", name: "砂時計 +20秒", duration: 0 },
  { id: "heal", name: "ハート回復", duration: 0 },
  { id: "arrows", name: "矢束 +5", duration: 0 },
  { id: "sword", name: "剣の力", duration: 12 },
  { id: "star", name: "星の加護", duration: 6 },
];

const input = { left: false, right: false };
let width = 0;
let height = 0;
let floorY = 0;
let cameraX = 0;
let lastFrame = 0;
let state = "ready";
let worldIndex = 0;
let stageIndex = 0;
let stageData;
let player;
let boss;
let coins = [];
let chests = [];
let arrows = [];
let enemyShots = [];
let collectedCoins = 0;
let timeLeft = STAGE_TIME;
let gameTime = 0;
let effects = {};
let shieldCharges = 0;
let swordCooldown = 0;
let bowCooldown = 0;
let bossAttackCooldown = 0;
let itemNotice = "";
let itemNoticeUntil = 0;

function createStage(world, stage) {
  const difficulty = world * 4 + stage;
  const gapBases = [810, 1600, 2460, 3310];
  const gaps = gapBases.map((base, index) => {
    const gapWidth = 115 + difficulty * 3 + (index % 2) * 12;
    const start = base + difficulty * 11;
    return { start, end: start + gapWidth };
  });
  const ground = [];
  let groundStart = 0;
  for (const gap of gaps) {
    ground.push({ x: groundStart, width: gap.start - groundStart });
    groundStart = gap.end;
  }
  ground.push({ x: groundStart, width: WORLD_LENGTH - groundStart });

  const platforms = gaps.map((gap, index) => ({
    x: gap.start - 20,
    width: gap.end - gap.start + 40,
    height: 48 + ((index + stage + world) % 3) * 12,
  }));
  const spikeBases = [530, 1230, 2070, 2910, 3750];
  const spikes = spikeBases
    .map((base, index) => ({ x: base + difficulty * 13, width: 35 + (difficulty > 7 ? 8 : 0), index }))
    .filter((spike) => !gaps.some((gap) => spike.x >= gap.start - 30 && spike.x <= gap.end + 30))
    .filter((spike) => !(stage === STAGES_PER_WORLD - 1 && spike.x > 3200));

  const coinList = [];
  for (let index = 0; index < 34; index += 1) {
    const x = 170 + index * 118 + (difficulty % 3) * 9;
    if (!gaps.some((gap) => x > gap.start - 10 && x < gap.end + 10)) {
      coinList.push({ x, height: 75 + (index % 3) * 23, collected: false });
    }
  }

  const chestXs = [940 + difficulty * 4, 2250 + difficulty * 5, 3650 + difficulty * 3];
  const chestList = chestXs
    .filter((x) => !gaps.some((gap) => x > gap.start - 35 && x < gap.end + 35))
    .map((x) => ({ x, opened: false }));

  const isCastle = stage === STAGES_PER_WORLD - 1;
  return {
    worldLength: WORLD_LENGTH,
    ground,
    platforms,
    spikes,
    coins: coinList,
    chests: chestList,
    isCastle,
    goalX: EXIT_X,
    bossX: isCastle ? 3620 : null,
    difficulty,
  };
}

function updateHud() {
  const world = worlds[worldIndex];
  worldName.textContent = world.name;
  stageNumber.textContent = `${String(worldIndex + 1).padStart(2, "0")}-${String(stageIndex + 1).padStart(2, "0")}`;
  coinCount.textContent = String(collectedCoins);
  healthCount.textContent = `${"♥ ".repeat(Math.max(0, player?.health ?? 3))}${"♡ ".repeat(3 - Math.max(0, player?.health ?? 3))}`.trim();
  arrowCount.textContent = String(player?.arrows ?? 12);
  timerCount.textContent = String(Math.max(0, Math.ceil(timeLeft)));
  timerCount.classList.toggle("is-low", timeLeft <= 15);

  const activeItems = Object.entries(effects)
    .filter(([, expiresAt]) => expiresAt > gameTime)
    .map(([id]) => itemCatalog.find((item) => item.id === id)?.name)
    .filter(Boolean);
  if (shieldCharges > 0) activeItems.push("ガードシールド");
  itemStatus.textContent = itemNoticeUntil > gameTime
    ? itemNotice
    : activeItems.length
      ? `効果中：${activeItems.join(" / ")}`
      : "アイテム：なし";
}

function resetStage() {
  stageData = createStage(worldIndex, stageIndex);
  player = {
    x: 70,
    y: floorY - PLAYER_HEIGHT,
    velocityY: 0,
    grounded: true,
    facing: 1,
    runTime: 0,
    health: 3,
    arrows: 12,
    invulnerableUntil: 0,
  };
  boss = stageData.isCastle
    ? {
        x: stageData.bossX,
        y: floorY - 78,
        health: 5 + worldIndex * 2,
        maxHealth: 5 + worldIndex * 2,
        hitUntil: 0,
        defeated: false,
      }
    : null;
  coins = stageData.coins.map((coin) => ({ ...coin }));
  chests = stageData.chests.map((chest) => ({ ...chest }));
  arrows = [];
  enemyShots = [];
  collectedCoins = 0;
  timeLeft = STAGE_TIME;
  gameTime = 0;
  effects = {};
  shieldCharges = 0;
  swordCooldown = 0;
  bowCooldown = 0;
  bossAttackCooldown = 1.5;
  itemNotice = "";
  itemNoticeUntil = 0;
  cameraX = 0;
  updateHud();
  draw();
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const previousFloor = floorY;
  width = bounds.width;
  height = bounds.height;
  floorY = height - 46;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (player?.grounded) player.y += floorY - previousFloor;
  draw();
}

function showMessage(kind) {
  const nextWorld = worldIndex + (stageIndex === STAGES_PER_WORLD - 1 ? 1 : 0);
  const nextStage = (stageIndex + 1) % STAGES_PER_WORLD;
  const messages = {
    ready: {
      icon: "✦",
      kicker: `${worlds[worldIndex].japaneseName} · ${stageIndex + 1} / ${STAGES_PER_WORLD}`,
      title: stageData?.isCastle ? "城のボスに挑もう" : "冒険をはじめよう",
      copy: "90秒以内にゴールへ！ 宝箱には10種類のアイテム。",
      button: "ゲームスタート",
    },
    lost: {
      icon: "↻",
      kicker: "ONE MORE TRY",
      title: timeLeft <= 0 ? "時間切れ！" : "冒険はまだ終わらない",
      copy: "ライフがなくなったよ。アイテムを使って再挑戦しよう。",
      button: "このステージを再挑戦",
    },
    clear: {
      icon: "✦",
      kicker: stageData?.isCastle ? "BOSS DEFEATED" : "STAGE CLEAR",
      title: stageData?.isCastle ? `${worlds[worldIndex].japaneseName}を救った！` : "ステージクリア！",
      copy: nextWorld >= worlds.length
        ? "すべてのワールドを冒険したよ！"
        : stageIndex === STAGES_PER_WORLD - 1
          ? `${worlds[nextWorld].japaneseName}が待っている！`
          : `次はステージ ${nextStage + 1}。コイン ${collectedCoins} 枚！`,
      button: nextWorld >= worlds.length ? "冒険をもう一度" : "次のステージへ",
    },
    complete: {
      icon: "✦",
      kicker: "ALL WORLDS CLEARED",
      title: "伝説の冒険者！",
      copy: "3つのワールドを制覇！おめでとう！",
      button: "最初から遊ぶ",
    },
  };
  const copy = messages[kind];
  messageIcon.textContent = copy.icon;
  messageKicker.textContent = copy.kicker;
  messageTitle.textContent = copy.title;
  messageCopy.textContent = copy.copy;
  startButton.innerHTML = `${copy.button} <span aria-hidden="true">→</span>`;
  message.classList.remove("is-hidden");
}

function startGame() {
  if (state !== "playing") {
    if (state === "lost") resetStage();
    else if (state === "complete") {
      worldIndex = 0;
      stageIndex = 0;
      resetStage();
    }
  }
  state = "playing";
  message.classList.add("is-hidden");
  updateHud();
}

function advanceStage() {
  if (stageIndex < STAGES_PER_WORLD - 1) {
    stageIndex += 1;
  } else if (worldIndex < worlds.length - 1) {
    worldIndex += 1;
    stageIndex = 0;
  } else {
    state = "complete";
    showMessage("complete");
    return;
  }
  resetStage();
  state = "playing";
  message.classList.add("is-hidden");
}

function finishStage() {
  if (state !== "playing") return;
  if (worldIndex === worlds.length - 1 && stageIndex === STAGES_PER_WORLD - 1) {
    state = "complete";
    input.left = false;
    input.right = false;
    showMessage("complete");
    return;
  }
  state = "clear";
  input.left = false;
  input.right = false;
  showMessage("clear");
}

function finishGame() {
  state = "lost";
  input.left = false;
  input.right = false;
  showMessage("lost");
}

function jump() {
  if (state !== "playing" || !player.grounded) return;
  const jumpBoost = effects.jump > gameTime ? 1.3 : 1;
  player.velocityY = -JUMP_SPEED * jumpBoost;
  player.grounded = false;
}

function damageBoss(amount) {
  if (!boss || boss.defeated || boss.hitUntil > gameTime) return;
  boss.health = Math.max(0, boss.health - amount);
  boss.hitUntil = gameTime + 0.3;
  if (boss.health === 0) {
    boss.defeated = true;
    enemyShots = [];
  }
}

function attackWithSword() {
  if (state !== "playing" || swordCooldown > gameTime) return;
  swordCooldown = gameTime + 0.42;
  if (!boss || boss.defeated) return;
  const playerCenter = player.x + PLAYER_WIDTH / 2;
  const bossCenter = boss.x + 32;
  if (Math.abs(playerCenter - bossCenter) < 82 && Math.abs(player.y - boss.y) < 66) {
    damageBoss(effects.sword > gameTime ? 2 : 1);
  }
}

function attackWithBow() {
  if (state !== "playing" || bowCooldown > gameTime || player.arrows <= 0) return;
  bowCooldown = gameTime + 0.38;
  player.arrows -= 1;
  arrows.push({
    x: player.x + (player.facing > 0 ? PLAYER_WIDTH : 0),
    y: player.y + 17,
    velocityX: player.facing * 580,
  });
  updateHud();
}

function collectItem(chest) {
  chest.opened = true;
  const item = itemCatalog[Math.floor(Math.random() * itemCatalog.length)];
  if (item.duration > 0) {
    effects[item.id] = Math.max(effects[item.id] || 0, gameTime) + item.duration;
  } else if (item.id === "shield") {
    shieldCharges += 1;
  } else if (item.id === "time") {
    timeLeft = Math.min(STAGE_TIME + 40, timeLeft + 20);
  } else if (item.id === "heal") {
    player.health = Math.min(3, player.health + 1);
  } else if (item.id === "arrows") {
    player.arrows += 5;
  }
  itemNotice = `宝箱から「${item.name}」を手に入れた！`;
  itemNoticeUntil = gameTime + 2.5;
  updateHud();
}

function takeDamage() {
  if (player.invulnerableUntil > gameTime || effects.star > gameTime) return;
  if (shieldCharges > 0) {
    shieldCharges -= 1;
    player.invulnerableUntil = gameTime + 0.7;
    updateHud();
    return;
  }
  player.health -= 1;
  timeLeft = Math.max(0, timeLeft - 5);
  if (player.health <= 0) {
    updateHud();
    finishGame();
    return;
  }
  player.x = Math.max(70, player.x - 100);
  player.y = floorY - PLAYER_HEIGHT;
  player.velocityY = 0;
  player.grounded = true;
  player.invulnerableUntil = gameTime + 1.5;
  enemyShots = [];
  updateHud();
}

function overlapsGround(x, right, previousBottom, bottom) {
  for (const segment of stageData.ground) {
    if (right > segment.x && x < segment.x + segment.width && previousBottom <= floorY && bottom >= floorY) {
      return floorY;
    }
  }
  return null;
}

function update(delta) {
  if (state !== "playing") return;
  gameTime += delta;
  timeLeft -= delta;
  if (timeLeft <= 0) {
    timeLeft = 0;
    updateHud();
    finishGame();
    return;
  }

  const speed = MOVE_SPEED * (effects.speed > gameTime ? 1.45 : 1);
  const direction = Number(input.right) - Number(input.left);
  player.x += direction * speed * delta;
  player.x = Math.max(0, Math.min(stageData.worldLength - PLAYER_WIDTH, player.x));
  cameraX = Math.max(0, Math.min(stageData.worldLength - width, player.x - width * 0.35));
  if (direction !== 0) {
    player.facing = direction;
    player.runTime += delta * 12;
  }

  const previousBottom = player.y + PLAYER_HEIGHT;
  player.velocityY += GRAVITY * delta;
  player.y += player.velocityY * delta;
  player.grounded = false;
  const playerRight = player.x + PLAYER_WIDTH;
  let landingY = overlapsGround(player.x, playerRight, previousBottom, player.y + PLAYER_HEIGHT);

  if (landingY === null && player.velocityY >= 0) {
    for (const platform of stageData.platforms) {
      const platformY = floorY - platform.height;
      if (
        playerRight > platform.x &&
        player.x < platform.x + platform.width &&
        previousBottom <= platformY &&
        player.y + PLAYER_HEIGHT >= platformY
      ) {
        landingY = platformY;
        break;
      }
    }
  }
  if (landingY !== null) {
    player.y = landingY - PLAYER_HEIGHT;
    player.velocityY = 0;
    player.grounded = true;
  }

  if (player.grounded && stageData.spikes.some((spike) => playerRight > spike.x && player.x < spike.x + spike.width)) {
    takeDamage();
  }

  if (player.y > height + 80) {
    takeDamage();
    if (state !== "playing") return;
  }
  if (state !== "playing") return;

  for (const coin of coins) {
    if (coin.collected) continue;
    const coinX = coin.x + 9;
    const coinY = floorY - coin.height;
    const magnetRange = effects.magnet > gameTime ? 62 : 27;
    const playerCenterX = player.x + PLAYER_WIDTH / 2;
    const playerCenterY = player.y + PLAYER_HEIGHT / 2;
    if (Math.hypot(playerCenterX - coinX, playerCenterY - coinY) < magnetRange) {
      coin.collected = true;
      collectedCoins += effects.double > gameTime ? 2 : 1;
    }
  }

  for (const chest of chests) {
    if (!chest.opened && playerRight > chest.x - 8 && player.x < chest.x + 35 && player.y + PLAYER_HEIGHT > floorY - 46) {
      collectItem(chest);
    }
  }

  for (const arrow of arrows) {
    arrow.x += arrow.velocityX * delta;
    if (boss && !boss.defeated && Math.abs(arrow.x - boss.x - 30) < 36 && Math.abs(arrow.y - (floorY - 40)) < 45) {
      damageBoss(1);
      arrow.hit = true;
    }
    if (arrow.x < cameraX - 30 || arrow.x > cameraX + width + 30) arrow.hit = true;
  }
  arrows = arrows.filter((arrow) => !arrow.hit);

  if (boss && !boss.defeated) {
    bossAttackCooldown -= delta;
    if (bossAttackCooldown <= 0) {
      const bossCenterX = boss.x + 24;
      const playerCenterX = player.x + PLAYER_WIDTH / 2;
      const playerCenterY = player.y + PLAYER_HEIGHT / 2;
      const dx = playerCenterX - bossCenterX;
      const dy = playerCenterY - (floorY - 42);
      const distance = Math.max(1, Math.hypot(dx, dy));
      enemyShots.push({
        x: bossCenterX,
        y: floorY - 43,
        velocityX: (dx / distance) * 205,
        velocityY: (dy / distance) * 205,
      });
      bossAttackCooldown = Math.max(1.05, 2 - worldIndex * 0.18);
    }
  }

  for (const shot of enemyShots) {
    shot.x += shot.velocityX * delta;
    shot.y += shot.velocityY * delta;
    if (
      Math.abs(shot.x - (player.x + PLAYER_WIDTH / 2)) < 19 &&
      Math.abs(shot.y - (player.y + PLAYER_HEIGHT / 2)) < 18
    ) {
      shot.hit = true;
      takeDamage();
    }
  }
  enemyShots = enemyShots.filter((shot) => !shot.hit && shot.x > cameraX - 50 && shot.x < cameraX + width + 50);
  if (state !== "playing") return;

  if (boss && !boss.defeated && player.x + PLAYER_WIDTH > boss.x - 10 && player.x < boss.x + 58) {
    player.x = boss.x - PLAYER_WIDTH - 10;
    takeDamage();
  }
  cameraX = Math.max(0, Math.min(stageData.worldLength - width, player.x - width * 0.35));

  if (player.x + PLAYER_WIDTH >= stageData.goalX && (!boss || boss.defeated)) {
    finishStage();
  }

  updateHud();
}

function drawCloud(x, y, scale = 1, color = "rgba(255, 255, 255, 0.72)") {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(0, 8, 24, 9, 0, 0, Math.PI * 2);
  context.ellipse(-11, 3, 12, 10, 0, 0, Math.PI * 2);
  context.ellipse(4, 0, 14, 14, 0, 0, Math.PI * 2);
  context.ellipse(17, 6, 11, 8, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCastle() {
  if (!stageData.isCastle) return;
  const x = stageData.bossX - cameraX - 115;
  const baseY = floorY - 72;
  context.fillStyle = "rgba(74, 77, 89, 0.72)";
  context.fillRect(x, baseY - 75, 120, 75);
  context.fillRect(x - 15, baseY - 112, 33, 112);
  context.fillRect(x + 102, baseY - 105, 34, 105);
  context.fillRect(x + 40, baseY - 130, 42, 130);
  context.fillStyle = "rgba(47, 53, 67, 0.8)";
  for (const towerX of [x - 15, x + 40, x + 102]) {
    context.beginPath();
    context.moveTo(towerX - 5, baseY - (towerX === x + 40 ? 130 : towerX === x - 15 ? 112 : 105));
    context.lineTo(towerX + 16, baseY - (towerX === x + 40 ? 163 : towerX === x - 15 ? 143 : 136));
    context.lineTo(towerX + 37, baseY - (towerX === x + 40 ? 130 : towerX === x - 15 ? 112 : 105));
    context.closePath();
    context.fill();
  }
  context.fillStyle = "rgba(255, 206, 119, 0.72)";
  context.fillRect(x + 51, baseY - 39, 19, 39);
}

function drawBackground(time) {
  const world = worlds[worldIndex];
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, world.sky[0]);
  sky.addColorStop(1, world.sky[1]);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = world.sun;
  context.beginPath();
  context.arc(width * 0.79, height * 0.2, 29, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `${world.sun}55`;
  context.beginPath();
  context.arc(width * 0.79, height * 0.2, 44, 0, Math.PI * 2);
  context.fill();

  const cloudPatternWidth = 390;
  for (let index = 0; index < 5; index += 1) {
    const x = ((index * cloudPatternWidth - cameraX * 0.14) % (width + cloudPatternWidth) + width + cloudPatternWidth) % (width + cloudPatternWidth) - 25;
    drawCloud(x, height * (0.17 + (index % 3) * 0.105), 0.75 + (index % 2) * 0.2);
  }

  const hillBase = floorY + 9;
  context.fillStyle = world.far;
  context.beginPath();
  context.moveTo(0, hillBase);
  for (let x = -100; x <= width + 120; x += 150) {
    const shiftedX = x - ((cameraX * 0.28) % 300);
    context.quadraticCurveTo(shiftedX + 70, hillBase - (world.theme === "desert" ? 65 : 100), shiftedX + 150, hillBase - 13);
  }
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  context.fillStyle = world.near;
  context.beginPath();
  context.moveTo(0, floorY + 18);
  for (let x = -80; x <= width + 100; x += 190) {
    const shiftedX = x - ((cameraX * 0.45) % 380);
    context.quadraticCurveTo(shiftedX + 90, floorY - 43, shiftedX + 190, floorY + 8);
  }
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  drawLandmarks(time);
  drawCastle();
}

function drawLandmarks(time) {
  const start = Math.floor(cameraX / 260) * 260;
  for (let x = start; x < cameraX + width + 260; x += 260) {
    const screenX = x - cameraX + 90;
    const landmarkIndex = Math.floor(x / 260) + worldIndex;
    context.save();
    if (worlds[worldIndex].theme === "desert") {
      context.fillStyle = "#578b70";
      context.fillRect(screenX, floorY - 32, 7, 32);
      context.fillRect(screenX - 9, floorY - 25, 8, 6);
      context.fillRect(screenX + 6, floorY - 20, 8, 6);
      context.fillStyle = "#79a781";
      context.fillRect(screenX - 9, floorY - 27, 8, 3);
      context.fillRect(screenX + 6, floorY - 22, 8, 3);
    } else if (worlds[worldIndex].theme === "frost") {
      context.fillStyle = "#547a79";
      context.fillRect(screenX, floorY - 35, 7, 35);
      context.fillStyle = "#d9eee8";
      context.beginPath();
      context.moveTo(screenX - 12, floorY - 21);
      context.lineTo(screenX + 3, floorY - 52);
      context.lineTo(screenX + 18, floorY - 21);
      context.closePath();
      context.fill();
    } else {
      context.fillStyle = landmarkIndex % 2 ? "#527b59" : "#668a5f";
      context.fillRect(screenX + 5, floorY - 31, 5, 31);
      context.beginPath();
      context.arc(screenX + 7, floorY - 36, 15, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(screenX - 2, floorY - 26, 10, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
  if (worlds[worldIndex].theme === "frost") {
    drawCloud(width * 0.25, height * 0.3 + Math.sin(time / 900) * 2, 0.52, "rgba(239, 249, 250, 0.4)");
  }
}

function drawGround() {
  const world = worlds[worldIndex];
  for (const segment of stageData.ground) {
    const x = segment.x - cameraX;
    context.fillStyle = world.ground;
    context.fillRect(x, floorY, segment.width, height - floorY);
    context.fillStyle = world.grass;
    context.fillRect(x, floorY, segment.width, 7);
    context.fillStyle = "rgba(40, 70, 62, 0.16)";
    for (let mark = 20; mark < segment.width; mark += 38) {
      context.fillRect(x + mark, floorY + 19 + (mark % 3) * 8, 3, 3);
    }
  }
  for (const platform of stageData.platforms) {
    const x = platform.x - cameraX;
    const y = floorY - platform.height;
    context.fillStyle = world.platform;
    context.fillRect(x, y, platform.width, 14);
    context.fillStyle = world.grass;
    context.fillRect(x, y, platform.width, 5);
    context.fillStyle = "rgba(36, 70, 55, 0.17)";
    context.fillRect(x + 8, y + 14, platform.width - 16, 5);
  }
}

function drawCoins(time) {
  for (const coin of coins) {
    if (coin.collected) continue;
    const x = coin.x - cameraX + 9;
    const y = floorY - coin.height + Math.sin(time / 230 + coin.x) * 3;
    context.fillStyle = "rgba(247, 204, 91, 0.2)";
    context.beginPath();
    context.arc(x, y, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = worlds[worldIndex].accent;
    context.beginPath();
    context.ellipse(x, y, 7, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#d89c31";
    context.lineWidth = 1.5;
    context.beginPath();
    context.ellipse(x, y, 3, 5, 0, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawSpikes() {
  for (const spike of stageData.spikes) {
    const x = spike.x - cameraX;
    context.fillStyle = worlds[worldIndex].theme === "frost" ? "#b4d6dc" : "#d97c69";
    context.beginPath();
    context.moveTo(x, floorY + 1);
    context.lineTo(x + spike.width / 2, floorY - 23);
    context.lineTo(x + spike.width, floorY + 1);
    context.closePath();
    context.fill();
  }
}

function drawChests() {
  for (const chest of chests) {
    const x = chest.x - cameraX;
    const y = floorY - 25;
    context.fillStyle = chest.opened ? "#8f7358" : "#a97442";
    context.fillRect(x, y + 7, 27, 18);
    context.fillStyle = chest.opened ? "#b49770" : "#d2a35c";
    context.fillRect(x - 2, y + 2, 31, 8);
    context.fillStyle = "#f4d576";
    context.fillRect(x + 11, y + 9, 5, 6);
    if (!chest.opened) {
      context.fillStyle = "rgba(255, 231, 153, 0.2)";
      context.beginPath();
      context.arc(x + 13, y - 2, 16, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawGoal() {
  const x = stageData.goalX - cameraX;
  context.fillStyle = "#7b9271";
  context.fillRect(x, floorY - 110, 5, 110);
  context.fillStyle = worlds[worldIndex].accent;
  context.beginPath();
  context.moveTo(x + 5, floorY - 108);
  context.lineTo(x + 42, floorY - 97);
  context.lineTo(x + 5, floorY - 83);
  context.closePath();
  context.fill();
}

function drawBoss() {
  if (!boss || boss.defeated) return;
  const x = boss.x - cameraX;
  const y = floorY - 79;
  const flash = boss.hitUntil > gameTime;
  context.fillStyle = flash ? "#fff4d1" : "#644d62";
  context.beginPath();
  context.roundRect(x, y + 12, 60, 63, 18);
  context.fill();
  context.fillStyle = flash ? "#fff4d1" : "#9b6b79";
  context.beginPath();
  context.arc(x + 30, y + 17, 24, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ead79b";
  context.beginPath();
  context.moveTo(x + 13, y + 5);
  context.lineTo(x + 7, y - 17);
  context.lineTo(x + 25, y + 1);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(x + 37, y + 1);
  context.lineTo(x + 54, y - 18);
  context.lineTo(x + 48, y + 7);
  context.closePath();
  context.fill();
  context.fillStyle = "#ffe68c";
  context.fillRect(x + 17, y + 15, 6, 5);
  context.fillRect(x + 38, y + 15, 6, 5);
  context.fillStyle = "#382f3e";
  context.fillRect(x + 20, y + 16, 2, 3);
  context.fillRect(x + 40, y + 16, 2, 3);
  context.fillStyle = "#3e3542";
  context.fillRect(x + 7, y + 68, 16, 9);
  context.fillRect(x + 38, y + 68, 16, 9);

  context.fillStyle = "rgba(34, 42, 48, 0.7)";
  context.fillRect(width / 2 - 74, 15, 148, 13);
  context.fillStyle = "#e16f65";
  context.fillRect(width / 2 - 72, 17, 144 * (boss.health / boss.maxHealth), 9);
  context.fillStyle = "#fff";
  context.font = "10px 'DM Mono', monospace";
  context.textAlign = "center";
  context.fillText(`BOSS ${boss.health}/${boss.maxHealth}`, width / 2, 39);
}

function drawPlayer() {
  const x = player.x - cameraX;
  const bounce = player.grounded && (input.left || input.right) ? Math.abs(Math.sin(player.runTime)) * 2 : 0;
  const y = player.y + bounce;
  const legSwing = player.grounded && (input.left || input.right) ? Math.sin(player.runTime) * 4 : 0;
  context.save();
  if (player.facing < 0) {
    context.translate(x + PLAYER_WIDTH, 0);
    context.scale(-1, 1);
  } else {
    context.translate(x, 0);
  }
  context.globalAlpha = player.invulnerableUntil > gameTime && Math.floor(gameTime * 12) % 2 ? 0.45 : 1;
  context.fillStyle = "rgba(39, 68, 51, 0.18)";
  context.beginPath();
  context.ellipse(PLAYER_WIDTH / 2, floorY + 2, 16, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#365f49";
  context.fillRect(7, y + 25, 6, 10 + Math.max(0, legSwing));
  context.fillRect(16, y + 25, 6, 10 - Math.min(0, legSwing));
  context.fillStyle = "#e8b56e";
  context.fillRect(5, y + 33 + Math.max(0, legSwing), 9, 3);
  context.fillRect(15, y + 33 - Math.min(0, legSwing), 10, 3);
  context.fillStyle = "#397a59";
  context.beginPath();
  context.roundRect(3, y + 12, 22, 17, 6);
  context.fill();
  context.fillStyle = "#6da66f";
  context.fillRect(5, y + 14, 5, 11);
  context.fillStyle = "#e9b982";
  context.beginPath();
  context.roundRect(6, y + 1, 19, 17, 7);
  context.fill();
  context.fillStyle = "#3b5946";
  context.beginPath();
  context.roundRect(4, y, 21, 8, 5);
  context.fill();
  context.fillRect(4, y + 4, 5, 8);
  context.fillStyle = "#293b31";
  context.fillRect(19, y + 9, 2, 3);
  context.restore();
}

function drawProjectiles() {
  context.lineWidth = 3;
  for (const arrow of arrows) {
    const x = arrow.x - cameraX;
    context.strokeStyle = "#704c32";
    context.beginPath();
    context.moveTo(x - Math.sign(arrow.velocityX) * 9, arrow.y);
    context.lineTo(x + Math.sign(arrow.velocityX) * 8, arrow.y);
    context.stroke();
    context.fillStyle = "#e5d7ad";
    context.beginPath();
    context.moveTo(x + Math.sign(arrow.velocityX) * 11, arrow.y);
    context.lineTo(x + Math.sign(arrow.velocityX) * 5, arrow.y - 4);
    context.lineTo(x + Math.sign(arrow.velocityX) * 5, arrow.y + 4);
    context.closePath();
    context.fill();
  }
  for (const shot of enemyShots) {
    context.fillStyle = "#f18c69";
    context.beginPath();
    context.arc(shot.x - cameraX, shot.y, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffd19a";
    context.beginPath();
    context.arc(shot.x - cameraX - 2, shot.y - 2, 3, 0, Math.PI * 2);
    context.fill();
  }
}

function draw(time = 0) {
  if (!width || !height || !player || !stageData) return;
  context.clearRect(0, 0, width, height);
  drawBackground(time);
  drawGround();
  drawCoins(time);
  drawSpikes();
  drawChests();
  drawGoal();
  drawBoss();
  drawProjectiles();
  drawPlayer();
}

function frame(time) {
  const delta = Math.min((time - lastFrame) / 1000 || 0, 0.033);
  lastFrame = time;
  update(delta);
  draw(time);
  window.requestAnimationFrame(frame);
}

function setKey(event, pressed) {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", " ", "arrowup", "w", "j", "k"].includes(key)) {
    event.preventDefault();
  }
  if (key === "arrowleft" || key === "a") input.left = pressed;
  if (key === "arrowright" || key === "d") input.right = pressed;
  if (!pressed || event.repeat) return;
  if ([" ", "arrowup", "w"].includes(key)) {
    if (state === "ready") startGame();
    else jump();
  } else if (key === "j") {
    attackWithSword();
  } else if (key === "k") {
    attackWithBow();
  }
}

function handleStart() {
  if (state === "clear") advanceStage();
  else startGame();
}

window.addEventListener("keydown", (event) => setKey(event, true));
window.addEventListener("keyup", (event) => setKey(event, false));
window.addEventListener("blur", () => {
  input.left = false;
  input.right = false;
});

startButton.addEventListener("click", handleStart);
restartButton.addEventListener("click", () => {
  resetStage();
  state = "ready";
  showMessage("ready");
});

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  const press = (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    button.classList.add("is-pressed");
    if (control === "jump") {
      if (state === "ready") startGame();
      else jump();
    } else if (control === "sword") {
      attackWithSword();
    } else if (control === "bow") {
      attackWithBow();
    } else {
      input[control] = true;
    }
  };
  const release = () => {
    button.classList.remove("is-pressed");
    if (control === "left" || control === "right") input[control] = false;
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

resizeCanvas();
resetStage();
showMessage("ready");
window.addEventListener("resize", resizeCanvas);
window.requestAnimationFrame(frame);

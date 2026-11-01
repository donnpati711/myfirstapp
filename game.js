const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const message = document.querySelector("#game-message");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const coinCount = document.querySelector("#coin-count");
const messageIcon = document.querySelector("#message-icon");
const messageKicker = document.querySelector("#message-kicker");
const messageTitle = document.querySelector("#message-title");
const messageCopy = document.querySelector("#message-copy");

const WORLD_WIDTH = 3650;
const PLAYER_WIDTH = 27;
const PLAYER_HEIGHT = 36;
const GRAVITY = 1550;
const JUMP_SPEED = 555;
const MOVE_SPEED = 250;

const groundSegments = [
  { x: 0, width: 850 },
  { x: 970, width: 610 },
  { x: 1730, width: 710 },
  { x: 2600, width: 1050 },
];

const platforms = [
  { x: 380, width: 145, height: 72 },
  { x: 1080, width: 145, height: 80 },
  { x: 1900, width: 155, height: 72 },
  { x: 2780, width: 155, height: 78 },
];

const coinLocations = [
  { x: 245, height: 110 },
  { x: 435, height: 145 },
  { x: 535, height: 110 },
  { x: 720, height: 110 },
  { x: 1030, height: 110 },
  { x: 1130, height: 180 },
  { x: 1270, height: 110 },
  { x: 1480, height: 110 },
  { x: 1670, height: 93 },
  { x: 1850, height: 110 },
  { x: 1955, height: 139 },
  { x: 2150, height: 110 },
  { x: 2340, height: 110 },
  { x: 2550, height: 58 },
  { x: 2815, height: 150 },
  { x: 2990, height: 110 },
  { x: 3200, height: 100 },
  { x: 3390, height: 92 },
];

const spikes = [
  { x: 650, width: 34 },
  { x: 1370, width: 34 },
  { x: 2215, width: 34 },
  { x: 3100, width: 34 },
];

const input = { left: false, right: false };
let width = 0;
let height = 0;
let floorY = 0;
let cameraX = 0;
let lastFrame = 0;
let state = "ready";
let coins = [];
let collectedCoins = 0;
let player;

function resetGame() {
  player = {
    x: 70,
    y: floorY - PLAYER_HEIGHT,
    velocityY: 0,
    grounded: true,
    facing: 1,
    runTime: 0,
  };
  cameraX = 0;
  collectedCoins = 0;
  coins = coinLocations.map((coin) => ({ ...coin, collected: false }));
  coinCount.textContent = "0";
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

  if (player?.grounded) {
    player.y += floorY - previousFloor;
  }
  draw();
}

function showMessage(kind) {
  const messages = {
    ready: {
      icon: "✦",
      kicker: "READY, RUNNER?",
      title: "冒険をはじめよう",
      copy: "コインを集めながら、ゴールを目指そう。",
      button: "ゲームスタート",
    },
    lost: {
      icon: "↻",
      kicker: "ONE MORE TRY",
      title: "おっと、落ちちゃった！",
      copy: "大丈夫。もう一度ゴールを目指そう。",
      button: "もう一度遊ぶ",
    },
    won: {
      icon: "✦",
      kicker: "WELL DONE!",
      title: "ゴール！おめでとう",
      copy: `${collectedCoins} 枚のコインを集めたよ。`,
      button: "もう一度遊ぶ",
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
    resetGame();
  }
  state = "playing";
  message.classList.add("is-hidden");
}

function finishGame(result) {
  state = result;
  input.left = false;
  input.right = false;
  showMessage(result);
}

function jump() {
  if (state === "playing" && player.grounded) {
    player.velocityY = -JUMP_SPEED;
    player.grounded = false;
  }
}

function update(delta) {
  if (state !== "playing") return;

  const direction = Number(input.right) - Number(input.left);
  player.x += direction * MOVE_SPEED * delta;
  player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_WIDTH, player.x));
  if (direction !== 0) {
    player.facing = direction;
    player.runTime += delta * 12;
  }

  const previousBottom = player.y + PLAYER_HEIGHT;
  player.velocityY += GRAVITY * delta;
  player.y += player.velocityY * delta;
  player.grounded = false;

  const playerRight = player.x + PLAYER_WIDTH;
  for (const segment of groundSegments) {
    if (
      playerRight > segment.x &&
      player.x < segment.x + segment.width &&
      previousBottom <= floorY &&
      player.y + PLAYER_HEIGHT >= floorY
    ) {
      player.y = floorY - PLAYER_HEIGHT;
      player.velocityY = 0;
      player.grounded = true;
      break;
    }
  }

  if (!player.grounded && player.velocityY >= 0) {
    for (const platform of platforms) {
      const platformY = floorY - platform.height;
      if (
        playerRight > platform.x &&
        player.x < platform.x + platform.width &&
        previousBottom <= platformY &&
        player.y + PLAYER_HEIGHT >= platformY
      ) {
        player.y = platformY - PLAYER_HEIGHT;
        player.velocityY = 0;
        player.grounded = true;
        break;
      }
    }
  }

  if (
    player.grounded &&
    spikes.some((spike) => playerRight > spike.x && player.x < spike.x + spike.width)
  ) {
    finishGame("lost");
    return;
  }

  for (const coin of coins) {
    if (coin.collected) continue;
    const coinX = coin.x + 10;
    const coinY = floorY - coin.height;
    const playerCenterX = player.x + PLAYER_WIDTH / 2;
    const playerCenterY = player.y + PLAYER_HEIGHT / 2;
    if (Math.hypot(playerCenterX - coinX, playerCenterY - coinY) < 27) {
      coin.collected = true;
      collectedCoins += 1;
      coinCount.textContent = String(collectedCoins);
    }
  }

  cameraX = Math.max(0, Math.min(WORLD_WIDTH - width, player.x - width * 0.35));

  if (player.y > height + 80) {
    finishGame("lost");
  } else if (player.x + PLAYER_WIDTH >= 3520) {
    finishGame("won");
  }
}

function drawCloud(x, y, scale = 1) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = "rgba(255, 255, 255, 0.72)";
  context.beginPath();
  context.ellipse(0, 8, 24, 9, 0, 0, Math.PI * 2);
  context.ellipse(-11, 3, 12, 10, 0, 0, Math.PI * 2);
  context.ellipse(4, 0, 14, 14, 0, 0, Math.PI * 2);
  context.ellipse(17, 6, 11, 8, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#a9d2dc");
  sky.addColorStop(1, "#e5ead4");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 236, 177, 0.9)";
  context.beginPath();
  context.arc(width * 0.79, height * 0.2, 29, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 248, 216, 0.24)";
  context.beginPath();
  context.arc(width * 0.79, height * 0.2, 44, 0, Math.PI * 2);
  context.fill();

  const cloudPatternWidth = 390;
  for (let index = 0; index < 5; index += 1) {
    const x = ((index * cloudPatternWidth - cameraX * 0.14) % (width + cloudPatternWidth) + width + cloudPatternWidth) % (width + cloudPatternWidth) - 25;
    drawCloud(x, height * (0.17 + (index % 3) * 0.105), 0.75 + (index % 2) * 0.2);
  }

  const hillBase = floorY + 9;
  context.fillStyle = "#9bbda0";
  context.beginPath();
  context.moveTo(0, hillBase);
  for (let x = -100; x <= width + 120; x += 150) {
    const shiftedX = x - ((cameraX * 0.28) % 300);
    context.quadraticCurveTo(shiftedX + 70, hillBase - 100, shiftedX + 150, hillBase - 13);
  }
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  context.fillStyle = "#82ad87";
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
}

function drawGround() {
  for (const segment of groundSegments) {
    const x = segment.x - cameraX;
    context.fillStyle = "#56875e";
    context.fillRect(x, floorY, segment.width, height - floorY);
    context.fillStyle = "#8cbd77";
    context.fillRect(x, floorY, segment.width, 7);
    context.fillStyle = "rgba(40, 98, 62, 0.18)";
    for (let mark = 20; mark < segment.width; mark += 38) {
      context.fillRect(x + mark, floorY + 19 + (mark % 3) * 8, 3, 3);
    }
  }

  for (const platform of platforms) {
    const x = platform.x - cameraX;
    const y = floorY - platform.height;
    context.fillStyle = "#5f925f";
    context.fillRect(x, y, platform.width, 14);
    context.fillStyle = "#a6ce83";
    context.fillRect(x, y, platform.width, 5);
    context.fillStyle = "rgba(36, 90, 55, 0.16)";
    context.fillRect(x + 8, y + 14, platform.width - 16, 5);
  }
}

function drawCoins(time) {
  for (const coin of coins) {
    if (coin.collected) continue;
    const x = coin.x - cameraX + 10;
    const y = floorY - coin.height + Math.sin(time / 230 + coin.x) * 3;
    context.fillStyle = "rgba(247, 204, 91, 0.2)";
    context.beginPath();
    context.arc(x, y, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f3c653";
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
  for (const spike of spikes) {
    const x = spike.x - cameraX;
    context.fillStyle = "#d97c69";
    context.beginPath();
    context.moveTo(x, floorY + 1);
    context.lineTo(x + spike.width / 2, floorY - 23);
    context.lineTo(x + spike.width, floorY + 1);
    context.closePath();
    context.fill();
    context.fillStyle = "#f0a08a";
    context.beginPath();
    context.moveTo(x + 4, floorY);
    context.lineTo(x + spike.width / 2, floorY - 23);
    context.lineTo(x + spike.width / 2 + 3, floorY);
    context.closePath();
    context.fill();
  }
}

function drawGoal() {
  const x = 3520 - cameraX;
  context.fillStyle = "#7b9271";
  context.fillRect(x, floorY - 110, 5, 110);
  context.fillStyle = "#f1bd52";
  context.beginPath();
  context.moveTo(x + 5, floorY - 108);
  context.lineTo(x + 42, floorY - 97);
  context.lineTo(x + 5, floorY - 83);
  context.closePath();
  context.fill();
  context.fillStyle = "#f8dfa0";
  context.beginPath();
  context.arc(x + 2.5, floorY - 113, 5, 0, Math.PI * 2);
  context.fill();
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

function draw(time = 0) {
  if (!width || !height || !player) return;
  context.clearRect(0, 0, width, height);
  drawBackground();
  drawGround();
  drawCoins(time);
  drawSpikes();
  drawGoal();
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
  if (["arrowleft", "arrowright", " ", "arrowup", "w"].includes(key)) {
    event.preventDefault();
  }
  if (key === "arrowleft" || key === "a") input.left = pressed;
  if (key === "arrowright" || key === "d") input.right = pressed;
  if (pressed && [" ", "arrowup", "w"].includes(key)) {
    if (state === "ready") startGame();
    else jump();
  }
}

window.addEventListener("keydown", (event) => setKey(event, true));
window.addEventListener("keyup", (event) => setKey(event, false));
window.addEventListener("blur", () => {
  input.left = false;
  input.right = false;
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", () => {
  resetGame();
  showMessage("ready");
  state = "ready";
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
    } else {
      input[control] = true;
    }
  };
  const release = () => {
    button.classList.remove("is-pressed");
    if (control !== "jump") input[control] = false;
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

resetGame();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.requestAnimationFrame(frame);

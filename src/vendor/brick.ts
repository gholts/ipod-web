import type * as Model from "../types.js";
// Brick physics and simulated LCD response.
// Preserve original initialization barrier: catalogs load before device state.
import "../data.js";
const gameWidth = 148,
  gameHeight = 101,
  paddleWidth = 30,
  paddleHeight = 4,
  ballRadius = 1.5,
  brickHeight = 4,
  brickColumns = 12,
  brickColumnGap = 2,
  brickRowGap = 4,
  brickMarginX = 3,
  brickMarginY = 3,
  brickWidth =
    (gameWidth - brickMarginX * 2 - (brickColumns - 1) * brickColumnGap) /
    brickColumns,
  initialBrickRows = 2,
  maxBrickRows = 5,
  initialBalls = 3,
  serveDelayMs = 1e3,
  initialTickMs = 40,
  levelSpeedIncrease = 0.1,
  maxSpeedMultiplier = 1.5,
  initialBallVelocity = 1.7,
  initialBallSpeed = Math.hypot(initialBallVelocity, initialBallVelocity),
  paddleSpeedBoost = 0.25,
  paddleSteering = 0.8,
  maxPaddleX = gameWidth - paddleWidth,
  paddleY = gameHeight - paddleHeight;
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
function gameTickMs(level: number) {
  return (
    initialTickMs /
    Math.min(1 + (level - 1) * levelSpeedIncrease, maxSpeedMultiplier)
  );
}
function createBricks(level: number): Model.Brick[] {
  const rows = Math.min(initialBrickRows + level - 1, maxBrickRows),
    bricks = [];
  for (let row = 0; row < rows; row += 1)
    for (let column = 0; column < brickColumns; column += 1)
      bricks.push({
        x: brickMarginX + column * (brickWidth + brickColumnGap),
        y: brickMarginY + row * (brickHeight + brickRowGap),
        destroyed: false,
      });
  return bricks;
}
function createBall(): Model.BrickBall {
  return {
    x: ballRadius,
    y: gameHeight / 2,
    dx: initialBallVelocity,
    dy: initialBallVelocity,
  };
}
function initialGameState(): Model.GameState {
  return {
    paddleX: maxPaddleX / 2,
    ball: createBall(),
    isBallInPlay: false,
    serveTicks: 0,
    bricks: createBricks(1),
    score: 0,
    balls: initialBalls,
    level: 1,
    isGameOver: false,
  };
}
function createBrickGame() {
  const state = initialGameState();
  function prepareServe() {
    state.ball = createBall();
    state.isBallInPlay = false;
    state.serveTicks = Math.round(serveDelayMs / gameTickMs(state.level));
  }
  function loseBall() {
    state.balls -= 1;
    if (state.balls > 0) {
      prepareServe();
    } else {
      state.isBallInPlay = false;
      state.isGameOver = true;
    }
  }
  function advanceLevel() {
    state.level += 1;
    state.bricks = createBricks(state.level);
    prepareServe();
  }
  function bounceFromPaddle() {
    const { ball } = state,
      halfPaddle = paddleWidth / 2,
      offset = clamp(
        (ball.x - (state.paddleX + halfPaddle)) / halfPaddle,
        -1,
        1,
      ),
      speed = initialBallSpeed * (1 + Math.abs(offset) * paddleSpeedBoost),
      horizontal = offset * paddleSteering,
      magnitude = Math.hypot(horizontal, 1);
    ball.dx = (horizontal / magnitude) * speed;
    ball.dy = -speed / magnitude;
  }
  function brickCollision(index: number) {
    var neighbor;
    const { ball, bricks } = state,
      { x, y, destroyed } = bricks[index],
      neighborIndex = index - Math.sign(ball.dx);
    if (
      destroyed ||
      ball.x + ballRadius < x ||
      ball.x - ballRadius > x + brickWidth ||
      ball.y + ballRadius < y ||
      ball.y - ballRadius > y + brickHeight
    )
      return null;
    const overlapX =
        ball.dx > 0
          ? ball.x + ballRadius - x
          : x + brickWidth - ball.x + ballRadius,
      overlapY =
        ball.dy > 0
          ? ball.y + ballRadius - y
          : y + brickHeight - ball.y + ballRadius;
    return !(
      Math.floor(neighborIndex / brickColumns) ===
        Math.floor(index / brickColumns) &&
      ((neighbor = bricks[neighborIndex]) == null
        ? void 0
        : neighbor.destroyed) === false
    ) && overlapX * Math.abs(ball.dy) < overlapY * Math.abs(ball.dx)
      ? (x + brickWidth / 2 - ball.x) * ball.dx > 0
        ? "side"
        : null
      : (y + brickHeight / 2 - ball.y) * ball.dy > 0
        ? "face"
        : null;
  }
  function bounceFromBricks() {
    const { ball } = state;
    for (const [index, brick] of state.bricks.entries()) {
      const collision = brickCollision(index);
      if (collision) {
        brick.destroyed = true;
        state.score += 1;
        if (collision === "face") {
          ball.dy = -ball.dy;
        } else {
          ball.dx = -ball.dx;
        }
        return true;
      }
    }
    return false;
  }
  function tick() {
    const { ball } = state;
    if (state.serveTicks > 0) {
      state.serveTicks -= 1;
      state.isBallInPlay = state.serveTicks === 0;
    }
    if (!state.isBallInPlay) return;
    const abovePaddle = ball.y + ballRadius < paddleY;
    ball.x += ball.dx;
    ball.y += ball.dy;
    if (
      (ball.x <= ballRadius && ball.dx < 0) ||
      (ball.x >= gameWidth - ballRadius && ball.dx > 0)
    ) {
      ball.dx = -ball.dx;
    }
    if (ball.y <= ballRadius && ball.dy < 0) {
      ball.dy = -ball.dy;
    }
    if (ball.y >= gameHeight) {
      loseBall();
      return;
    }
    if (
      ball.dy > 0 &&
      abovePaddle &&
      ball.y + ballRadius >= paddleY &&
      ball.x + ballRadius >= state.paddleX &&
      ball.x - ballRadius <= state.paddleX + paddleWidth
    ) {
      bounceFromPaddle();
    }
    if (
      bounceFromBricks() &&
      state.bricks.every(({ destroyed }) => destroyed)
    ) {
      advanceLevel();
    }
  }
  function movePaddle(fraction: number) {
    if (!state.isGameOver) {
      state.paddleX = clamp(
        state.paddleX + fraction * maxPaddleX,
        0,
        maxPaddleX,
      );
    }
  }
  function launchBall() {
    if (state.isGameOver) {
      Object.assign(state, initialGameState());
    } else {
      state.isBallInPlay = true;
      state.serveTicks = 0;
    }
  }
  return {
    state,
    movePaddle,
    launchBall,
    tick,
  };
}
const lcdRiseMs = 20,
  lcdFallMs = 70,
  lcdFastFallMs = 25,
  lcdThreshold = 1 / 255,
  lcdForeground = 1,
  lcdTrail = 2;
function createLcd(width: number, height: number): Model.Lcd {
  const drive = new Uint8Array(width * height),
    response = new Float32Array(width * height),
    ink = new Float32Array(width * height),
    lastDrive = new Uint8Array(width * height);
  function fade(elapsedMs: number) {
    const rise = 1 - Math.exp(-elapsedMs / lcdRiseMs),
      fall = 1 - Math.exp(-elapsedMs / lcdFallMs),
      fastFall = 1 - Math.exp(-elapsedMs / lcdFastFallMs);
    let changed = false;
    for (let f = 0; f < ink.length; f += 1) {
      const g = drive[f] === 0 ? 0 : 1;
      lastDrive[f] = drive[f] || lastDrive[f];
      if (
        Math.abs(g - response[f]) > lcdThreshold ||
        Math.abs(g - ink[f]) > lcdThreshold
      ) {
        const M = lastDrive[f] === lcdTrail ? fastFall : fall,
          y = g - response[f];
        response[f] += y * (y > 0 ? rise : M);
        const w = response[f] - ink[f];
        ink[f] += w * (w > 0 ? rise : M);
        changed = true;
      } else {
        if (!changed) {
          changed = response[f] !== g || ink[f] !== g;
        }
        response[f] = g;
        ink[f] = g;
      }
    }
    return changed;
  }
  function settle() {
    for (let h = 0; h < ink.length; h += 1) {
      lastDrive[h] = drive[h] || lastDrive[h];
      response[h] = drive[h] === 0 ? 0 : 1;
      ink[h] = response[h];
    }
  }
  return {
    width,
    height,
    drive,
    ink,
    fade,
    settle,
  };
}
const lcdGridContrast = 0.7,
  lcdGridSize = 3;
function lcdGridShade(coordinate: number, gridSize: number) {
  const gridLine = Math.round((coordinate + 0.5) / gridSize) * gridSize;
  return (
    1 -
    (1 - lcdGridContrast) *
      Math.max(0, 1 - Math.abs(coordinate + 0.5 - gridLine))
  );
}
function createGamePainter(e: HTMLCanvasElement, t: Model.Lcd) {
  const context = e.getContext("2d");
  let image: ImageData | undefined,
    pixelIndices = new Int32Array(0),
    pixelShades = new Float32Array(0),
    resolutionQuery: MediaQueryList | undefined;
  function mapPixels() {
    const { width, height } = e,
      scale = width / t.width,
      showGrid = scale > 1;
    pixelIndices = new Int32Array(width * height);
    pixelShades = new Float32Array(width * height);
    for (let w = 0; w < height; w += 1) {
      const E = Math.min(Math.floor((w + 0.5) / scale), t.height - 1),
        I = showGrid ? lcdGridShade(w, scale) : 1;
      for (let x = 0; x < width; x += 1) {
        const U = Math.floor((x + 0.5) / scale),
          C = showGrid ? lcdGridShade(x, scale) : 1;
        pixelIndices[w * width + x] = E * t.width + U;
        pixelShades[w * width + x] = I * C * 255;
      }
    }
  }
  function paint() {
    if (context && image) {
      for (let f = 0; f < pixelIndices.length; f += 1)
        image.data[f * 4 + 3] = t.ink[pixelIndices[f]] * pixelShades[f];
      context.putImageData(image, 0, 0);
    }
  }
  function resize() {
    var colorMatch;
    const style = getComputedStyle(e),
      scale = Number(style.getPropertyValue("--ipod-scale")) || 1,
      displayWidth = Math.round(e.clientWidth * scale * devicePixelRatio),
      pixelWidth =
        displayWidth >= t.width * lcdGridSize ? displayWidth : t.width;
    if (!(image && pixelWidth === e.width)) {
      e.width = pixelWidth;
      e.height = Math.round((pixelWidth * t.height) / t.width);
      mapPixels();
      image =
        context == null ? void 0 : context.createImageData(e.width, e.height);
      if (image) {
        const [E = 0, I = 0, x = 0] =
          ((colorMatch = style.color.match(/\d+/g)) == null
            ? void 0
            : colorMatch.map(Number)) ?? [];
        for (let U = 0; U < image.data.length; U += 4)
          image.data.set([E, I, x], U);
      }
      paint();
    }
  }
  function watchResolution() {
    if (!(resolutionQuery == null)) {
      resolutionQuery.removeEventListener("change", watchResolution);
    }
    resolutionQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    resolutionQuery.addEventListener("change", watchResolution);
    resize();
  }
  const root = e.getRootNode(),
    observer = new ResizeObserver(() => resize());
  observer.observe(
    root instanceof ShadowRoot ? root.host : document.documentElement,
  );
  watchResolution();
  return {
    paint,
    destroy() {
      observer.disconnect();
      if (!(resolutionQuery == null)) {
        resolutionQuery.removeEventListener("change", watchResolution);
      }
    },
  };
}
export {
  ballRadius,
  brickHeight,
  brickWidth,
  createBrickGame,
  createGamePainter,
  createLcd,
  gameHeight,
  gameTickMs,
  gameWidth,
  lcdForeground,
  lcdTrail,
  paddleHeight,
  paddleWidth,
};

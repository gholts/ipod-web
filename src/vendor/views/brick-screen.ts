import type * as Model from "../../types.js";
import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type { BrickProps } from "../view-types.js";
import { BrickSlot } from "../slots.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  onMount,
  bindingCallbacks,
  createSvelteCustomElement,
  detach,
  element,
  flush,
  initComponent,
  insert,
  noop,
  onDestroy,
  safeNotEqual,
  setData,
  space,
  subscribeComponent,
  text,
} from "../runtime.js";
import { paddleTurnScale } from "../settings.js";
import { useI18n } from "../i18n.js";
import {
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
} from "../brick.js";
import { brickCss } from "./styles.js";
type Context = ReturnType<typeof brickInstance>;
function brickStyles(root: DomParent) {
  appendStyles(root, "svelte-80k3la", brickCss);
}
function renderBrick(context: Context) {
  let brickGameScreen: HTMLDivElement,
    gameArea: HTMLCanvasElement,
    spacer: Text,
    gameMessage: HTMLParagraphElement,
    messageText: Text;
  return {
    create() {
      brickGameScreen = element("div");
      gameArea = element("canvas");
      spacer = space();
      gameMessage = element("p");
      messageText = text(context[BrickSlot.message]);
      attr(gameArea, "class", "game-area svelte-80k3la");
      attr(gameArea, "data-testid", "game-area");
      attr(gameArea, "aria-hidden", "true");
      attr(gameArea, "width", gameWidth);
      attr(gameArea, "height", gameHeight);
      attr(gameMessage, "class", "game-message svelte-80k3la");
      attr(gameMessage, "data-testid", "game-message");
      attr(gameMessage, "role", "status");
      attr(brickGameScreen, "class", "brick-game-screen svelte-80k3la");
      attr(brickGameScreen, "data-testid", "brick-game");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, brickGameScreen, anchor);
      append(brickGameScreen, gameArea);
      context[BrickSlot.bindCanvas](gameArea);
      append(brickGameScreen, spacer);
      append(brickGameScreen, gameMessage);
      append(gameMessage, messageText);
    },
    update(nextContext: Context, [dirty]: number[]) {
      if (dirty & 2) {
        setData(messageText, nextContext[BrickSlot.message]);
      }
    },
    intro: noop,
    outro: noop,
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(brickGameScreen);
      }
      context[BrickSlot.bindCanvas](null);
    },
  };
}
const paddleKeyStep = 10;
function brickInstance(
  component: Component<unknown[], BrickProps>,
  props: BrickProps,
  invalidate: Invalidate,
) {
  let translations!: Model.I18n,
    { paused = false } = props,
    { score = 0 } = props,
    { balls = 0 } = props;
  const i18n = useI18n();
  subscribeComponent(component, i18n, (value) =>
    invalidate(BrickSlot.translations, (translations = value)),
  );
  const game = createBrickGame(),
    lcd = createLcd(gameWidth, gameHeight);
  let { state } = game,
    canvas!: HTMLCanvasElement,
    painter!: ReturnType<typeof createGamePainter> | undefined,
    animationFrame!: number | undefined,
    lastFrameTime!: number | undefined,
    accumulatedTime = 0,
    pixelsDirty = false,
    paddleDirection = 0,
    paddleMoved = false;
  function syncState() {
    invalidate(BrickSlot.state, (state = game.state));
    invalidate(
      BrickSlot.score,
      ({ score, balls } = state),
      score,
      invalidate(BrickSlot.balls, balls),
    );
  }
  function drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    ink: number = lcdForeground,
  ) {
    const left = Math.round(x),
      top = Math.round(y),
      clippedLeft = Math.max(left, 0),
      right = Math.min(left + width, gameWidth),
      bottom = Math.min(top + height, gameHeight);
    for (let value6 = Math.max(top, 0); value6 < bottom; value6 += 1)
      lcd.drive.fill(
        ink,
        value6 * gameWidth + clippedLeft,
        value6 * gameWidth + right,
      );
  }
  function drawGame() {
    lcd.drive.fill(0);
    for (const value of state.bricks)
      if (!value.destroyed) {
        drawRect(value.x, value.y, brickWidth, brickHeight);
      }
    drawRect(
      state.paddleX,
      gameHeight - paddleHeight,
      paddleWidth,
      paddleHeight,
      lcdTrail,
    );
    drawRect(
      state.ball.x - ballRadius,
      state.ball.y - ballRadius,
      ballRadius * 2,
      ballRadius * 2,
    );
    pixelsDirty = false;
  }
  function tickFrame(time: number) {
    const elapsed = lastFrameTime === void 0 ? 0 : time - lastFrameTime,
      tickDuration = gameTickMs(state.level);
    lastFrameTime = time;
    accumulatedTime = Math.min(
      accumulatedTime + elapsed,
      tickDuration * paddleKeyStep,
    );
    let advanced = false;
    for (; accumulatedTime >= tickDuration;) {
      accumulatedTime -= tickDuration;
      advanced = true;
      if (!paused) {
        game.movePaddle(paddleDirection * paddleTurnScale);
        if (!paddleMoved) {
          paddleMoved = paddleDirection !== 0;
        }
        game.tick();
      }
    }
    if (advanced) {
      drawGame();
      syncState();
    }
    const fading = lcd.fade(elapsed);
    if (advanced || fading) {
      if (!(painter == null)) {
        painter.paint();
      }
    }
    animationFrame =
      ((state.isBallInPlay || state.serveTicks > 0) && !paused) ||
      pixelsDirty ||
      fading ||
      (paddleDirection !== 0 && !paused)
        ? requestAnimationFrame(tickFrame)
        : void 0;
  }
  function startFrames() {
    if (animationFrame === void 0) {
      lastFrameTime = void 0;
      animationFrame = requestAnimationFrame(tickFrame);
    }
  }
  function stopFrames() {
    if (animationFrame !== void 0) {
      cancelAnimationFrame(animationFrame);
      animationFrame = void 0;
    }
  }
  function movePaddle(amount: number) {
    game.movePaddle(amount);
    pixelsDirty = true;
    startFrames();
  }
  function steerPaddle(direction: number) {
    if (direction === 0 && !paddleMoved && !paused) {
      movePaddle(paddleDirection * paddleTurnScale);
    }
    paddleDirection = direction;
    paddleMoved = false;
    startFrames();
  }
  function launchBall() {
    game.launchBall();
    pixelsDirty = true;
    syncState();
    startFrames();
  }
  onMount(
    () => (
      drawGame(),
      lcd.settle(),
      (painter = createGamePainter(canvas, lcd)),
      () => (painter == null ? void 0 : painter.destroy())
    ),
  );
  syncState();
  onDestroy(stopFrames);
  let message = "";
  function bindCanvas(canvasNode: HTMLCanvasElement | null) {
    bindingCallbacks[canvasNode ? "unshift" : "push"](() => {
      canvas = canvasNode!;
      invalidate(BrickSlot.canvas, canvas);
    });
  }
  component.$$set = (value) => {
    if ("paused" in value) {
      invalidate(BrickSlot.paused, (paused = value.paused!));
    }
    if ("score" in value) {
      invalidate(BrickSlot.score, (score = value.score!));
    }
    if ("balls" in value) {
      invalidate(BrickSlot.balls, (balls = value.balls!));
    }
  };
  component.$$.update = () => {
    if (component.$$.dirty[0] & (1 << BrickSlot.paused)) {
      if (!paused) {
        startFrames();
      }
    }
    if (
      component.$$.dirty[0] &
      ((1 << BrickSlot.state) | (1 << BrickSlot.translations))
    ) {
      if (state.isGameOver) {
        invalidate(
          BrickSlot.message,
          (message = translations.t("ASE.Web.IPod.Game.GameOver")),
        );
      } else if (state.isBallInPlay || state.serveTicks > 0) {
        invalidate(BrickSlot.message, (message = ""));
      } else {
        invalidate(
          BrickSlot.message,
          (message = translations.t("ASE.Web.IPod.Game.LaunchBall")),
        );
      }
    }
  };
  return [
    canvas,
    message,
    i18n,
    score,
    balls,
    paused,
    movePaddle,
    steerPaddle,
    launchBall,
    state,
    translations,
    bindCanvas,
  ] satisfies [unknown, ...unknown[]];
}
class BrickScreen extends SvelteComponent<Context, BrickProps> {
  constructor(options: ComponentOptions<BrickProps>) {
    super();
    initComponent(
      this,
      options,
      brickInstance,
      renderBrick,
      safeNotEqual,
      {
        paused: BrickSlot.paused,
        score: BrickSlot.score,
        balls: BrickSlot.balls,
        movePaddle: BrickSlot.movePaddle,
        steerPaddle: BrickSlot.steerPaddle,
        launchBall: BrickSlot.launchBall,
      },
      brickStyles,
    );
  }
  get paused() {
    return this.$$.ctx[BrickSlot.paused]!;
  }
  set paused(paused: BrickProps["paused"]) {
    this.$$set!({
      paused,
    });
    flush();
  }
  get score() {
    return this.$$.ctx[BrickSlot.score]!;
  }
  set score(score: BrickProps["score"]) {
    this.$$set!({
      score,
    });
    flush();
  }
  get balls() {
    return this.$$.ctx[BrickSlot.balls]!;
  }
  set balls(balls: BrickProps["balls"]) {
    this.$$set!({
      balls,
    });
    flush();
  }
  get movePaddle() {
    return this.$$.ctx[BrickSlot.movePaddle]!;
  }
  get steerPaddle() {
    return this.$$.ctx[BrickSlot.steerPaddle]!;
  }
  get launchBall() {
    return this.$$.ctx[BrickSlot.launchBall]!;
  }
}
createSvelteCustomElement(
  BrickScreen,
  {
    paused: {
      type: "Boolean",
    },
    score: {},
    balls: {},
  },
  [],
  ["movePaddle", "steerPaddle", "launchBall"],
  true,
);
export { BrickScreen };

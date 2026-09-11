type Point = {
  x: number;
  y: number;
};

type Particle = {
  position: Point;
  velocity: Point;
  age: number;
  life: number;
  size: number;
};

type BlockedInput = 'blur' | 'pointer-leave' | null;

type InputState = {
  active: boolean;
  pressed: boolean;
  blockedBy: BlockedInput;
};

type GateState = {
  finePointer: boolean;
  reducedMotion: boolean;
  visible: boolean;
};

type EngineState = 'disabled' | 'running' | 'settled';

type DisabledReason =
  | 'none'
  | 'initializing'
  | 'reduced-motion'
  | 'coarse-pointer'
  | 'hidden'
  | Exclude<BlockedInput, null>;

type CursorRuntime = {
  position: Point;
  target: Point;
  velocity: Point;
  input: InputState;
  gate: GateState;
  particles: Particle[];
  carry: number;
  lastFrame: number;
  frameId: number;
  emittedTotal: number;
  state: EngineState;
  disabledReason: DisabledReason;
  disposed: boolean;
};

type CursorLayers = {
  inversion: HTMLCanvasElement;
  color: HTMLCanvasElement;
};

type CursorContexts = {
  inversion: CanvasRenderingContext2D;
  color: CanvasRenderingContext2D;
};

const WING_BITMAP = [
  '11000000011',
  '11100000111',
  '11110001111',
  '11111011111',
  '01111111110',
  '00111111100',
  '01111111110',
  '01111011110',
  '00110001100',
  '00010001000',
] as const;

const HEART_BITMAP = ['01010', '11111', '11111', '01110', '00100'] as const;
const SPRING = 78;
const DAMPING = 12;
const EMISSION_RATE = 35;
const PRESS_MULTIPLIER = 2.2;
const GRAVITY = 48;
const MAX_PARTICLES = 240;
const MAX_DELTA_SECONDS = 0.032;
const MAX_DEVICE_PIXEL_RATIO = 2;
const SETTLE_DISTANCE = 0.25;
const SETTLE_SPEED = 0.25;

function disabledReason(runtime: CursorRuntime): DisabledReason {
  if (runtime.gate.reducedMotion) return 'reduced-motion';
  if (!runtime.gate.finePointer) return 'coarse-pointer';
  if (!runtime.gate.visible) return 'hidden';
  return runtime.input.blockedBy ?? 'none';
}

function drawWing(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = 'white';
  for (let row = 0; row < WING_BITMAP.length; row += 1) {
    for (let column = 0; column < WING_BITMAP[row].length; column += 1) {
      if (WING_BITMAP[row][column] === '0') continue;
      if (row % 3 === 1 && (column === 2 || column === 8)) continue;
      context.fillRect(x + (column - 5.5) * 4, y + (row - 4.5) * 4, 4, 4);
    }
  }
}

function drawHeart(context: CanvasRenderingContext2D, x: number, y: number) {
  for (let row = 0; row < HEART_BITMAP.length; row += 1) {
    for (let column = 0; column < HEART_BITMAP[row].length; column += 1) {
      if (HEART_BITMAP[row][column] === '1') {
        context.fillRect(x + column * 2, y + row * 2, 2, 2);
      }
    }
  }
}

function getContexts({ inversion, color }: CursorLayers): CursorContexts | null {
  const inversionContext = inversion.getContext('2d');
  const colorContext = color.getContext('2d');
  if (!inversionContext || !colorContext) return null;
  return { inversion: inversionContext, color: colorContext };
}

export function startPixelWishesCursor({ inversion, color }: CursorLayers): () => void {
  const contexts = getContexts({ inversion, color });
  if (!contexts) return () => {};
  const { inversion: inversionContext, color: colorContext } = contexts;

  const finePointer = window.matchMedia('(pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const initial = { x: window.innerWidth * 0.65, y: window.innerHeight * 0.42 };
  const runtime: CursorRuntime = {
    position: { ...initial },
    target: { ...initial },
    velocity: { x: 0, y: 0 },
    input: { active: false, pressed: false, blockedBy: null },
    gate: {
      finePointer: finePointer.matches,
      reducedMotion: reducedMotion.matches,
      visible: document.visibilityState === 'visible',
    },
    particles: [],
    carry: 0,
    lastFrame: 0,
    frameId: 0,
    emittedTotal: 0,
    state: 'disabled',
    disabledReason: 'initializing',
    disposed: false,
  };
  const canvases = [inversion, color];

  function setState(state: EngineState, reason: DisabledReason) {
    if (runtime.state === state && runtime.disabledReason === reason) return;
    runtime.state = state;
    runtime.disabledReason = reason;
    for (const canvas of canvases) {
      canvas.dataset.pixelWishesState = state;
      canvas.dataset.pixelWishesDisabledReason = reason;
    }
  }

  function setParticleDiagnostics() {
    const particleCount = String(runtime.particles.length);
    const emittedTotal = String(runtime.emittedTotal);
    for (const canvas of canvases) {
      canvas.dataset.pixelWishesParticleCount = particleCount;
      canvas.dataset.pixelWishesEmittedTotal = emittedTotal;
    }
  }

  function clearCanvases() {
    inversionContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    colorContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function cancelFrame() {
    if (runtime.frameId) cancelAnimationFrame(runtime.frameId);
    runtime.frameId = 0;
    runtime.lastFrame = 0;
  }

  function disable(reason: DisabledReason) {
    cancelFrame();
    runtime.input.active = false;
    runtime.input.pressed = false;
    runtime.particles.length = 0;
    runtime.carry = 0;
    clearCanvases();
    setParticleDiagnostics();
    setState('disabled', reason);
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    for (const canvas of canvases) {
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
    }
    for (const context of [inversionContext, colorContext]) {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
    }
    if (runtime.input.active && disabledReason(runtime) === 'none') wake();
  }

  function emit(deltaSeconds: number, speed: number) {
    runtime.carry += deltaSeconds * EMISSION_RATE * Math.min(2, speed / 100) *
      (runtime.input.pressed ? PRESS_MULTIPLIER : 1);
    while (runtime.carry >= 1 && runtime.particles.length < MAX_PARTICLES) {
      runtime.carry -= 1;
      const size = Math.random() * 3 + 1;
      runtime.particles.push({
        position: {
          x: runtime.position.x + (Math.random() - 0.5) * 30,
          y: runtime.position.y + (Math.random() - 0.5) * 12,
        },
        velocity: {
          x: (Math.random() - 0.5) * 35 - runtime.velocity.x * 0.04,
          y: Math.random() * 12 + 8,
        },
        age: 0,
        life: 1.1 + Math.random() * 0.9,
        size,
      });
      runtime.emittedTotal += 1;
    }
  }

  function step(deltaSeconds: number) {
    runtime.velocity.x += (runtime.target.x - runtime.position.x) * SPRING * deltaSeconds;
    runtime.velocity.y += (runtime.target.y - runtime.position.y) * SPRING * deltaSeconds;
    const damping = Math.exp(-DAMPING * deltaSeconds);
    runtime.velocity.x *= damping;
    runtime.velocity.y *= damping;
    runtime.position.x += runtime.velocity.x * deltaSeconds;
    runtime.position.y += runtime.velocity.y * deltaSeconds;
    emit(deltaSeconds, Math.hypot(runtime.velocity.x, runtime.velocity.y));

    for (const particle of runtime.particles) {
      particle.age += deltaSeconds;
      particle.velocity.y += GRAVITY * deltaSeconds;
      particle.position.x += particle.velocity.x * deltaSeconds;
      particle.position.y += particle.velocity.y * deltaSeconds;
    }
    runtime.particles = runtime.particles.filter((particle) => particle.age < particle.life);
  }

  function draw(timeSeconds: number) {
    clearCanvases();
    for (const particle of runtime.particles) {
      const alpha = Math.pow(Math.max(0, 1 - particle.age / particle.life), 1.5);
      const sparkX = Math.round(particle.position.x / 2) * 2;
      const sparkY = Math.round(particle.position.y / 2) * 2;
      inversionContext.globalAlpha = alpha;
      inversionContext.fillStyle = 'white';
      inversionContext.fillRect(sparkX, sparkY, 2, 2);
      if (particle.size > 2.8) {
        colorContext.globalAlpha = alpha;
        colorContext.fillStyle = '#ff5bae';
        drawHeart(colorContext, sparkX, sparkY);
      }
    }
    inversionContext.globalAlpha = 1;
    colorContext.globalAlpha = 1;

    if (!runtime.input.active) return;
    const x = Math.round(runtime.position.x / 3) * 3;
    const y = Math.round(runtime.position.y / 3) * 3;
    inversionContext.save();
    inversionContext.translate(x, y);
    inversionContext.scale(0.78 + 0.22 * Math.round(Math.sin(timeSeconds * 8)), 1);
    drawWing(inversionContext, 0, 0);
    inversionContext.restore();
    colorContext.fillStyle = '#ff9fd3';
    colorContext.fillRect(x - 2, y - 7, 4, 21);
  }

  function shouldContinue() {
    const distance = Math.hypot(
      runtime.target.x - runtime.position.x,
      runtime.target.y - runtime.position.y,
    );
    const speed = Math.hypot(runtime.velocity.x, runtime.velocity.y);
    return runtime.particles.length > 0 || (runtime.input.active &&
      (distance > SETTLE_DISTANCE || speed > SETTLE_SPEED));
  }

  function tick(now: number) {
    runtime.frameId = 0;
    if (runtime.disposed) return;
    const reason = disabledReason(runtime);
    if (reason !== 'none') {
      disable(reason);
      return;
    }
    const deltaSeconds = runtime.lastFrame
      ? Math.min((now - runtime.lastFrame) / 1000, MAX_DELTA_SECONDS)
      : 0;
    runtime.lastFrame = now;
    if (deltaSeconds > 0) step(deltaSeconds);
    draw(now / 1000);
    setParticleDiagnostics();
    if (shouldContinue()) {
      setState('running', 'none');
      runtime.frameId = requestAnimationFrame(tick);
      return;
    }
    runtime.lastFrame = 0;
    setState('settled', 'none');
  }

  function wake() {
    if (runtime.frameId || runtime.disposed || disabledReason(runtime) !== 'none') return;
    setState('running', 'none');
    runtime.lastFrame = 0;
    runtime.frameId = requestAnimationFrame(tick);
  }

  function syncGate() {
    runtime.gate.finePointer = finePointer.matches;
    runtime.gate.reducedMotion = reducedMotion.matches;
    runtime.gate.visible = document.visibilityState === 'visible';
    const reason = disabledReason(runtime);
    if (reason !== 'none') {
      disable(reason);
      return;
    }
    setState('settled', 'none');
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    runtime.input.blockedBy = null;
    if (disabledReason(runtime) !== 'none') return;
    runtime.target.x = event.clientX;
    runtime.target.y = event.clientY;
    if (!runtime.input.active) {
      runtime.position.x = event.clientX;
      runtime.position.y = event.clientY;
      runtime.velocity.x = 0;
      runtime.velocity.y = 0;
      runtime.input.active = true;
    }
    wake();
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch' || disabledReason(runtime) !== 'none') return;
    runtime.input.pressed = true;
    wake();
  }

  function onPointerUp() {
    runtime.input.pressed = false;
  }

  function blockInput(reason: Exclude<BlockedInput, null>) {
    runtime.input.blockedBy = reason;
    disable(disabledReason(runtime));
  }

  function onVisibilityChange() {
    syncGate();
  }

  function onFinePointerChange() {
    syncGate();
  }

  function onReducedMotionChange() {
    syncGate();
  }

  function onBlur() {
    blockInput('blur');
  }

  function onPointerLeave() {
    blockInput('pointer-leave');
  }

  resize();
  syncGate();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  window.addEventListener('blur', onBlur, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
  finePointer.addEventListener('change', onFinePointerChange, { passive: true });
  reducedMotion.addEventListener('change', onReducedMotionChange, { passive: true });

  return () => {
    if (runtime.disposed) return;
    runtime.disposed = true;
    cancelFrame();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('blur', onBlur);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    finePointer.removeEventListener('change', onFinePointerChange);
    reducedMotion.removeEventListener('change', onReducedMotionChange);
    clearCanvases();
  };
}

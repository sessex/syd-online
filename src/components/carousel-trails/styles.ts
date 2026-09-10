// Each cutout keeps its own treatment while sharing one motion envelope.
const timing = { lifetime: 2200, interval: 180 } as const;

export const TRAIL_STYLES = {
  echo: { id: 0, ...timing },
  sparks: { id: 1, ...timing },
  thermal: { id: 2, ...timing },
  glitch: { id: 3, ...timing },
  chrome: { id: 4, ...timing },
} as const;

export type TrailStyle = keyof typeof TRAIL_STYLES;

export const HERO_IMAGE_FRAME_DEFAULT = Object.freeze({
  zoom: 1,
  x: 0,
  y: 0,
});

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function normalizeHeroImageFrame(value) {
  if (!value || typeof value !== "object") return { ...HERO_IMAGE_FRAME_DEFAULT };

  return {
    zoom: clamp(value.zoom, 1, 2.5),
    x: clamp(value.x, -100, 100),
    y: clamp(value.y, -100, 100),
  };
}

export function heroImageFrameToObjectPosition(frame) {
  const next = normalizeHeroImageFrame(frame);
  return `${50 + next.x / 2}% ${50 + next.y / 2}%`;
}

export function heroImageFrameStyle(frame) {
  const next = normalizeHeroImageFrame(frame);
  return {
    objectPosition: heroImageFrameToObjectPosition(next),
    "--hero-scale": String(next.zoom),
    "--hero-scale-hover": String(Number((next.zoom * 1.05).toFixed(4))),
  };
}

// Helpers shared by the recipe tests in recipes/assets/*/test.mjs.
import { PNG } from 'pngjs';

/** Wait two frames, so scroll-driven animations catch up with a scroll. */
export const settle = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Supports scroll-driven animations, which both fade implementations need. */
export const hasScrollTimelines = (page) => page.evaluate(() => CSS.supports('animation-timeline: scroll()'));

/** The rendered colour at a point in the viewport, as [r, g, b]. */
export async function rgbAt(page, x, y) {
  const png = PNG.sync.read(await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } }));
  return [png.data[0], png.data[1], png.data[2]];
}

export const RED = [255, 0, 0];
export const BLUE = [0, 0, 255];
export const LIME = [0, 255, 0];
export const BLACK = [0, 0, 0];

/** True when every channel is within `tolerance` of the target colour. */
export const near = (rgb, target, tolerance = 60) => rgb.every((c, i) => Math.abs(c - target[i]) <= tolerance);

/**
 * Which sides of an element show a focus ring of `color` in the band just outside it.
 * Returns { top, right, bottom, left }, each true when that side has ring pixels.
 */
export async function ringSides(page, locator, color = LIME, band = 6) {
  const b = await locator.boundingBox();
  const clip = {
    x: Math.round(b.x - band),
    y: Math.round(b.y - band),
    width: Math.round(b.width + band * 2),
    height: Math.round(b.height + band * 2),
  };
  const png = PNG.sync.read(await page.screenshot({ clip }));
  const sides = { top: false, right: false, bottom: false, left: false };
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (!near([png.data[i], png.data[i + 1], png.data[i + 2]], color, 40)) continue;
      const inX = x >= band && x < png.width - band;
      const inY = y >= band && y < png.height - band;
      if (y < band && inX) sides.top = true;
      if (y >= png.height - band && inX) sides.bottom = true;
      if (x < band && inY) sides.left = true;
      if (x >= png.width - band && inY) sides.right = true;
    }
  }
  return sides;
}

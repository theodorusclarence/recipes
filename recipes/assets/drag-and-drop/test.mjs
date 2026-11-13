// Browser tests for recipes/drag-and-drop.md. Each test drags a row on test.html (cases in
// fixture.jsx) with the mouse or keyboard and reads boxes every frame, or reads pixels.
import { expect, test } from '@playwright/test';
import { BLUE, near, rgbAt } from '../../../scripts/test-helpers.mjs';

const ROWS = ['a', 'b', 'c', 'd', 'e'];

const snap = (page, id) => page.evaluate((id) => window.snap(id), id);
const record = (page, id) => page.evaluate((id) => window.record(id), id);
const stop = (page) => page.evaluate(() => window.stop());
const now = (page) => page.evaluate(() => performance.now());

async function pressHandle(page, id, row) {
  const h = await page.locator(`[data-case="${id}"] [data-row="${row}"] [data-handle]`).boundingBox();
  const x = h.x + h.width / 2;
  const y = h.y + h.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(150); // past the 70ms hold
  return { x, y };
}

/** Drags Row 2 onto Row 4 and returns boxes at each step, plus every frame in between. */
async function dragRow2ToRow4(page, id) {
  const initial = await snap(page, id);
  await record(page, id);
  const { x, y } = await pressHandle(page, id, 'b');
  const lifted = await snap(page, id);
  await page.mouse.move(x, y + initial.rows.d.cy - initial.rows.b.cy, { steps: 12 });
  await page.waitForTimeout(400);
  const moved = await snap(page, id);
  const upAt = await now(page);
  await page.mouse.up();
  await page.waitForTimeout(800);
  const settled = await snap(page, id);
  const frames = await stop(page);
  return { initial, lifted, moved, settled, frames, upAt };
}

const most = (values) => Math.max(...values.map(Math.abs));
const shift = (from, to) => most(ROWS.map((r) => to.rows[r].y - from.rows[r].y));
const lastCopy = (frames) => frames.filter((f) => f.copy).at(-1);

test.beforeEach(async ({ page }) => {
  await page.goto(new URL('./test.html', import.meta.url).href);
  await page.waitForSelector('[data-case="recipe"] [data-row]');
});

for (const id of ['recipe', 'r1-margins', 'r1-uneven']) {
  test(`Rule 1: no layout shift on lift, move or drop (${id})`, async ({ page }) => {
    const d = await dragRow2ToRow4(page, id);
    const heights = d.frames.map((f) => f.list.h);
    expect(Math.max(...heights) - Math.min(...heights), 'list height changed').toBeLessThanOrEqual(0.5);
    expect(shift(d.initial, d.lifted), 'a row moved on lift').toBeLessThanOrEqual(0.5);
    expect(most(ROWS.map((r) => d.moved.rows[r].h - d.initial.rows[r].h)), 'a row changed height').toBeLessThanOrEqual(0.5);
    expect(shift(d.moved, d.settled), 'a row jumped on drop').toBeLessThanOrEqual(0.5);
    const copy = lastCopy(d.frames).copy;
    expect(most([copy.cx - d.settled.rows.b.cx, copy.cy - d.settled.rows.b.cy]), 'copy missed the row').toBeLessThanOrEqual(1);
    expect(d.settled.order.join('')).toBe('acdbe');
  });
}

test('Rule 1 no: the default strategy scales rows of different heights', async ({ page }) => {
  const d = await dragRow2ToRow4(page, 'r1-scale');
  expect(most(ROWS.map((r) => d.moved.rows[r].h - d.initial.rows[r].h)), 'no row was squeezed').toBeGreaterThan(10);
  expect(shift(d.moved, d.settled), 'no row jumped on drop').toBeGreaterThan(10);
});

test('Rule 1 no: a slot that shrinks moves the rows below it on lift', async ({ page }) => {
  const d = await dragRow2ToRow4(page, 'r1-slot');
  expect(d.initial.list.h - d.lifted.list.h).toBeGreaterThan(30);
  expect(shift(d.initial, d.lifted)).toBeGreaterThan(30);
});

for (const [id, opaque] of [['recipe', true], ['r2-ghost', false]]) {
  test(`Rule 2: the lifted copy is opaque (${id})`, async ({ page }) => {
    const initial = await snap(page, id);
    const { x, y } = await pressHandle(page, id, 'b');
    await page.mouse.move(x, y + 30, { steps: 6 });
    await page.waitForTimeout(400);
    const opacity = await page.evaluate((id) => {
      const el =
        document.querySelector(`[data-overlay="${id}"]`) ??
        document.querySelector(`[data-case="${id}"] [data-row="b"]`);
      let o = 1;
      for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    }, id);
    // The gap below Row 2's old place: red surface, now under the lifted row.
    const rgb = await rgbAt(page, initial.rows.b.cx, initial.rows.b.y + initial.rows.b.h + 4);
    await page.mouse.up();
    if (opaque) {
      expect(opacity).toBe(1);
      expect(near(rgb, BLUE), `saw ${rgb}`).toBe(true);
    } else {
      expect(opacity).toBe(0.5);
      expect(near(rgb, BLUE), `saw ${rgb}`).toBe(false);
    }
  });
}

test('Rule 5 no: a tilt on the copy’s root lands off the row', async ({ page }) => {
  const d = await dragRow2ToRow4(page, 'r5-tilt');
  const copy = lastCopy(d.frames).copy;
  expect(most([copy.cx - d.settled.rows.b.cx, copy.cy - d.settled.rows.b.cy])).toBeGreaterThan(1.5);
});

for (const [id, animates] of [['recipe', true], ['r6-default', false]]) {
  test(`Rule 6: a drop in place still settles (${id})`, async ({ page }) => {
    await record(page, id);
    await pressHandle(page, id, 'b');
    await page.waitForTimeout(300);
    const upAt = await now(page);
    await page.mouse.up();
    await page.waitForTimeout(500);
    const lived = lastCopy(await stop(page)).t - upAt;
    if (animates) expect(lived).toBeGreaterThan(150);
    else expect(lived).toBeLessThan(50);
  });
}

test('Rule 9: the keyboard reorders, and a keyboard drop does not animate', async ({ page }) => {
  await page.locator('[data-case="recipe"] [data-row="a"] [data-handle]').focus();
  for (const key of ['Space', 'ArrowDown', 'ArrowDown']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
  await record(page, 'recipe');
  const upAt = await now(page);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  const frames = await stop(page);
  expect(lastCopy(frames).t - upAt).toBeLessThan(50);
  expect((await snap(page, 'recipe')).order.join('')).toBe('bcade');
});

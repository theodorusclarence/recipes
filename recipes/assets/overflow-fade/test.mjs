// Tests for recipes/overflow-fade.md, run against both implementations in its Setup table.
// Rules 4 (scrollbar inset) and 5 (iOS overscroll) are checked by hand; see the recipe.
import { test, expect } from '@playwright/test';
import { BLACK, BLUE, RED, hasScrollTimelines, near, rgbAt, ringSides, settle } from '../../../scripts/test-helpers.mjs';

const page = (c) => `[data-case="${c}"]`;

/** Colour of the content 1px inside the top and bottom edge of a scroller. */
async function edges(p, box) {
  const b = await box.boundingBox();
  const x = b.x + b.width / 2;
  return { top: await rgbAt(p, x, b.y + 1), bottom: await rgbAt(p, x, b.y + b.height - 2) };
}

async function scrollTo(p, box, where) {
  await box.evaluate((el, where) => {
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = where === 'top' ? 0 : where === 'end' ? max : max / 2;
  }, where);
  await settle(p);
}

/**
 * Focus the row next to the hidden part of a list, press Tab (or Shift+Tab) into the hidden
 * part, and measure where the browser scrolled the newly focused row.
 */
async function tabInto(p, box, direction, browserName) {
  const k = await box.evaluate((el, direction) => {
    const rows = [...el.children];
    const r = el.getBoundingClientRect();
    if (direction === 'down') {
      el.scrollTop = 0;
      const k = rows.findIndex((row) => row.getBoundingClientRect().bottom > r.bottom);
      rows[k - 1].focus({ preventScroll: true });
      return k;
    }
    el.scrollTop = el.scrollHeight;
    const k = rows.findLastIndex((row) => row.getBoundingClientRect().top < r.top);
    rows[k + 1].focus({ preventScroll: true });
    return k;
  }, direction);
  // Safari's Tab skips buttons unless "Press Tab to highlight each item" is on; Option+Tab reaches them.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await p.keyboard.press(direction === 'down' ? tab : `Shift+${tab}`);
  await settle(p);
  return box.evaluate((el, k) => {
    const row = el.children[k];
    const r = el.getBoundingClientRect();
    const x = row.getBoundingClientRect();
    return {
      focused: document.activeElement === row,
      gap: { top: x.top - r.top, bottom: r.bottom - x.bottom },
      band: Math.min(el.clientHeight * 0.12, 48),
    };
  }, k);
}

for (const impl of ['fade', 'tw-fade']) {
  test.describe(impl, () => {
    let scrollTimelines;

    test.beforeEach(async ({ page: p }) => {
      await p.goto(new URL(`./test.html?impl=${impl}`, import.meta.url).href);
      await settle(p);
      scrollTimelines = await hasScrollTimelines(p);
      if (!scrollTimelines)
        test.info().annotations.push({ type: 'fallback', description: 'no scroll-driven animations: expect no fade' });
    });

    test('rule 1: each edge fades only while there is more to scroll that way', async ({ page: p }) => {
      const box = p.locator(`${page('r1')} [data-test=scroller]`);
      const expected = {
        top: { top: BLUE, bottom: RED },
        middle: { top: RED, bottom: RED },
        end: { top: RED, bottom: BLUE },
      };
      for (const [where, want] of Object.entries(expected)) {
        await scrollTo(p, box, where);
        const got = await edges(p, box);
        for (const edge of ['top', 'bottom']) {
          const target = scrollTimelines ? want[edge] : BLUE;
          expect(near(got[edge], target), `${where} of scroll, ${edge} edge is ${got[edge]}`).toBe(true);
        }
      }
    });

    test('rule 1: a box that fits does not fade', async ({ page: p }) => {
      const got = await edges(p, p.locator(`${page('r1-fits')} [data-test=scroller]`));
      expect(near(got.top, BLUE) && near(got.bottom, BLUE), `edges are ${got.top} / ${got.bottom}`).toBe(true);
    });

    test('rule 2: a border on the scroller fades; on a wrapper it keeps its colour', async ({ page: p }) => {
      for (const c of ['r2-no', 'r2-yes']) {
        const scroller = p.locator(`${page(c)} .box`);
        await scrollTo(p, scroller, 'middle');
        const b = await p.locator(`${page(c)} [data-test=bordered]`).boundingBox();
        const border = await rgbAt(p, b.x + b.width / 2, b.y + b.height - 2);
        const faded = !near(border, BLACK, 40);
        expect(faded, `${c}: bottom border is ${border}`).toBe(c === 'r2-no' && scrollTimelines);
      }
    });

    test('rule 3: the scroller reaches the surface edge and its first item lines up', async ({ page: p }) => {
      const at = (sel) => p.locator(`${page('r3')} ${sel}`).first().boundingBox();
      const [surface, scroller, heading, chip] = await Promise.all(
        ['[data-test=surface]', '[data-test=scroller]', '[data-test=heading]', '.chip'].map(at),
      );
      expect(scroller.x).toBeCloseTo(surface.x, 0);
      expect(scroller.x + scroller.width).toBeCloseTo(surface.x + surface.width, 0);
      expect(chip.x).toBeCloseTo(heading.x, 0);
    });

    test('rule 9: a scroller in a grid track scrolls only when the track can shrink', async ({ page: p }) => {
      for (const c of ['r9-no', 'r9-yes']) {
        const got = await p.locator(`${page(c)} [data-test=card]`).evaluate((card) => {
          const strip = card.querySelector('[data-test=scroller]');
          return {
            scrolls: strip.scrollWidth > strip.clientWidth,
            inside: strip.getBoundingClientRect().right <= card.getBoundingClientRect().right + 0.5,
          };
        });
        if (c === 'r9-yes') expect(got, c).toEqual({ scrolls: true, inside: true });
        else expect(got.inside, `${c}: the strip spills out of its card`).toBe(false);
      }
    });

    test('rule 6: a remounted scroller with short content shows no fade', async ({ page: p }) => {
      const sel = `${page('r6')} [data-test=scroller]`;
      await scrollTo(p, p.locator(sel), 'end');
      await p.locator(sel).evaluate((el) => (el.innerHTML = '<div class="block short"></div>'));
      await settle(p);
      const inPlace = await edges(p, p.locator(sel));
      const stale = !near(inPlace.top, BLUE) || !near(inPlace.bottom, BLUE);
      test.info().annotations.push({ type: 'swap without remount', description: stale ? 'stale fade' : 'clean' });

      await p.locator(sel).evaluate((el) => {
        const fresh = el.cloneNode(false);
        fresh.innerHTML = '<div class="block short"></div>';
        el.replaceWith(fresh);
      });
      await settle(p);
      const got = await edges(p, p.locator(sel));
      expect(near(got.top, BLUE) && near(got.bottom, BLUE), `edges are ${got.top} / ${got.bottom}`).toBe(true);
    });

    test('rule 7: items need room inside the scroller for their focus ring', async ({ page: p }) => {
      for (const [c, item] of [
        ['r7-strip-no', '.chip'],
        ['r7-strip-yes', '.chip'],
        ['r7-list-no', '.row'],
        ['r7-list-yes', '.row'],
      ]) {
        const el = p.locator(`${page(c)} ${item}`).first();
        await el.focus();
        await settle(p);
        const sides = await ringSides(p, el);
        const all = sides.top && sides.right && sides.bottom && sides.left;
        expect(all, `${c}: ring sides ${JSON.stringify(sides)}`).toBe(c.endsWith('-yes'));
      }
    });

    test('rule 7: a focusable scroller draws its ring on a wrapper', async ({ page: p }) => {
      await p.locator(`${page('r7-self-no')} [data-test=ringed]`).focus();
      await settle(p);
      const onScroller = await ringSides(p, p.locator(`${page('r7-self-no')} [data-test=ringed]`));
      const anyOnScroller = Object.values(onScroller).some(Boolean);
      expect(anyOnScroller, `ring on the scroller: ${JSON.stringify(onScroller)}`).toBe(!scrollTimelines);

      await p.locator(`${page('r7-self-yes')} [data-test=scroller]`).focus();
      await settle(p);
      const onWrapper = await ringSides(p, p.locator(`${page('r7-self-yes')} [data-test=ringed]`));
      expect(Object.values(onWrapper).every(Boolean), `ring on the wrapper: ${JSON.stringify(onWrapper)}`).toBe(true);
    });

    test('rule 8: Tab scrolls the focused item clear of the fade', async ({ page: p, browserName }) => {
      for (const direction of ['down', 'up']) {
        const edge = direction === 'down' ? 'bottom' : 'top';
        const no = await tabInto(p, p.locator(`${page('r8-no')} [data-test=scroller]`), direction, browserName);
        test.info().annotations.push({
          type: `no scroll padding, Tab ${direction}`,
          description: `item ${Math.round(no.gap[edge])}px from the ${edge}, fade is ${Math.round(no.band)}px`,
        });

        const yes = await tabInto(p, p.locator(`${page('r8-yes')} [data-test=scroller]`), direction, browserName);
        expect(yes.focused, `Tab ${direction} reached the hidden row`).toBe(true);
        expect(yes.gap[edge], `Tab ${direction}: gap to the ${edge} edge`).toBeGreaterThanOrEqual(yes.band - 1);
      }
    });

    test('rule 8 addition: scroll padding clears the ring as well as the item', async ({ page: p, browserName }) => {
      for (const direction of ['down', 'up']) {
        const edge = direction === 'down' ? 'bottom' : 'top';
        const got = await tabInto(p, p.locator(`${page('r8-ring')} [data-test=scroller]`), direction, browserName);
        expect(got.focused).toBe(true);
        expect(got.gap[edge]).toBeGreaterThanOrEqual(got.band + 4 - 1);
      }
    });

    test('rule 11: in-place toggle, delete and add keep the viewport and scroll position', async ({ page: p }) => {
      const box = p.locator(`${page('r11')} [data-test=scroller]`);

      await box.evaluate((el) => {
        el.scrollTop = 200;
        window.editViewport = el;
        el.children[8].focus({ preventScroll: true });
      });

      await p.keyboard.press('Enter');
      expect(await box.locator('.row').nth(8).getAttribute('data-done')).toBe('true');
      expect(await box.evaluate((el) => el.scrollTop)).toBe(200);
      await p.keyboard.press('Delete');
      expect(await box.locator('.row').count()).toBe(14);
      expect(await box.evaluate((el) => el.scrollTop)).toBe(200);
      await p.locator(`${page('r11')} [data-test=add]`).click();
      expect(await box.locator('.row').count()).toBe(15);
      expect(await box.evaluate((el) => el.scrollTop)).toBe(200);
      expect(await box.evaluate((el) => el === window.editViewport)).toBe(true);
    });

    test('rule 11: Tab moves only far enough to clear the fade, not to the centre', async ({ page: p, browserName }) => {
      for (const direction of ['down', 'up']) {
        const edge = direction === 'down' ? 'bottom' : 'top';
        const got = await tabInto(p, p.locator(`${page('r11')} [data-test=scroller]`), direction, browserName);
        expect(got.focused).toBe(true);
        expect(got.gap[edge]).toBeGreaterThanOrEqual(got.band + 4 - 1);
        expect(got.gap[edge]).toBeLessThanOrEqual(got.band + 4 + 1);
      }
    });

    test('rule 11: Tab leaves the list and removing the only row keeps useful focus', async ({ page: p, browserName }) => {
      const box = p.locator(`${page('r11')} [data-test=scroller]`);
      await box.locator('.row').last().focus();
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      await p.keyboard.press(tab);
      await expect(p.locator(`${page('r11')} [data-test=add]`)).toBeFocused();

      await box.evaluate((el) => {
        [...el.children].slice(1).forEach((row) => row.remove());
        el.firstElementChild.focus({ preventScroll: true });
      });

      await p.keyboard.press('Delete');
      await expect(box).toBeEmpty();
      await expect(box).toBeFocused();
    });
  });
}

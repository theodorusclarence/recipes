---
name: overflow-fade
title: Overflow fade
summary: A scrolling box fades at the edge that has more to scroll, and the fade leaves once you reach the end.
use-when: You add or change a box that scrolls inside the page. Any element with `overflow: auto` (`overflow-*-auto`), a chip row, a list with its own max height, a table that scrolls sideways.
tested-with: tw-fade 0.10.0, vendored fade.css, Tailwind CSS 4.3, Base UI 1.9; Chromium 158, WebKit 27.2, Firefox 159
---

# Overflow fade

A scrolling box fades at the edge that has more to scroll, and the fade leaves once you reach the end.
The reader sees the box scrolls without a scrollbar or a hint in the copy.

Use this when you add or change a box that scrolls inside the page: any element with
`overflow: auto`, a chip row, a list with its own max height, a table that scrolls sideways.

Each rule has a status. `owner` rules are settled. `to try` rules are still being decided; follow
them, and flag the case in your summary.

## Setup

Both options below give the same classes, so the code in the rules works with either. Put the class
on the element that scrolls, for its axis: `fade-y` for up and down, `fade-x` for sideways. For one
edge, use `fade-top`, `fade-bottom`, `fade-start` or `fade-end`.

| Stack | Use |
|---|---|
| Tailwind CSS v4 | [tw-fade](https://github.com/petekp/tw-fade) (recommended): sizes, RTL, blur and scrollbar options |
| Anything else (plain CSS, CSS modules, another framework) | copy [`assets/overflow-fade/fade.css`](assets/overflow-fade/fade.css) into the project: about 100 lines, same technique, left-to-right only |
| React Native | no CSS mask; see the note on rule 1 |

**Tailwind:**

```bash
pnpm add tw-fade
```

```css
@import 'tailwindcss';
@import 'tw-fade';
```

tw-fade does not add scroll padding; add it next to the fade class (rule 8).

**Without Tailwind:** copy `fade.css` next to your global styles and import it once. Tune an
element with `--fade-size` (how tall the band is, default `min(12%, 3rem)`) and `--fade-travel`
(how far you scroll before an edge is fully faded, default `2rem`). It sets the scroll padding
for rule 8 itself.

```html
<div class="fade-y" style="max-height: 20rem; overflow-y: auto">…</div>
<div class="fade-x" style="display: flex; overflow-x: auto; overscroll-behavior-x: none">…</div>
```

## 1. Fade with a mask, never a painted overlay

`status: owner`

Fade with a CSS mask (`mask-image`) on the scrolling box. Never draw a gradient from the
background colour on top of the content.

**Why:** A mask makes the content itself transparent, so the real surface behind the box shows
through: a pattern, an image, a card that changes colour in dark mode. A painted overlay only looks
right over one solid colour, and it stays on even when nothing is hidden. Both setups turn each
edge on and off from the scroll position with scroll-driven animations, with no JavaScript.

**Code:**

```html
<!-- yes: the box masks itself -->
<div class="fade-y" style="max-height: 20rem; overflow-y: auto">…</div>

<!-- no: a gradient painted over the content -->
<div style="position: relative">
  <div style="max-height: 20rem; overflow-y: auto">…</div>
  <div style="position: absolute; inset: auto 0 0; height: 3rem; pointer-events: none;
              background: linear-gradient(to top, white, transparent)"></div>
</div>
```

**Check:** Put the box on a patterned or tinted surface. The pattern shows through the faded band.
At the start of the scroll the top edge is hard, and at the end the bottom edge is hard.

**Note:** Some design guidance says never to fade scrollable content, because a fade hides what
the reader scrolls toward (emil-surfaces: "No fades on scrollable content"). That is true of a
fixed overlay. This fade is different: it shows only at an edge with more to scroll, it leaves at
the end, and rule 8 keeps a focused item out of it. For a scroller, this recipe wins.

**Note:** Combine the edge gradients with `mask-composite: intersect`. Never `exclude` (XOR): where
two layers are both opaque, XOR makes the result transparent, so the middle of the box disappears.
The one known exception to this rule is React Native, which has no CSS mask: the retired Expo app in
money-manager used an overlay, which was right only because every surface behind it was solid.

## 2. Fade only an edge that opens onto space

`status: to try`

Fade an edge where the content runs into open space or into a soft edge, such as the rounded side
of a dialog or a sheet. Where the edge is a hard border or a divider line, leave that edge hard:
use the one-edge class instead (`fade-bottom` under a header with a divider, `fade-top` above a
footer with one).

**Why:** Owner preference. A fade into a soft edge looks good. A fade into a hard line usually does
not. Also, a mask covers the whole element, so a fade on a box that draws its own `border` fades
that border too: keep the border on a wrapper, not on the scroller.

**Code:**

```html
<!-- a header with a divider: fade only the bottom -->
<header style="border-bottom: 1px solid">…</header>
<div class="fade-bottom" style="flex: 1; min-height: 0; overflow-y: auto">…</div>

<!-- a bordered box: the border sits on the wrapper -->
<div style="border: 1px solid; border-radius: 6px">
  <div class="fade-y" style="max-height: 18rem; overflow-y: auto; padding: 12px">…</div>
</div>
```

**Check:** Scroll partway. Each faded edge opens onto space. Each edge that meets a line is hard,
and every border keeps its full colour.

**Open question:** vault-site's backlinks panel fades flush against FrameBox's dashed frame
(NS-326). Decide whether a dashed frame is an exception to this rule or a case that breaks it.

**Note (to try):** A separate bordered control just past the scroller is not a border on the
scroller's own edge. In the todo-dialog demo, a bottom fade above a bordered add input worked
with 4px between the last row and the input. Keep a border or divider touching the viewport
edge hard; try a fade when there is space before a separate control. Whether that control reads
as a hard boundary is still a visual judgement, not a settled exception.

## 3. The fade starts at the very edge of the surface

`status: owner`

The scroller runs to the edge of the surface it sits on. On the faded side, undo the parent's
padding with a negative margin, and add the same padding back inside the scroller.

**Why:** With the padding on the parent, the scroller's edge sits inside the surface. Content is
cut at an invisible line, and a blank strip stays between the fade and the surface's edge. Padding
inside the scroller keeps the first item lined up with the content around it, and a list that fits
keeps its padding.

**Code:**

```html
<!-- the parent has 16px side padding: the chip row undoes it and puts it back inside -->
<div style="padding-inline: 16px">
  <h3>Currency</h3>
  <div class="fade-x" style="display: flex; gap: 6px; overflow-x: auto;
       overscroll-behavior-x: none; margin-inline: -16px; padding-inline: 16px">…</div>
</div>
```

In Tailwind: `px-4` on the parent, `-mx-4 px-4` on the scroller.

**Check:** At 390px, scroll partway. Items dissolve right at the surface's edge and are never cut
short of it.

## 4. The scrollbar keeps the same inset as the content

`status: owner`

If the box shows a scrollbar, draw it yourself as an element beside the masked viewport, with the
same padding as the content on the faded side. If the box does not need a visible scrollbar, hide
it with `scrollbar-width: none`.

**Why:** After rule 3 the padding is inside the scroller, so a native scrollbar runs from edge to
edge, past the first and last item. A native scrollbar cannot take that inset: the only hook,
`::-webkit-scrollbar-track { margin-block }`, works only on a restyled bar (which turns macOS's
floating bar into a permanent one) and never in Firefox. A custom scrollbar outside the masked
element is never dimmed by the fade either.

In React, use Base UI ScrollArea: it draws the scrollbar as a sibling of the Viewport and counts
the scrollbar's padding when it sizes the thumb, so the thumb still reaches both ends. Elsewhere,
use the framework's scroll-area primitive (Radix, Ark, Melt), or OverlayScrollbars for plain HTML.

**Code:**

```tsx
import { ScrollArea } from '@base-ui/react/scroll-area';

<ScrollArea.Root className='relative'>
  <ScrollArea.Viewport className='fade-y max-h-96 py-4'>…</ScrollArea.Viewport>
  <ScrollArea.Scrollbar className='flex w-2.5 py-4'>
    <ScrollArea.Thumb className='w-full rounded-full bg-foreground/20' />
  </ScrollArea.Scrollbar>
</ScrollArea.Root>
```

**Check:** Hover the box. The track starts at the first row and ends at the last, and the thumb is
not faded.

**Note (to try):** Inset the track's ends by the content's block padding, so its top matches the
first row at the start and its bottom matches the last row at the end. Centre it horizontally
in the gutter between the row's trailing control and the surface's inner edge. Measure the gaps
on both sides of the track, not the visible ink inside the control. The todo-dialog demo used
equal gaps of 8px on desktop and 6px at 390px. Check both themes and widths.

## 5. A sideways scroller stops at its edges

`status: owner`

Give every sideways scroller `overscroll-behavior-x: none`. A short strip that sits outside any
vertical scroller, such as a chip row pinned above a keypad, also takes `touch-action: pan-x`.
Inside a vertical scroller, or on a tall sideways box like a wide table, leave `touch-action` alone.

**Why:** iOS Safari rubber-bands a sideways box past its edge, so the fade and any pinned column
bounce off their place. `overscroll-behavior-x: contain` only stops the scroll from passing to the
page; iOS still bounces. `touch-action: pan-x` inside a vertical scroller blocks vertical scrolling
for a drag that starts on the strip.

**Code:**

```html
<div class="fade-x" style="display: flex; overflow-x: auto; overscroll-behavior-x: none">…</div>
```

In Tailwind: `overscroll-x-none`, and `touch-pan-x` for the pinned strip.

**Check:** On an iPhone, fling the strip to each end. It stops dead at the edge.

## 6. A scroller whose content is swapped remounts

`status: owner`

When a faded scroller stays on the page but its content is replaced (tabs that share one list),
replace the scroller element too, so it starts with a fresh scroll timeline. In React, key it by
the content: `key={activeTabId}`.

**Why:** A scroller that stays on the page can keep its old scroll-animation value when its
content is replaced. After a long list scrolled to the end is swapped for a short one, a fade stays
on an edge though nothing overflows. On 2026-11-11 the test page reproduced it in WebKit and
Firefox with both implementations, and in Chromium with `fade.css` (Chromium with tw-fade cleared).
The fade was still there 1.5 seconds later. A remount cleared it in every engine. On 2026-10-22 it
did not reproduce on an iPhone with tw-fade 0.10.0 (iOS 26.3 and 27), so a real phone can differ
from the test engines.

**Code:**

```tsx
<div key={activeTabId} className='fade-y max-h-80 overflow-y-auto'>
  {items.map((item) => <Row key={item.id} item={item} />)}
</div>
```

**Check:** In Safari and Firefox, scroll a long tab to its end, then switch to a short tab. No fade
shows.

**Note (to try):** Remount on a content swap, not on an in-place edit to the same list.
Toggling, deleting or adding a row should keep the viewport and its scroll position. See rule 11
for moving focus when an edit removes the focused row.

## 7. Focus rings are never clipped

`status: owner`

Leave room inside the scroller for the focus ring of any item that can touch its edge: padding of
at least the ring's width plus its offset (4px for a 2px ring at a 2px offset), on both axes. If
the scroller itself takes focus, draw its ring on a wrapper, never on the scroller.

**Why:** A scroller clips everything outside its padding box on both axes: `overflow-x: auto`
turns the other axis to `auto` too, so a sideways chip row cuts its chips' rings off at the top
and bottom. The fade's mask hides everything outside the scroller's own box, so a ring drawn on the
scroller itself does not show at all. A scroller takes focus when it has `tabindex`, and Chrome
and Firefox send Tab to any scroller that has nothing focusable inside it, so the browser's own
ring lands there even when you added none.

**Code:**

```html
<!-- items: 4px of room on every side an item can touch -->
<div class="fade-x" style="display: flex; overflow-x: auto; padding: 4px 16px">
  <button class="chip">…</button>
</div>

<!-- a scroller that takes focus: its ring is on the wrapper -->
<div class="scroll-frame">
  <div class="fade-y" tabindex="0" role="region" aria-label="Transactions"
       style="max-height: 20rem; overflow-y: auto">…</div>
</div>
```

```css
.scroll-frame > :focus-visible { outline: none; }
.scroll-frame:has(> :focus-visible) { outline: 2px solid var(--ring); outline-offset: 2px; }
```

In Tailwind: `py-1` on the strip; `outline-none` on the scroller and
`has-[>:focus-visible]:outline-2 has-[>:focus-visible]:outline-offset-2` on the wrapper. Where
the extra 4px would move the box, take it back with a negative margin on the same axis, as in
rule 3.

**Check:** Tab to the first item, the last item, and the scroller itself if it takes focus. The
whole ring shows on all four sides each time.

## 8. Tab stops clear of the fade

`status: owner`

Give the scroller scroll padding as large as the fade on each faded edge, so the browser scrolls a
focused item clear of the band. `fade.css` does this itself. With tw-fade, add
`scroll-py-[min(12%,3rem)]` to `fade-y` and `scroll-px-[min(12%,3rem)]` to `fade-x`, and change the
value if you changed the fade size.

**Why:** When Tab moves to an item out of view, the browser scrolls only as far as it must. In
Chromium and WebKit the item stopped exactly at the edge, inside the faded band, with its ring
faded too. In Firefox it stopped 12px past the edge, partly hidden. Scroll padding tells the
browser where the clear area ends; it also applies to anchor links and `scrollIntoView()`.

**Code:**

```html
<div class="fade-y" style="max-height: 20rem; overflow-y: auto; scroll-padding-block: min(12%, 3rem)">…</div>
```

In Tailwind: `fade-y scroll-py-[min(12%,3rem)]`.

**Check:** Tab down a list until it scrolls, then back up (Option+Tab in Safari). Each focused item
stops fully clear of the fade.

**Addition (to try):** Include the focus ring in that clear area, not just the item. Add the
ring's width and offset to the fade size: 4px for a 2px ring at a 2px offset. Otherwise the item
can clear the band while its ring is still faded. The vendored `fade.css` stays unchanged and
sets only the fade-sized scroll padding; override it after the import to add the allowance:

```css
.task-list.fade-y { scroll-padding-block: calc(min(12%, 3rem) + 4px); }
```

With tw-fade, use `scroll-py-[calc(min(12%,3rem)+4px)]` (or the corresponding inline-axis
property for a sideways strip). Change both values when the fade or ring changes. Check the
whole ring while tabbing in both directions. Scroll padding alone may still centre an item;
see rule 11 for minimum movement.

## 9. A scroller inside a grid or flex layout can shrink

`status: to try`

When a scroller is wrapped in a grid item or flex item (a section that holds a heading and the
strip), let that item shrink below its content: give the grid `grid-template-columns: minmax(0,
1fr)`, or give the item `min-width: 0` (`min-height: 0` for a vertical scroller in a flex column).

**Why:** A grid or flex item will not shrink below its content's minimum width by default. A
scroller that is itself the item is exempt, which is why the bug hides in simple demos. Once it
is wrapped, the wrapper is as wide as every chip in the row, so the card grows to fit, the page
scrolls sideways, and the row itself never scrolls or fades. Found on 2026-11-11 by a
fresh agent on a test page: a `display: grid` card at 375px grew to 762px.

**Code:**

```html
<!-- yes: the track may shrink, so the strip scrolls inside the card -->
<div class="card" style="display: grid; grid-template-columns: minmax(0, 1fr)">
  <section>
    <h2>Currency</h2>
    <div class="fade-x" style="display: flex; overflow-x: auto">…</div>
  </section>
</div>
```

In Tailwind: `grid-cols-[minmax(0,1fr)]` on the grid, or `min-w-0` on the item.

**Check:** At 320px wide, the page does not scroll sideways, and the strip scrolls and fades
inside its card.

## 10. Keep extra spacing outside the scroller

`status: to try`

Keep the scroller's own block padding at the focus-ring minimum from rule 7: 4px for a 2px ring
at a 2px offset. Put extra breathing room between neighbours outside the scroller. Start with
the minimum next to a hard-edged neighbour, such as a bordered input or a divider; next to
borderless tabs or a heading, try 8px total between the neighbour and the first row.

**Why:** Large internal padding leaves an empty band inside the scrolling surface. In the
todo-dialog demo, the owner preferred tabs-to-row spacing of 8px and row-to-input spacing of
about 4px. These are starting points, not universal distances. Extra space outside the viewport
keeps the fade at the viewport's edge instead of enlarging the empty band inside it.

**Code:**

```html
<nav style="padding-bottom: 4px">All / Active / Done</nav>
<div class="fade-y" style="overflow-y: auto; max-height: 20rem; padding: 4px 16px">
  <!-- rows -->
</div>
<input aria-label="Add task" style="margin-top: 0">
```

**Check:** At 390px in both themes, measure from the tabs' bottom to the first row at the start,
and from the last row to the input at the end. Try 8px above and 4px below, without changing
the row's internal spacing. Keep any surface-edge bleed from rule 3.

## 11. Move focus only as far as needed

`status: to try`

Preserve scroll position on in-place edits. If an edit removes the focused row, focus the next
row (or the previous row at the end) with `focus({ preventScroll: true })`. If it is already
clear of the fade, do not scroll. Otherwise move only enough to put the item and its ring
outside the band. Apply the same minimum movement to keyboard navigation inside the list;
keep Tab's normal order and let it leave the list at either end.

**Why:** In Chromium in the todo-dialog demo, native Tab scrolling centred a checkbox at 190px
in a viewport whose centre was 189.80px, even with scroll padding. The scroll jump was 152px.
Separately, remounting on a checkbox edit reset scrollTop from 256px to 0; deleting in All
moved it from 334px to 360px. Keeping the viewport made those edit deltas 0px. Minimum focus
scrolling moved 24px to clear the band instead of centring the next hidden checkbox. These
measurements explain the guidance, not a browser-independent promise about native scrolling.

**Code:** A vertical, two-edge sketch; use only the faded edges for a one-edge mask.

```js
function focusNearest(viewport, item, fadeSize, ringAllowance) {
  item.focus({ preventScroll: true });
  const box = viewport.getBoundingClientRect();
  const target = item.getBoundingClientRect();
  const topGap = viewport.scrollTop > 0 ? fadeSize + ringAllowance : ringAllowance;
  const moreBelow = viewport.scrollTop < viewport.scrollHeight - viewport.clientHeight;
  const bottomGap = moreBelow ? fadeSize + ringAllowance : ringAllowance;
  const above = target.top - box.top - topGap;
  const below = target.bottom - box.bottom + bottomGap;
  if (above < 0) {
    viewport.scrollTop += above;
    return;
  }
  if (below > 0) viewport.scrollTop += below;
}
```

Update rows without replacing the viewport; reserve remounting for the content swaps in rule 6.
After removing the focused row, call this for its neighbour. For Tab inside a list, find the
next control in the existing tab order and prevent the default scroll only when handling that
move yourself. Do not intercept Tab at the list's boundaries. Do not use `scrollIntoView()`
with its default alignment to restore focus.

**Check:** Scroll halfway, toggle and delete a visible row, then add a row. The viewport stays
put unless the shorter list clamps its scroll position at the end. Tab down and back up:
each new control stops just clear of the fade, not in the centre. Check that Tab still leaves
the list, and that deleting the last or only row leaves focus on a useful neighbour or the
list's focus wrapper.

## Done when

Run these in the project, on the real screen. Each line names the rule it proves.

**Any browser, 390px wide, light and dark mode**

- [ ] At the start, middle and end of the scroll, the fade shows only at an edge with more to
      scroll, and the surface shows through it (rule 1).
- [ ] Every faded edge opens onto space; every edge that meets a line is hard, and every border
      keeps its full colour (rule 2).
- [ ] Items dissolve at the surface's edge, and the first item lines up with the content above it
      (rule 3).
- [ ] A visible scrollbar runs from the first item to the last, and its thumb is not faded (rule 4).
- [ ] Switching to shorter content leaves no fade behind (rule 6).
- [ ] At 320px, the page does not scroll sideways and every strip scrolls inside its card (rule 9).
- [ ] A visible track has equal horizontal gaps to the trailing control and surface edge, and
      its ends match the first and last rows at the scroll limits (rule 4, to try).
- [ ] Spacing next to the list is deliberate: try 8px next to borderless tabs and the 4px
      ring minimum next to a bordered input, with extra space outside the viewport (rule 10).

**Keyboard, on a desktop browser (Option+Tab in Safari)**

- [ ] The first item, the last item and a focusable scroller each show their whole ring (rule 7).
- [ ] Tabbing until the box scrolls, down and then up, every item stops clear of the fade (rule 8).
- [ ] The whole ring clears the band, not just the focused item (rule 8 addition, to try).
- [ ] Editing a list preserves its viewport and scroll position; focus moves to a neighbour
      with only enough scrolling to clear the fade, and Tab can leave the list (rule 11).

**iPhone, Safari**

- [ ] A sideways strip flung to each end stops dead (rule 5).

## Tests

[`assets/overflow-fade/test.mjs`](assets/overflow-fade/test.mjs) checks rules 1, 2, 3, 6, 7, 8 and 9
on [`test.html`](assets/overflow-fade/test.html), with both implementations, in Chromium, WebKit
and Firefox. Run `npm test` from the repo root. Rules 4 and 5 need a scroll-area component and an
iPhone, so they are checked by hand.

The same suite measures the tentative spacing in rule 10, the ring allowance added to rule 8,
and in-place edits and minimum focus movement in rule 11. Rule 4's gutter alignment and the
visual judgement about a separate bordered control in rule 2 remain checks in the project.

## Sources

- Todo-dialog recipe trial, 2026-11-11: owner feedback on tabs-to-list spacing (8px),
  list-to-input spacing (about 4px), scrollbar alignment and minimum focus movement.
  Chromium measurements are recorded in rule 11; these additions remain `to try`.

- vault-site: `.claude/docs/ui-scroll.md`, `src/pages/[...slug].astro` (backlinks panel).
- money-manager: `.claude/rules/ui.md` › Scrolling boxes fade at the edge with more to scroll,
  `apps/web/src/components/entry-sheet/currency-chips.tsx`,
  `apps/web/src/components/expense-overlay/_components/body.tsx`.
- tw-fade by Pete Petrash: https://github.com/petekp/tw-fade. `assets/overflow-fade/fade.css` is a
  small rewrite of its mask technique (MIT).

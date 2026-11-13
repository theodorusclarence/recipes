---
name: drag-and-drop
title: Drag and drop
summary: A lifted row follows the pointer as a solid copy, the list makes room without anything jumping, and the copy lands exactly on its new place.
use-when: You add or change anything the user drags to reorder or to move. A sortable list, a list of questions or categories, a tree where a row drops into a parent, cards moved between columns.
tested-with: "@dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/modifiers 9.0.0, @dnd-kit/utilities 3.2.2, React 19.3; Chromium 158, WebKit 27.2, Firefox 159"
---

# Drag and drop

A row you pick up becomes a solid, raised copy that follows the pointer. The row's place stays open
as a slot, the other rows slide by whole rows to make room, and the copy lands on the slot and turns
back into the row. Nothing on the page jumps at any step.

Use this when you add or change anything the user drags to reorder or to move: a sortable list, a
list of questions or categories, a tree where a row drops into a parent, cards moved between
columns.

Each rule has a status. `owner` rules are settled. `to try` rules are still being decided; follow
them, and flag the case in your summary.

## Setup

| Stack | Use |
|---|---|
| React | [dnd-kit](https://dndkit.com) (recommended): `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` and `@dnd-kit/utilities` |
| React, a tree or a drop into a parent | `@dnd-kit/core` and `@dnd-kit/utilities` with your own drop model. `@dnd-kit/sortable` reorders one flat list only, so money-manager dropped it for its category tree |
| Vue, Svelte, Solid, plain DOM | `@dnd-kit/dom` 0.5, or its `@dnd-kit/vue`, `@dnd-kit/svelte` or `@dnd-kit/solid` adapter. Not yet proven by a project or by the tests: follow the rules by what they say, and prove them with Done when |

There is no vendored file: a drag engine (pointer, touch and keyboard sensors, collision, auto-scroll,
announcements) is not a short copy. Do not use native HTML drag and drop, or a library built on it
such as pragmatic-drag-and-drop. The browser draws its own see-through preview, so rule 2 cannot
hold, and iOS Safari needs a long press to start it.

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities
```

The whole list, with every rule in place. The rules below explain each part.

```tsx
import {
  closestCenter, defaultDropAnimationSideEffects, DndContext, DragOverlay,
  KeyboardSensor, PointerSensor, useSensor, useSensors, type DropAnimation,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  // Explicit offsets, so a drop in place still animates (rule 6).
  keyframes: ({ transform }) => [
    { offset: 0, transform: CSS.Transform.toString(transform.initial) },
    { offset: 1, transform: CSS.Transform.toString(transform.final) },
  ],
  sideEffects: defaultDropAnimationSideEffects({
    className: { dragOverlay: 'settling' },
    styles: { active: { opacity: '0' } },
  }),
};

// Safe in server rendering: no matchMedia or document.body until the browser takes over.
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(reducedMotionQuery);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}
const useInBrowser = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export function SortableList({ items, onMove }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);
  const reducedMotion = useReducedMotion();
  const still = byKeyboard || reducedMotion;
  const inBrowser = useInBrowser();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 70, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = items.find((item) => item.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={({ active, activatorEvent }) => {
        setActiveId(String(active.id));
        setByKeyboard(activatorEvent instanceof KeyboardEvent);
      }}
      onDragEnd={({ active, over }) => {
        setActiveId(null);
        if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="list">
          {items.map((item) => <SortableRow key={item.id} item={item} />)}
        </ul>
      </SortableContext>
      {inBrowser &&
        createPortal(
          <DragOverlay dropAnimation={still ? null : dropAnimation}>
            {active ? <LiftedRow item={active} /> : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

function SortableRow({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} className="sortable" style={{ transform: CSS.Translate.toString(transform), transition }}>
      <RowCard item={item} hidden={isDragging}>
        <DragHandle name={item.name} ref={setActivatorNodeRef} {...attributes} {...listeners} />
      </RowCard>
      {isDragging && <div className="slot" />}
    </li>
  );
}

function LiftedRow({ item }: { item: Item }) {
  // The root stays flat: dnd-kit measures it. The card inside tilts (rule 5).
  return (
    <div>
      <RowCard item={item} lifted>
        <DragHandle name={item.name} tabIndex={-1} />
      </RowCard>
    </div>
  );
}
```

`RowCard` is the row's one look, used by the list and by the copy, so they cannot drift apart. It
adds `lifted` to the card on the copy and `visibility: hidden` to it while its row is the slot.

## 1. Nothing shifts on lift, move or drop

`status: owner`

From pickup to landing, nothing on the page moves except the rows that make room. The list keeps
its height. The lifted row's place keeps its exact height (rule 3). The other rows slide by
`translate` only, never `scale`, each by the lifted row's height plus the gap. When the copy lands,
every row is already where it ends up.

With dnd-kit: give `SortableContext` the `verticalListSortingStrategy` for a list, and turn the
transform into CSS with `CSS.Translate`, never `CSS.Transform`.

**Why:** Owner rule: a shift is most often seen in lists with gaps. On 2026-11-13 the tests dragged
the second of five rows (40, 40, 72, 40 and 40px tall, 8px apart) onto the fourth, in Chromium,
WebKit and Firefox. Each engine gave the same result:

- **With the vertical strategy, the shifts came from the transform and the slot.**
  - `SortableContext` with no strategy uses `rectSortingStrategy`. Through `CSS.Transform`, it scales
    each row to the size of the place it moves into. The 72px row was squeezed to 40px and a 40px row
    was stretched to 72px, and on the drop they jumped 16px and 48px. money-manager hit the same
    squeeze in PR #141.
  - A slot that shrinks to a 2px drop line made the list 38px shorter as the row lifted, and every
    row below it jumped up. A slot removed from the list takes its gap with it as well.
- **With the vertical strategy and `CSS.Translate`, gaps did not shift anything.** That held for a
  flex `gap`, margins between rows, and one gap wider than the rest: every row ended exactly where
  it slid to.

**Code:**

```tsx
// yes
<SortableContext items={ids} strategy={verticalListSortingStrategy}>
style={{ transform: CSS.Translate.toString(transform), transition }}

// no: the default strategy and CSS.Transform scale rows of different heights
<SortableContext items={ids}>
style={{ transform: CSS.Transform.toString(transform), transition }}
```

For items in a grid that are all the same size, `rectSortingStrategy` is the right strategy. Still
use `CSS.Translate`.

**Check:** Drag a short row past a taller one and drop it. No row changes height, no gap opens or
closes, and nothing moves after the copy lands. When in doubt, slow the page down with Lapse (the
`emil-ask-lapse` skill) and step through the drop frame by frame.

**Note:** If you write your own offsets (a tree, a drop into a parent), move each row by the lifted
row's height plus the gap. money-manager's offsets use the height alone, which is right only because
its rows touch, with lines between them and no gap. The tests do not cover hand-written offsets.

**Note:** If lifting a row changes what the list shows (money-manager folds every group while a
parent is lifted), fix the scroller's content height for the drag. After the drop, scroll so the
dropped row stays where the copy landed. Otherwise the page jumps when the list grows back.

## 2. The lifted copy is solid

`status: owner`

Drag a copy of the row in an overlay (`DragOverlay`), portaled to `document.body`. The copy has an
opaque background (the row's own surface, or one step lighter) and full opacity, plus a shadow.
Never drag the row itself at a lower opacity.

**Why:** Owner rule. A see-through copy lets the rows it passes show through, so its text runs into
theirs. The usual dnd-kit demo sets `opacity: 0.5` on the dragged row: in the test its pixels mixed
with the red surface under it, where the copy stayed pure blue. In an overlay on `document.body`,
the copy sits above every scroller and stacking context, so nothing clips or covers it. A
`transform` on an ancestor would also break the overlay's `position: fixed`, which the portal
avoids.

**Code:**

```css
.card { background: var(--surface); border-radius: 12px; }
.card.lifted {
  background: var(--elevated);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 6px 12px -2px rgb(0 0 0 / 0.1),
    0 18px 38px -6px rgb(0 0 0 / 0.18);
}
```

```tsx
// no: the row itself, faded
style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
```

In dark mode, money-manager swaps the shadow for a 1px light ring plus a deeper shadow:
`0 0 0 1px oklch(1 0 0 / 0.1), 0 6px 12px -2px oklch(0 0 0 / 0.4), 0 18px 38px -6px oklch(0 0 0 / 0.55)`.

**Check:** In light and dark mode, drag a row over the other rows and over the page around the
list. Nothing shows through the copy. The copy looks like the row: same text, chips, icons and
spacing.

## 3. The slot shows where the row will land

`status: to try`

The lifted row stays in the list as its own slot. Its content stays in place but invisible, so the
slot keeps the row's exact height, even for a row that wraps to two lines. A dashed box covers it:
a 2px dashed border in the accent colour at 40%, a fill of the accent at 7%, and the row's radius.

**Why:** The invisible content keeps the height right for any row without measuring it (rule 1). The
dashed box shows where the row will land without the reader having to look at the copy. Both
voice-agent-redesign and money-manager do it.

**Code:**

```css
.sortable { position: relative; }
.slot {
  position: absolute; inset: 0; border-radius: 12px;
  border: 2px dashed color-mix(in oklch, var(--accent) 40%, transparent);
  background: color-mix(in oklch, var(--accent) 7%, transparent);
}
```

In Tailwind: `absolute inset-0 rounded-xl border-2 border-dashed border-accent/40 bg-accent/[0.07]`.
money-manager insets the box 4px from the top and bottom and 8px from the sides
(`inset-y-1 left-2 right-2`), for rows that run edge to edge with lines between them.

**Check:** Lift a two-line row. Its slot is two lines tall, and the dashed box follows it as other
rows slide past.

## 4. Lift on a short hold, along one axis

`status: to try`

Start a pointer drag only after a 70ms hold, with 5px of tolerance. Lock a list's copy to the list's
axis (`restrictToVerticalAxis`, or `restrictToHorizontalAxis` for a row of chips).

**Why:** A short hold makes the pickup read as deliberate, and it gives the lift animation (rule 5)
a moment to start. If the pointer moves more than 5px during the hold, the pickup is cancelled, so a
quick swipe does not lift a row. A copy that can only move along the list never drifts off to the
side, and the copy still lands straight.

**Code:**

```tsx
useSensor(PointerSensor, { activationConstraint: { delay: 70, tolerance: 5 } })
<DndContext modifiers={[restrictToVerticalAxis]}>
```

**Check:** On a phone, a tap on the handle does nothing. A press-and-drag lifts the row after a
blink, and the copy only moves up and down.

## 5. The copy lifts with a tilt

`status: to try`

The copy tilts and rises: `transform: rotate(-1.6deg) scale(1.025)` with the layered shadow from
rule 2. It eases in from the flat row as a mount animation, over 220ms with
`cubic-bezier(0.2, 0.8, 0.2, 1)`. Put the tilt on a card inside the overlay's root, never on the
root itself.

**Why:** dnd-kit measures the overlay's root (its first child) with its transforms included. A
tilted root measures larger than the row, and the drop lands off by half the difference: 3px right
and 3px low in the test, 5px right and 6px low in money-manager (PR #141). Animating from flat as a
mount animation (`@keyframes` with only a `from`) runs on every pickup, with no race against the
first frame. It also keeps the static tilt and the animation on the same property, `transform`, so
they do not add up.

**Code:**

```css
@keyframes lift { from { transform: none; box-shadow: none; } }
.card.lifted {
  transform: rotate(-1.6deg) scale(1.025);
  animation: lift 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
@media (prefers-reduced-motion: reduce) { .card.lifted { animation: none; transition: none; } }
```

```tsx
// no: the tilt is on the root dnd-kit measures
<DragOverlay>{active ? <RowCard item={active} lifted /> : null}</DragOverlay>
```

If the tilt has to stay on the root, measure the root's untilted parent instead, as
money-manager does: `measuring={{ dragOverlay: { measure: (node) => getClientRect(node.parentElement ?? node) } }}`.

**Check:** The copy tilts and rises over about a fifth of a second. On the drop, it lands on the
slot's exact pixels: no nudge at the hand-off.

**Open question:** money-manager PR #141 called this look provisional. The owner decides after
trying it on a phone.

## 6. The copy lands, then becomes the row

`status: to try`

On the drop, the copy flies to the slot over 220ms with `cubic-bezier(0.165, 0.84, 0.44, 1)`. At the
same time it loses its tilt, shadow and lifted fill, so it arrives as the row. The row stays hidden
under it until it lands. Give the drop keyframes explicit `offset`s, so a drop in place animates
too.

**Why:** dnd-kit moves only the copy's position on a drop. A class on the overlay for the drop's
duration (`sideEffects`) lets the card ease back to the row's look in the same 220ms. dnd-kit skips
the whole drop animation, side effects included, when the first and last keyframes are identical,
and they are on every drop in place. In the test the copy then vanished in under 50ms, where the
recipe's copy settled for about 240ms. Without the explicit offsets, a tilted card pops to flat.

**Code:** the `dropAnimation` in Setup, and:

```css
.card.lifted {
  transition: transform 220ms cubic-bezier(0.165, 0.84, 0.44, 1),
    box-shadow 220ms cubic-bezier(0.165, 0.84, 0.44, 1),
    background-color 220ms cubic-bezier(0.165, 0.84, 0.44, 1);
}
.settling .card.lifted { transform: none; box-shadow: none; background: var(--surface); }
```

**Check:** Pick a row up and drop it where it was. It settles flat over about a fifth of a second;
it does not pop. Drop one elsewhere: the copy turns into the row with no change at the hand-off.

## 7. The copy says what the drop will do

`status: to try`

When a drop does more than move a row, the copy says so before release. It shows the position the
row will take, rolling between numbers, and "Into Vehicle" over a row it would drop into. It also
shows why a drop is refused (`Transport already has a "Meal"`), and a drop there changes nothing.
Work it out from the current target while dragging: dnd-kit freezes the copy's content at release.

**Why:** In voice-agent-redesign the questions are numbered. The copy shows the number it will have
(NumberFlow, 300ms, `cubic-bezier(.2,.8,.2,1)`), so the number is already right as it lands. In
money-manager, a category can drop into a parent or be refused, and the copy is where the reader is
looking.

**Code:**

```tsx
// the number the row will have if dropped now
const order = activeIndex !== -1 && overIndex !== -1 ? arrayMove(items, activeIndex, overIndex) : items;
<NumberFlow value={order.findIndex((item) => item.id === activeId) + 1} />
```

**Check:** Drag over a target that refuses the row. The copy says why, and dropping there leaves
the list as it was.

## 8. A handle drags; the row still opens

`status: to try`

Start the drag from a handle button: `aria-label="Reorder {name}"`, a 44px hit area around a 16px
icon, `touch-action: none`, and `cursor: grab` (`grabbing` while held). The rest of the row stays a
normal tap target that opens the row. While another row is lifted, rows do not open.

**Why:** In money-manager, Edit mode once turned row taps off. Opened from the entry sheet, the
Categories screen starts in Edit mode, so a category could not be renamed at all (PR #212).
`touch-action: none` on the handle alone keeps the list scrollable by touch everywhere else.

**Code:**

```tsx
<button type="button" aria-label={`Reorder ${name}`} className="handle" {...attributes} {...listeners} ref={setActivatorNodeRef}>
  <GripIcon size={16} aria-hidden />
</button>
```

```css
.handle { display: grid; place-items: center; width: 44px; align-self: stretch;
  touch-action: none; cursor: grab; }
.handle:active { cursor: grabbing; }
```

**Check:** On a phone, a tap on a row opens it, a swipe that starts on a row scrolls the list, and
a press on the handle lifts the row.

## 9. Keyboard and reduced motion

`status: to try`

Space or Enter picks a row up, the arrow keys move it, Space or Enter drops it and Escape cancels.
Announce by position, for example "Picked up Row 2", "Row 2 moved to position 4 of 5" and "Dropped".
A keyboard drag drops without the drop animation. With reduced motion on, nothing animates: the
copy appears lifted at once (tilt included), rows step instead of sliding, and the drop is instant.

**Why:** dnd-kit's `KeyboardSensor` with `sortableKeyboardCoordinates` gives the keys. Its default
announcements name the item's id, not its position. money-manager drops keyboard drags without
animation and snaps every move under reduced motion.

**Code:** `still` and `byKeyboard` in Setup, and:

```tsx
<DndContext accessibility={{ announcements, screenReaderInstructions }}>
// in SortableRow, with `still` passed down from the list
useSortable({ id: item.id, transition: still ? null : undefined })
```

**Check:** Tab to a handle, then press Space, ArrowDown twice and Space. The row moved down two
places, and VoiceOver read each step. With reduced motion on in the OS, a mouse drag shows the
tilted copy at once, and rows and the drop jump straight to their places.

**Open question:** voice-agent-redesign slides the rows between keyboard steps, while money-manager
snaps them. Decide which feels right.

## Done when

Run these in the project, on the real screen. Each line names the rule it proves.

**Any browser, 390px wide, light and dark mode**

- [ ] Lifting a row moves nothing else, and the list keeps its height (rules 1 and 3).
- [ ] Dragged past a taller row, no row changes height and no gap opens or closes (rule 1).
- [ ] After the drop, nothing moves once the copy is gone (rule 1).
- [ ] Rows that slide bring their own fill and lines: no lighter strip shows behind a moving row,
      and a divider follows the place a row lands, not where it started (rule 1).
- [ ] Nothing shows through the copy, and it matches the row: text, chips, icons and spacing
      (rule 2).
- [ ] A two-line row's slot is two lines tall, with the dashed box over it (rule 3).
- [ ] The copy lands on the slot's exact pixels, with no nudge at the hand-off (rules 5 and 6).
- [ ] A drop in place settles, rather than popping (rule 6).
- [ ] Over a target that refuses the row, the copy says why, and the drop changes nothing (rule 7).

**Keyboard, on a desktop browser**

- [ ] Space, arrows, Space moves the row; Escape puts it back; each step is announced (rule 9).
- [ ] With reduced motion on, a mouse drag animates nothing: the copy appears lifted, rows step,
      and the drop is instant (rule 9).

**iPhone, Safari**

- [ ] A tap on the handle does nothing; a press-and-drag lifts after a blink; the copy moves only
      along the list (rule 4).
- [ ] A tap on the row opens it, a swipe from a row scrolls, and the handle drags (rule 8).
- [ ] The tilt and the landing feel right (rules 5 and 6).

## Tests

[`assets/drag-and-drop/test.mjs`](assets/drag-and-drop/test.mjs) checks rules 1 (with the slot's
height from rule 3), 2, 5, 6 and 9. It runs on the React and dnd-kit cases in
[`fixture.jsx`](assets/drag-and-drop/fixture.jsx), in Chromium, WebKit and Firefox. It drags with
the mouse and the keyboard and reads every row's box on every frame. Run `npm test` from the repo
root. Rules 4, 7 and 8, and the feel of rules 5 and 6, need a person and a phone.

## Sources

- money-manager: Categories Edit mode, PRs #141 and #212.
  `apps/web/src/components/entity/edit-list.tsx` and `use-entity-drag.ts`;
  `apps/web/src/styles.css` (`drag-lifted`, `drag-settle`).
- voice-agent-redesign: the question list in `src/components/ui/forms/question-list/`
  (`index.tsx`, `_components/sortable-question.tsx`, `_components/question-row.tsx`), and
  `src/styles/globals.css` (`question-lift`, `question-drop`).
- clarence-taste (skills repo): the misses from money-manager PR #212, in Done when.
- dnd-kit by Claudéric Demers (MIT): https://github.com/clauderic/dnd-kit. The measuring and the
  skipped drop animation in rules 5 and 6 are in `@dnd-kit/core` 6.3.1 (`getMeasurableNode`, and
  the identical-keyframes check in the default drop animation).

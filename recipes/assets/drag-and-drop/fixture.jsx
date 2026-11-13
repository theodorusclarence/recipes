// Test fixture for recipes/drag-and-drop.md, driven by test.mjs. Bundled to fixture.build.js by
// scripts/build-fixtures.mjs. `recipe` follows every rule; each other case breaks one.
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

// Row 3 is a two-line row: rows of different heights are where shifts show.
const ROWS = [
  { id: 'a', label: 'Row 1', height: 40 },
  { id: 'b', label: 'Row 2', height: 40 },
  { id: 'c', label: 'Row 3', height: 72 },
  { id: 'd', label: 'Row 4', height: 40 },
  { id: 'e', label: 'Row 5', height: 40 },
];

const SETTLE_EASE = 'cubic-bezier(0.165, 0.84, 0.44, 1)';

const RECIPE = {
  strategy: verticalListSortingStrategy,
  toCss: CSS.Translate,
  slot: 'keep',
  overlay: true,
  tilt: 'inner',
  keyframes: 'explicit',
  spacing: 'gap',
};

const CASES = [
  { id: 'recipe', title: 'recipe: every rule' },
  { id: 'r1-margins', title: '1. yes: margins instead of gap', spacing: 'margins' },
  { id: 'r1-uneven', title: '1. yes: one wider gap', spacing: 'uneven' },
  { id: 'r1-scale', title: '1. no: default strategy, scale', strategy: undefined, toCss: CSS.Transform },
  { id: 'r1-slot', title: '1. no: slot shrinks to a line', slot: 'line' },
  { id: 'r2-ghost', title: '2. no: the row itself at 50%', overlay: false },
  { id: 'r5-tilt', title: "5. no: tilt on the copy's root", tilt: 'outer' },
  { id: 'r6-default', title: '6. no: default keyframes', keyframes: 'default' },
].map((c) => ({ ...RECIPE, ...c }));

function dropAnimation(c) {
  const sideEffects = defaultDropAnimationSideEffects({
    className: { dragOverlay: 'settling' },
    styles: { active: { opacity: '0' } },
  });
  if (c.keyframes === 'default') return { duration: 220, easing: SETTLE_EASE, sideEffects };
  return {
    duration: 220,
    easing: SETTLE_EASE,
    // Explicit offsets keep the two keyframes different, so a drop in place still animates.
    keyframes: ({ transform }) => [
      { offset: 0, transform: CSS.Transform.toString(transform.initial) },
      { offset: 1, transform: CSS.Transform.toString(transform.final) },
    ],
    sideEffects,
  };
}

function Handle({ label, ...props }) {
  return (
    <button type="button" data-handle aria-label={`Reorder ${label}`} className="handle" {...props}>
      ⠿
    </button>
  );
}

function Row({ row, c }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const lifted = isDragging && c.overlay;
  const style = { transform: c.toCss.toString(transform), transition, height: row.height };
  if (lifted && c.slot === 'line') style.height = 2;
  if (isDragging && !c.overlay) Object.assign(style, { opacity: 0.5, zIndex: 1 });
  return (
    <div ref={setNodeRef} data-row={row.id} className={lifted ? 'row is-slot' : 'row'} style={style}>
      {lifted && c.slot === 'keep' && <div className="slot" />}
      {!(lifted && c.slot === 'line') && (
        <>
          <span>{row.label}</span>
          <Handle label={row.label} ref={setActivatorNodeRef} {...attributes} {...listeners} />
        </>
      )}
    </div>
  );
}

function Copy({ row, c }) {
  const content = (
    <>
      <span>{row.label}</span>
      <Handle label={row.label} tabIndex={-1} />
    </>
  );
  // The tilt goes on an inner card: dnd-kit measures the copy's root with its transforms.
  if (c.tilt === 'outer')
    return (
      <div data-overlay={c.id} className="row lifted" style={{ height: row.height }}>
        {content}
      </div>
    );
  return (
    <div data-overlay={c.id} style={{ height: row.height }}>
      <div className="row lifted">{content}</div>
    </div>
  );
}

function Case({ c }) {
  const [rows, setRows] = useState(ROWS);
  const [activeId, setActiveId] = useState(null);
  const [byKeyboard, setByKeyboard] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 70, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = rows.find((r) => r.id === activeId);
  return (
    <section data-case={c.id}>
      <h2>{c.title}</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={({ active, activatorEvent }) => {
          setActiveId(active.id);
          setByKeyboard(activatorEvent instanceof KeyboardEvent);
        }}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          if (!over || active.id === over.id) return;
          setRows((list) =>
            arrayMove(
              list,
              list.findIndex((r) => r.id === active.id),
              list.findIndex((r) => r.id === over.id),
            ),
          );
        }}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={rows.map((r) => r.id)} strategy={c.strategy}>
          <div data-list className={`list ${c.spacing}`}>
            {rows.map((row) => (
              <Row key={row.id} row={row} c={c} />
            ))}
          </div>
        </SortableContext>
        {c.overlay &&
          createPortal(
            <DragOverlay dropAnimation={byKeyboard ? null : dropAnimation(c)}>
              {active ? <Copy row={active} c={c} /> : null}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </section>
  );
}

const rectOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
};

// What test.mjs reads: every row's box, the list's box, the copy's box and the row order.
window.snap = (caseId) => {
  const list = document.querySelector(`[data-case="${caseId}"] [data-list]`);
  const rows = [...list.querySelectorAll('[data-row]')];
  const copy = document.querySelector(`[data-overlay="${caseId}"]`);
  return {
    t: performance.now(),
    list: rectOf(list),
    rows: Object.fromEntries(rows.map((el) => [el.dataset.row, rectOf(el)])),
    copy: copy ? rectOf(copy) : null,
    order: rows.map((el) => el.dataset.row),
  };
};

// Records a snap every frame until stop() is called.
window.record = (caseId) => {
  const frames = [];
  let on = true;
  const tick = () => {
    if (!on) return;
    frames.push(window.snap(caseId));
    requestAnimationFrame(tick);
  };
  tick();
  window.stop = () => {
    on = false;
    return frames;
  };
};

createRoot(document.getElementById('root')).render(
  <>
    {CASES.map((c) => (
      <Case key={c.id} c={c} />
    ))}
  </>,
);

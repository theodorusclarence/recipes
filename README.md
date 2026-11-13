# recipes

My UI/UX recipes: how a piece of interface should look, move and behave, written as rules an agent
can follow and I can check. Agents read them through the `recipes` skill (`/recipes`) in
`theodorusclarence/skills`. Edit a recipe here and nowhere else.

**Agents:** before you build or change UI, look for a recipe whose `use-when` matches the job. To
add or change a recipe, follow the rules below.

## Layout

```
recipes/
  overflow-fade.md          one recipe, one file
  drag-and-drop.md
  assets/overflow-fade/
    fade.css                vendored code a project copies in (when the recipe needs it)
    test.html               one example per rule, for the tests
    test.mjs                the tests (Playwright)
  assets/drag-and-drop/
    fixture.jsx             the examples, when they need a framework (React)
    test.html               loads fixture.build.js, which the test run bundles from fixture.jsx
    test.mjs
scripts/test-helpers.mjs    shared test helpers (read pixels, find a focus ring)
scripts/build-fixtures.mjs  bundles every fixture.jsx with esbuild before the tests run
playwright.config.mjs       runs every recipe's tests in Chromium, WebKit and Firefox
```

The folder is flat: one Markdown file per recipe, named after the recipe. Everything else a recipe
needs lives in `recipes/assets/<name>/`.

## Naming

| Kind | Name | Example |
|---|---|---|
| Mine | no prefix | `overflow-fade` |
| Imported from someone else | `<author>-<recipe>` | `emil-toast-stack` |
| Fireflies-specific | `ff-<recipe>` | `ff-meeting-row` |

- Kebab-case, named after the thing the reader sees (`overflow-fade`), not the library behind it.
- One prefix per person, the same prefix they have in the skills repo (`emil-`, `jakub-`, `matt-`).
- The `name:` in the frontmatter must equal the file name.

## What a recipe is

A recipe is one visible behaviour (a fade, a tappable row, a sheet) split into numbered rules. Each
rule is a decision an agent would otherwise get wrong, with the reason and a way to check it. It is
not a tutorial and not a component library: if a rule has no reason or no check, it is not ready.

### Agnostic first, with a recommendation per stack

A recipe describes the behaviour, not one codebase. It has to work whatever the project uses.

- Write each rule in platform terms: plain CSS properties (`overscroll-behavior-x: none`), HTML and
  browser behaviour. Code examples default to plain HTML and CSS.
- Name the stack-specific way after it, as a short aside: "In Tailwind: `-mx-4 px-4`", "In React,
  key it by the content".
- Put the choice of library in the recipe's **Setup**, as a table with one row per stack: the
  recommended library where one is good (Tailwind → tw-fade), and a fallback for every other stack.
- When the fallback needs code, vendor it: a small, readable file in `recipes/assets/<name>/` that
  a project copies in. Keep the same class names or API as the recommended library, so the rules'
  code works with either. Credit the library it is modelled on, with its license, at the top of the
  file and in Sources.
- A rule that only one library can meet (a custom scrollbar needs a scroll-area primitive) names
  the option for each stack it knows, and says what to look for in the others.

## Recipe format

Copy this shape. `recipes/overflow-fade.md` is the reference example.

````markdown
---
name: overflow-fade
title: Overflow fade
summary: One sentence: what the reader sees.
use-when: The jobs that should pull this recipe in, named the way an agent meets them in code
  (`overflow-*-auto`, a chip row, a list with its own `max-h-*`).
tested-with: tw-fade 0.10.0, Tailwind CSS 4.3, Base UI 1.9
---

# Overflow fade

The summary, then one line on why the reader benefits.

Use this when … (repeat `use-when` in a sentence).

Each rule has a status. `owner` rules are settled. `to try` rules are still being decided; follow
them, and flag the case in your summary.

## Setup

| Stack | Use |
|---|---|
| Tailwind CSS v4 | `<library>` (recommended) |
| Anything else | copy `assets/<name>/<file>`: the vendored fallback |

Install and import steps for each row.

## 1. The rule, as an instruction

`status: owner`

What to do, in one short paragraph.

**Why:** The reason. Name the failure the rule prevents.

**Code:**

```html
<!-- yes: … -->
<!-- no: … -->
```

In Tailwind: … (the stack-specific way, when it differs).

**Check:** What to do and what you should see. Name the screen width, theme or device.

## Done when

Run these in the project, on the real screen. Each line names the rule it proves.

**Any browser, 390px wide, light and dark mode**

- [ ] What you see, and the rule number (rule 1).

**Keyboard** / **iPhone, Safari** / … (one group per place the check has to run)

- [ ] …

## Tests

Which rules `assets/<name>/test.mjs` checks, and which are checked by hand and why.

## Sources

- Where each rule came from: repo and file, a PR, an author's post.
````

### Done when

A checkbox list that covers every rule, grouped by where the check runs (any browser, keyboard,
iPhone). Each line says what you should see and names its rule. It is what an agent runs in a
project before calling the work done, so every line must be something it can do or measure there.

### Frontmatter

| Field | Required | Holds |
|---|---|---|
| `name` | yes | the file name, without `.md` |
| `title` | yes | the heading |
| `summary` | yes | one sentence on what the reader sees |
| `use-when` | yes | the triggers agents match against; write it like a skill description |
| `tested-with` | when it uses a library or vendored code | library versions and browsers the rules were proven on |
| `license`, `metadata` | imported only | the source block (see Credit) |

### Rules

- Number every rule: `## 1. Title`. The number is how a review or PR points at it, so never reuse a
  removed rule's number in the same recipe; leave the gap.
- Write the title as an instruction ("Fade with a mask, never a painted overlay").
- Put the status on its own line straight under the title, in backticks:
  - `status: owner` — I decided it. Follow it.
  - `status: to try` — the current best guess. Follow it, and flag the case in your summary.
  - `status: pending` — written down, not yet decided. Do not follow it without asking me.
- Every rule has **Why** and **Check**. **Code** shows a yes and, where it helps, a no.
- Optional blocks after Check: **Note** (a gotcha, an exception) and **Open question** (what would
  move a `to try` rule to `owner`).
- Use exact values (`-mx-4`, `90ms`, `16px`), never "a little" or "some".
- A rule that only holds on some platforms names them ("On iOS Safari …").

### Changing a recipe

- Only I move a rule to `owner`. An agent may add a rule as `to try` or `pending`, or edit one, and
  says so in the PR.
- When a rule changes because something broke, add the case to its Note or Sources so the reason
  survives.
- Bump `tested-with` when a rule is re-proven on a new version.

## Testing a recipe

A recipe is tested three ways, because each catches something the others miss.

1. **The tests prove the rules.** `recipes/assets/<name>/test.html` holds one example per rule, and
   `test.mjs` measures it with Playwright in Chromium, WebKit and Firefox, against every
   implementation in the Setup table. Where a "no" example proves the rule's Why (a border that
   fades, a ring that is cut off), test that too. Use plain colours so a test can read pixels, and
   the helpers in `scripts/test-helpers.mjs`. When the examples need a framework (a React
   library), write them in `fixture.jsx` next to `test.html`: the test run bundles it into
   `fixture.build.js` (not committed), and `test.html` loads that. Pin the library's exact
   version in `package.json`. A finding the tests turn up goes into the rule's Why, with the date
   and the engines. Run `npm test`; the `Test recipes` check runs it on every PR.
2. **Checks by hand cover what a test cannot.** Feel on a phone, an iPhone bounce, a judgement of
   taste. These stay in Done when, and the recipe's Tests section names them.
3. **A fresh agent proves the recipe is clear.** After a new recipe or a large change, give an agent
   with no context of this work a small task the recipe should trigger, without naming the recipe
   or its rules. Then run the Done when list against what it built. A rule it got wrong means the
   recipe is unclear: fix the wording, not the agent.

## Credit

An imported recipe records its source in the frontmatter, in the same shape as the skills repo:

```yaml
license: MIT
metadata:
  source-repo: emilkowalski/some-repo   # GitHub owner/repo, or the site it came from
  source-path: docs/toasts.md           # file or folder inside that source
  source-commit: 85f83d3                # newest commit that touched it; omit for a site
  source-checked: 2026-11-11
```

This repo is public. Import only from sources whose license allows republishing (MIT, Apache,
CC BY). Never copy from a paid or private source, such as the aiforui.dev pack or a private repo:
write the rule in your own words from what you learned, and credit the source in Sources.

**Rule for agents importing a recipe:** propose the file name and the source block to me, and wait
for my OK before writing it. Rewrite the source into this format; quote no more than the rules need,
and link the original in Sources.

## Adding a recipe

1. Check `recipes/` for an existing recipe that should take the rule instead.
2. Write `recipes/<name>.md` in the format above. New rules start as `to try` unless I gave them.
3. Add `recipes/assets/<name>/test.html` and `test.mjs` for every rule a browser can measure, and
   run `npm test`.
4. Branch, commit, push, open a PR. I merge.

## Commits

Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): summary`, with the recipe name as the scope when there is one.

| Type    | For                                                       |
| ------- | --------------------------------------------------------- |
| `feat`  | a new recipe, rule or vendored file                       |
| `fix`   | a rule, test or vendored file that was wrong              |
| `docs`  | wording only: the README, a Why, a Note                   |
| `test`  | tests only                                                |
| `ci`    | the GitHub workflow                                       |
| `chore` | tooling: `package.json`, Playwright config                |

For example: `feat(overflow-fade): add rule 9 for wrapped scrollers`. The repo allows only Squash and
merge, and the PR title becomes the commit on `main`, so the PR title follows the same format.

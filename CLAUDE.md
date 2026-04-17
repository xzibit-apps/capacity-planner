# Xzibit App Standard — Context for Claude Code & Manus

This file tells AI coding tools (Claude Code, Manus, Cursor, etc.) how to build Xzibit apps so they look and feel consistent. Drop a copy into every Xzibit app repo. For Manus, paste the contents in as the first message of any new build.

**Authoritative sources:**
- Live stylesheet: `https://xzibit-standards.vercel.app/xzibit-design.css`
- Token file: `https://xzibit-standards.vercel.app/tokens.json`
- Visual reference: `https://xzibit-standards.vercel.app/`

Swap `xzibit-standards.vercel.app` for wherever you host the standards (e.g. `standards.xzibit-apps.vercel.app`).

---

## The one-line rule

Every Xzibit app imports `xzibit-design.css`, uses the component classes it defines, and does not introduce its own colours, fonts, or visual components.

---

## First thing to do on any new app

Put this in the `<head>`:

```html
<link rel="stylesheet" href="https://xzibit-standards.vercel.app/xzibit-design.css">
```

This single line loads Inter (via Google Fonts), the full token set as CSS variables (`--xz-*`), and every component class. Nothing else is needed.

---

## What the system is, in 30 seconds

- **Light canvas** (white or `#F8FAFC`), never dark-on-default.
- **White sidebar** on the left (248px), single hairline right border, light theme.
- **Inter** for everything, **sentence case** for every heading.
- **Teal `#19B1A1`** is the single brand accent — primary buttons, active nav, focus rings.
- **Six-colour pastel status family** for chrome: mint (teal), sky, amber, coral, lilac, sun. Each has 50 / 500 / 700 weights for background / dot / text.
- **Shift/event blocks** are pastel fill + 4px coloured left-border + 10px radius.
- **Empty slots** are 1.5px dashed outlines that turn teal on hover.
- **Pill-shaped** buttons and pills everywhere.
- **Soft shadows** on cards and floating elements.

---

## Rules (hard — do not deviate)

### Colour
- The only accent colour is `#19B1A1` (teal). Don't introduce a new accent.
- UI state uses the six-pastel family only. Don't invent status colours.
- Each pastel has three weights: `-50` for background, `-500` for dot/border, `-700` for text.
- Charts and data visualisations inside a chart container may use more colours. Everything outside the chart (chrome) may not.

### Typography
- Inter is the single font.
- Headings are sentence case: "Today's shifts", not "TODAY'S SHIFTS".
- The only uppercase element is the small `.step` eyebrow label (`Step 1 · Planning` style), with `0.18em` tracking.
- League Spartan is retired from app UI. Don't use it.

### Layout
- Sidebar: 248px, white, 1px hairline right border. Dark charcoal sidebars are retired.
- Content max-width: 1320px, centred.
- Spacing snaps to the 4/8 ladder (`--xz-s-1` through `--xz-s-9`).
- Radii snap to tokens (`xs` 6, `sm` 8, `md` 12, `lg` 16, `xl` 20, `pill` 999). Don't invent new ones.

### Components
- Buttons are pill-shaped (`--xz-r-pill`).
- Primary buttons are solid teal with a soft teal shadow.
- Cards and panels use `box-shadow: var(--xz-shadow-sm)` plus `border: 1px solid var(--xz-hairline)`.
- Shift/event blocks always follow the 4px-left-border + pastel-50-fill + 10px-radius pattern.
- Empty slots are dashed outlines. Never solid cards.

---

## Component quick reference

### Shell
```html
<div class="shell">
  <aside class="side">
    <div class="side-brand">
      <div class="brand-mark">X</div>
      <div class="brand-word">Xzibit</div>
    </div>
    <button class="side-quick"><span class="plus">+</span> New thing</button>
    <div class="side-search"><span>⌕</span><span>Search</span></div>
    <div class="side-group-label">Workspace</div>
    <nav class="side-nav">
      <button class="nav-item is-active">
        <span class="nav-icon">▦</span> Current page <span class="count">12</span>
      </button>
    </nav>
    <div class="side-foot">
      <div class="avatar">JN</div>
      <div>
        <div class="name">Joel Nebauer</div>
        <div class="tag">Admin</div>
      </div>
    </div>
  </aside>
  <main class="main">
    <div class="topbar">...</div>
    <div class="page">...</div>
  </main>
</div>
```

### Top bar
```html
<div class="topbar">
  <div class="topbar-title">
    <div class="h3">Page title</div>
    <span class="pill-live"><span class="dot"></span> Live</span>
  </div>
  <div class="topbar-actions">
    <button class="icon-btn">◔</button>
    <button class="btn btn--secondary">Share</button>
    <button class="btn btn--primary">+ New</button>
  </div>
</div>
```

### Hero
```html
<div class="hero">
  <div>
    <div class="step"><span>Step 1</span><span class="bar"></span><span class="gray">Planning</span></div>
    <h1 class="h1">Sentence case headline here</h1>
    <p class="subtle">One-line context sentence.</p>
    <div class="hero-actions">
      <button class="btn btn--primary">Primary action</button>
      <button class="btn btn--secondary">Secondary</button>
    </div>
  </div>
</div>
```

### Stats
```html
<div class="stat-row">
  <div class="stat mint">
    <div class="stripe"></div>
    <div class="label">Confirmed</div>
    <div class="value">18</div>
    <div class="delta up">↑ 3 from last week</div>
  </div>
  <!-- .stat.sky .stat.amber .stat.coral .stat.lilac -->
</div>
```

### Tabs
```html
<div class="tabs">
  <button class="tab is-active">Active tab</button>
  <button class="tab">Another</button>
</div>
```

### Shift / event block
```html
<div class="shift">
  <div class="time">09:00 – 17:00</div>
  <div class="label">Event name · location</div>
</div>

<!-- Variants: .shift--sky .shift--amber .shift--coral .shift--lilac .shift--sun -->
```

### Empty slot
```html
<div class="empty"><span class="plus">+</span> Add shift</div>
```

### Pills
```html
<span class="pill pill--mint"><span class="dot"></span>Confirmed</span>
<!-- .pill--sky .pill--amber .pill--coral .pill--lilac .pill--sun -->
```

### Buttons
```html
<button class="btn btn--primary">Primary</button>
<button class="btn btn--secondary">Secondary</button>
<button class="btn btn--ghost">Ghost</button>
<button class="icon-btn">◔</button>
```

### Card
```html
<div class="card">
  <div class="card-eyebrow">Section</div>
  <div class="card-title">Card title</div>
  <p class="subtle">Body text here.</p>
</div>
```

### Grouped list / table
```html
<div class="group">
  <div class="group-head">
    <div class="title">
      <span class="chev">▾</span>
      <span class="title-text">Today · Wednesday, 22 April</span>
    </div>
    <span class="count">7 shifts</span>
  </div>
  <div class="row">
    <!-- columns -->
  </div>
</div>
```

### Checklist
```html
<ul class="checklist">
  <li><span class="check">✓</span>Item one</li>
  <li><span class="check">✓</span>Item two</li>
</ul>
```

---

## Type roles

| Class | Size | Weight | Use |
|---|---|---|---|
| `.h1` | 30px | 700 | Page title |
| `.h2` | 22px | 700 | Section title |
| `.h3` | 16px | 600 | Card or panel title |
| `.subtle` | 14px | 400 | Secondary body |
| `.meta` | 12px | 400 | Meta / muted |
| `.step` | 11px | 600 | Small uppercase tracked eyebrow (the ONLY uppercase element) |

---

## Token quick reference

Full list in `tokens.json`. Most used:

```css
/* Brand */
--xz-teal:       #19B1A1;
--xz-teal-600:   #0F8E80;
--xz-teal-50:    #E6F6F3;

/* Ink */
--xz-ink:        #0F172A;
--xz-ink-700:    #334155;
--xz-ink-500:    #64748B;
--xz-ink-400:    #94A3B8;

/* Surfaces */
--xz-surface:      #FFFFFF;
--xz-surface-soft: #F8FAFC;
--xz-hairline:     #E2E8F0;

/* Status (50/500/700) */
--xz-mint-500 / --xz-sky-500 / --xz-amber-500 / --xz-coral-500 / --xz-lilac-500 / --xz-sun-500

/* Spacing */
--xz-s-1 (4) ... --xz-s-9 (64)

/* Radii */
--xz-r-sm (8), --xz-r-md (12), --xz-r-lg (16), --xz-r-pill (999)

/* Layout */
--xz-side-w (248px), --xz-topbar-h (72px), --xz-content-max (1320px)
```

---

## Status mapping (pick the right colour)

| Colour | Semantic meaning |
|---|---|
| Mint (teal) | Confirmed, on-track, live, active, good |
| Sky (blue) | Pencilled in, scheduled, informational |
| Amber | At risk, pending action, needs attention |
| Coral | Conflict, blocked, overdue, unavailable, vacation |
| Lilac | Design, creative, project-level activity |
| Sun (yellow) | Warehouse, logistics, internal operations |

Pick semantically, not visually. If it's a "confirmed" state, it's always mint — even if mint already appears elsewhere on the page.

---

## Before you ship — 10-item checklist

1. `<link>` to `xzibit-design.css` is the first CSS loaded.
2. Canvas is white or `#F8FAFC`. Sidebar is white with a 1px hairline right border.
3. Inter is the single font. No League Spartan in body copy.
4. Headings are sentence case. No ALL CAPS except small `.step` eyebrow labels.
5. Teal `#19B1A1` is the single brand accent — primary button, active nav, focus rings.
6. Status uses the six-pastel family only. No bespoke reds, greens, blues in chrome.
7. Shift/event blocks use 4px coloured left border + pastel-50 fill + 10px radius.
8. Empty slots are 1.5px dashed outlines that turn teal on hover.
9. Buttons are pill-shaped. Primary has the soft teal shadow.
10. All radii snap to tokens. All spacing snaps to the 4/8 ladder.

---

## What to do when a new pattern is needed

If the app needs something the standard doesn't have (new component, new state, new layout):

1. **First**, check `standards.html` — it may already exist.
2. **Second**, build it using existing tokens (colours / spacing / radii / shadows). Don't introduce new values.
3. **Third**, if it's genuinely new and reusable, propose adding it to the standard so every app benefits.

Never invent a one-off colour or font style for a single app. That's how drift starts.

---

## Retrofit order for existing apps

Priority (worst off-brand → already on-brand):

1. Whiplash (furthest off — Manus default styling, wrong logo, wrong fonts)
2. ERP Overview (wrong-navy background, Title Case headings, red/green borders)
3. Team Schedule (white background, wrong fonts, rainbow status pills)
4. Apps Dashboard (mixed brand signal, off-palette status badges)
5. Feedback & Improvements (Title Case headings, off-brand icon colours)
6. App Ideas (same pattern as Feedback)
7. LED Screen Calculator (Title Case on main title)
8. X-Mark (system fonts instead of Inter)
9. TV Bracket Labels (already strongest; light polish only)

---

## Version

`1.0.0` — First public standard, light-canvas ConnectTeam-leaning interpretation of Brand System v2.0.

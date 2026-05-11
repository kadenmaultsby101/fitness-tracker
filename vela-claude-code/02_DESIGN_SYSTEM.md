# VELA — DESIGN SYSTEM

This is the visual language. Every component must follow these rules.

## Colors

```css
:root {
  /* Backgrounds */
  --bg: #070707;       /* page background, near-black */
  --c1: #0e0e0e;       /* card background, slightly elevated */
  --c2: #161616;       /* nested elements, inputs */
  --c3: #1f1f1f;       /* deeper nesting, hover states */
  --c4: #282828;       /* deepest, used sparingly */

  /* Borders — subtle white at low alpha */
  --b1: rgba(255,255,255,0.06);   /* default */
  --b2: rgba(255,255,255,0.12);   /* emphasis, hover */
  --b3: rgba(255,255,255,0.20);   /* strong, modals */

  /* Text */
  --t1: #f0f0f0;       /* primary text */
  --t2: #888;          /* secondary text */
  --t3: #444;          /* tertiary, labels, captions */

  /* Accents (use SPARINGLY) */
  --green: #9febb8;    /* gains, positive numbers, success */
  --red: #eb9f9f;      /* losses, over-budget, errors */
  --gold: #ebd49f;     /* investment highlights, premium */
}
```

## Typography

```css
--serif: 'Cormorant Garamond', serif;   /* display - weight 300 */
--mono: 'DM Mono', monospace;            /* body, UI - weight 300-500 */
```

### Hierarchy

| Use | Font | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Page title (Vela, Dashboard, etc.) | Cormorant Garamond | 30-40px | 300 | -1px |
| Net Worth hero number | Cormorant Garamond | 46-56px | 300 | -2px |
| Account balances | Cormorant Garamond | 18-22px | 300 | -0.5px |
| Goal percentages | Cormorant Garamond | 30px | 300 | -1px |
| Insight values | Cormorant Garamond | 26px | 300 | -0.5px |
| Body text | DM Mono | 11-13px | 400 | normal |
| Labels / Captions | DM Mono | 8-10px | 400 | 1.5-3px UPPERCASE |
| Buttons | DM Mono | 10px | 500 | 3px UPPERCASE |

**Rule of thumb:** Numbers and headings use Cormorant Garamond. Everything else uses DM Mono. The contrast between elegant serif numbers and tracked-out mono labels is the whole aesthetic.

## Spacing

- Page padding: 18px horizontal
- Card padding: 18-24px
- Card margin: 10-14px
- Element gaps inside cards: 12-16px
- Between sections: 16-24px

## Components

### Cards
```css
background: var(--c1);
border: 1px solid var(--b1);
padding: 18-24px;
/* No border-radius — sharp corners. No shadows. */
```

### Card titles (the small label above)
```css
font-size: 8px;
letter-spacing: 3px;
text-transform: uppercase;
color: var(--t3);
margin-bottom: 14px;
```

### Buttons (primary)
```css
background: var(--t1);
color: var(--bg);
padding: 14px;
font-family: var(--mono);
font-size: 10px;
letter-spacing: 3px;
text-transform: uppercase;
border: none;
/* hover: opacity 0.85 */
```

### Buttons (secondary)
```css
background: transparent;
border: 1px solid var(--b2);
color: var(--t2);
/* hover: border var(--b3), color var(--t1) */
```

### Inputs
```css
background: var(--c2);
border: 1px solid var(--b1);
color: var(--t1);
padding: 12-13px;
font-family: var(--mono);
font-size: 13px;
/* focus: border-color var(--b2) */
```

### Bottom Navigation
- Fixed at bottom, height 60px
- 5 tabs evenly spaced
- Active tab: top border in --t1, icon + label in --t1
- Inactive: icon + label in --t3
- Icons are unicode symbols (◈ ◎ ◇ ✦ ⊙), not emoji

### Pages
- Sticky page header at top (var(--bg) background, border-bottom var(--b1))
- Scrolls underneath the header
- Bottom padding to clear bottom nav

## Motion

- Page transitions: 220ms ease, opacity + translateY(10px)
- Message animations: 280ms ease, slide up
- Progress bar fills: 800-900ms ease
- AI "live" dot: pulse animation, 2s infinite, opacity 1 → 0.2 → 1
- Typing dots: 1.2s infinite, sequential delays

## Forbidden patterns

❌ Drop shadows  
❌ Border-radius greater than 0 (everything is sharp-cornered)  
❌ Purple, blue, or any color outside the defined palette  
❌ System fonts (Inter, Roboto, Arial)  
❌ Gradients on backgrounds (one tiny radial accent on net-worth hero is OK)  
❌ Emoji in UI chrome (only in transaction/goal/bank tile contexts)  
❌ Generic "Tailwind look" — this is editorial, not utility  

## Approved patterns

✅ Tracked-out small caps for every label  
✅ Serif numbers (Cormorant) paired with mono context (DM Mono)  
✅ Thin 1px borders, never thicker  
✅ Dark, layered surfaces with subtle separation  
✅ Generous breathing room around hero elements  
✅ Subtle radial gradients for atmosphere on hero cards  

## The "feel" test

Before shipping a screen, ask: *"Does this look like something a 27-year-old Goldman Sachs analyst would have on their iPhone?"*

If yes → ship it.  
If it looks like Mint, YNAB, or a generic budgeting app → start over.

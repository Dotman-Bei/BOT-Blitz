# Frontend Style Guide — "NimSnap" system

Extracted from [`mrnetwork0001/NimSnap`](https://github.com/mrnetwork0001/NimSnap) (MIT, © 2026 Ifeanyichukwu Onwo). A pay-per-shot AI photo studio built as a Nimiq Pay Mini App.

**The one-line description:** soft daylight glass for a phone-first studio. A pale blue-grey wash with three slow-drifting colour blooms, frosted white panels edged in 1px white with very large radii (46px on cards), deep navy ink instead of black, one indigo gradient for every primary action, and Plus Jakarta Sans at semibold with tight tracking. The signature is the hero: a hand-built phone that demonstrates the before/after slider on its own, on a loop.

**Four things to know before reading on:**

1. **Tailwind v3 with a real config.** Unlike a CSS-first v4 setup, the tokens live in `tailwind.config.ts` under `theme.extend`: colour ramps, two named radii, four named shadows, two background images, a custom `eyebrow` font size, and four keyframes. Six component classes sit in `@layer components` in `globals.css`, so utilities can still override them.
2. **The comments carry the reasoning.** Almost every non-obvious choice has a note explaining it, including one fix worth knowing: the muted text colours were darkened after they measured 3.54:1 and 2.38:1 against the page, which is below AA for body copy.
3. **It is built for a phone inside a wallet app.** Safe-area padding utilities, `viewport-fit: cover`, `100dvh`, overscroll locked, tap highlight removed, theme colour matched to the page ground, and a checkout bar pinned under the thumb.
4. **The brief and the build diverged.** The project spec asks for a "Cyberpunk / Glassmorphism UI". What shipped is calm daylight glass with no cyberpunk in it. This document describes what shipped.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript |
| Styling | Tailwind v3.4 with `tailwind.config.ts`; component classes in `@layer components` |
| Font | Plus Jakarta Sans 400–800 via `next/font/google`, exposed as `--font-sans` |
| Icons | Hand-drawn inline SVG, 1.7px strokes; no icon library |
| Brand | A PNG wordmark (`/brand/nimsnap-header.png`) and an SVG mark (`NimMark`) |
| Motion | Tailwind keyframes plus hand-written CSS keyframes for the hero; no animation library |
| Surfaces | `/` landing · `/app` the studio (the PWA `start_url`, so a Mini App user lands in the tool) |

### Font setup

```tsx
const sans = Plus_Jakarta_Sans({
  subsets: ['latin'], variable: '--font-sans', display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})
<html lang="en" className={sans.variable}>
```

```ts
fontFamily: { sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'] }
```

### Viewport and host fit

```ts
export const viewport: Viewport = {
  themeColor: '#EDF2F7', width: 'device-width', initialScale: 1, viewportFit: 'cover',
}
```

```css
:root { --sat: env(safe-area-inset-top, 0px); --sab: env(safe-area-inset-bottom, 0px); }
html, body { @apply bg-haze-400 text-ink antialiased; overscroll-behavior-y: none; }
body { min-height: 100dvh; }
button, a, label { -webkit-tap-highlight-color: transparent; }

@layer utilities {
  .pt-safe { padding-top: calc(var(--sat) + 0.75rem); }
  .pb-safe { padding-bottom: calc(var(--sab) + 0.75rem); }
}
```

The theme colour, manifest background and page ground are the same `#EDF2F7`, so the host's status bar and splash blend into the page.

---

## 2. Colour tokens

```ts
colors: {
  ink:   { DEFAULT: '#17213D', muted: '#4F5D7A', soft: '#5F6F89' },
  brand: { 50: '#F2F5FD', 100: '#E4EAFA', 200: '#C7D3F4', 300: '#A3B6EC',
           400: '#5C7DE2', 500: '#4262D4', 600: '#2948B5', 700: '#223C96' },
  haze:  { 50: '#F5F9FC', 100: '#EEF4F8', 200: '#E8F1F7', 300: '#E4EEF4', 400: '#EDF2F7' },
  accent: { teal: '#64C4CC', periwinkle: '#9EB2E5', cornflower: '#7F9EE0' },
}
```

### How the palette is spent

- **Ink is deep navy, never black.** `#17213D` for headings and key labels, `ink-muted` for body copy, `ink-soft` for hints and meta. Three steps of one hue.
- **Indigo is the only action colour.** The `brand` ramp supplies the gradient on every primary button, selection states, the step badges, and a few accent labels (`brand-500`, `brand-600`).
- **Haze is the ground.** Five near-identical pale blue-greys form the page wash; `haze-400` is the `html` background and theme colour.
- **Accents appear only as atmosphere.** Teal, periwinkle and cornflower live in the backdrop blooms and the hero mock's "after" tint. They never mark UI state.
- **Status borrows Tailwind's defaults**, always inside a `card-sm`: amber for demo mode and notices, rose for errors, `brand-50` for the "paid shot waiting" credit.

### The contrast fix, and where it stands

The config documents the change: `muted` and `soft` were `#74819A` and `#94A0B5`, measured at 3.54:1 and 2.38:1, and darkened while keeping the hue. My measurements against the page ground:

| Colour | on `haze-400` | on the lightest wash (`haze-50`) | on the darkest wash (`haze-300`) | on a `.card` |
|---|---|---|---|---|
| `ink` | 14.11 | 15.01 | 13.50 | — |
| `ink-muted` | 5.86 | 6.24 | 5.61 | — |
| `ink-soft` | 4.52 | 4.81 | **4.33** | 4.92 |
| old `muted` `#74819A` | 3.49 | — | — | — |
| old `soft` `#94A0B5` | 2.34 | — | — | — |

The fix worked for `ink` and `ink-muted` everywhere. `ink-soft` is on the line: it passes on cards and the light end of the wash, and dips just below 4.5:1 where the wash is darkest. Keep `ink-soft` on cards, or darken it one more step.

### White on the gradient

The primary button's label is white on a gradient that runs `#5C7DE2 → #4262D4 → #2948B5`, with a white sheen over the top half. White measures 5.34:1 on the middle stop but 3.83:1 on the light stop, and 2.50:1 where the sheen is strongest. It works because labels are centred and sit where the sheen has faded, over the middle stop. A left-aligned or very wide label would drift into the light end.

---

## 3. Typography

One family, Plus Jakarta Sans.

```css
h1, h2, h3 { @apply font-semibold tracking-[-0.035em]; }
```

Headings are **semibold (600) with -0.035em tracking** everywhere. Card and item titles step up to bold (700) at small sizes. The hero keeps its weight moderate and lets the gradient carry emphasis.

### Scale in use

Sizes are mostly fractional `rem` arbitrary values rather than Tailwind's named steps.

| Role | Size | Notes |
|---|---|---|
| Hero h1 | `text-[2.5rem] sm:text-5xl lg:text-[3.5rem]` | 40 → 48 → 56px, `leading-[1.05]` |
| Section h2 | `text-[1.875rem] sm:text-[2.25rem]` | 30 → 36px, `leading-[1.1]` |
| Result h2 | `text-[1.75rem]` | 28px |
| Error / 404 h1 | `text-[1.5rem]` | 24px |
| Lead | `text-lg font-medium text-ink/80` | 18px |
| Body | `text-[0.9375rem] leading-relaxed text-ink-muted` | 15px |
| Card title | `text-[0.9375rem] font-bold` | 15px |
| Card body | `text-[0.8125rem] leading-relaxed text-ink-muted` | 13px |
| Hint | `text-[0.6875rem] text-ink-soft` | 11px, the most-used size |
| Tag / meta | `text-[0.625rem]` | 10px |
| Mock labels | `text-[0.5625rem]` | 9px, inside the phone mock only |

### The eyebrow

```ts
fontSize: { eyebrow: ['0.656rem', { lineHeight: '1', letterSpacing: '0.3em', fontWeight: '700' }] }
```
```css
.eyebrow { @apply text-eyebrow uppercase text-ink-muted; }
```

10.5px, bold, uppercase, tracked out to 0.3em. It opens every section and labels the studio's panels ("Pick a style", "See it first", "Your shot").

A second, quieter caps treatment labels preset use-cases: `text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft`.

### The gradient phrase

```html
<h1>Studio photos for
  <span class="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">ten cents a shot.</span>
</h1>
```

The price clause is clipped to the brand gradient. At the light end it measures about 3.6:1 on the page, which passes only because the hero is large text.

### Mono

Used sparingly: the footer (column headings in `brand-500` mono at 10px, 0.22em tracking; links in mono at 12.5px), transaction hashes, and the error digest.

---

## 4. Surfaces

### The two panels

```css
/* The soft floating panel the whole design is built from. */
.card    { @apply rounded-card  border border-white bg-white/70 shadow-card backdrop-blur-xl; }
.card-sm { @apply rounded-panel border border-white bg-white/65 shadow-lift backdrop-blur-lg; }
```

Frosted white at 65–70% over the wash, a **1px solid white border** rather than a grey one, a heavy backdrop blur, and a long, soft, navy-tinted shadow. The white border is the glass edge catching light.

### Radius

```ts
borderRadius: { card: '2.875rem', panel: '1.75rem' }   // 46px, 28px
```

| Radius | Used for |
|---|---|
| 46px `rounded-card` | page-level cards: Styles, payment log, closing CTA, upload zone, error pages |
| 44px / 34px | phone mock outer and inner frame |
| 28px `rounded-panel` | secondary cards, preset tiles, compare slider, mobile menu |
| 24px `rounded-3xl` | live stats strip |
| 16px `rounded-2xl` | tiles inside cards, log rows, banners |
| 12px `rounded-xl` | icon chips, mock style chips, menu items |
| pill `rounded-full` | every button, tags, rail selector, badges |

46px is large enough that cards read as soft objects rather than boxes. The config notes it was taken from a reference design.

### Shadows

```ts
boxShadow: {
  brand: '0 14px 30px -12px rgba(41,72,181,0.55), 0 2px 6px 0 rgba(41,72,181,0.22),'
       + ' inset 0 1px 0 0 rgba(255,255,255,0.45), inset 0 -2px 6px 0 rgba(40,30,160,0.25)',
  ghost: '0 6px 18px -10px rgba(70,80,180,0.3), inset 0 1px 0 0 rgba(255,255,255,0.9)',
  card:  '0 24px 60px -32px rgba(35,52,112,0.35), 0 2px 8px -4px rgba(35,52,112,0.08)',
  lift:  '0 18px 40px -24px rgba(35,52,112,0.4)',
}
```

Every shadow is **tinted** (indigo or navy), never neutral grey, and uses heavy negative spread so it pools under the object rather than haloing it. The two button shadows add inset highlights: a 1px white top edge on both, and a dark inner bottom on the primary, which is what makes it look pressed from glass rather than flat.

### Buttons

```ts
backgroundImage: {
  'brand-gradient':
    'linear-gradient(rgba(255,255,255,0.28), rgba(255,255,255,0) 52%),'
  + ' linear-gradient(100deg, #5C7DE2 0%, #4262D4 48%, #2948B5 100%)',
}
```

```css
.btn-primary {
  @apply inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient
    px-7 py-3.5 font-semibold text-white shadow-brand transition
    active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none;
}
.btn-ghost {
  @apply inline-flex items-center justify-center gap-2 rounded-full border border-white/85
    bg-white/55 px-6 py-3.5 font-semibold text-ink shadow-ghost transition
    active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45;
}
```

Two stacked gradients: a white sheen fading out at 52% height over a 100° indigo sweep. Press is a 1.5% scale-down. There is no hover state on the buttons; the design assumes touch.

### Icon chip

```css
.chip { @apply grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white
          bg-white/80 text-brand-500 shadow-ghost; }
```

A 36px frosted tile holding a 1.7px-stroke SVG in `brand-500`. It fronts feature cards, preset tiles and banners.

---

## 5. The backdrop

```tsx
<div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-page-wash">
  <div className="animate-blob absolute -left-[15%] -top-[10%] h-[55%] w-[60%] rounded-full
                  bg-[radial-gradient(circle,rgba(127,158,224,0.28),transparent_65%)]" />
  <div className="animate-blob absolute -right-[10%] top-[5%] h-[50%] w-[55%] rounded-full
                  bg-[radial-gradient(circle,rgba(100,196,204,0.22),transparent_65%)] [animation-delay:-6s]" />
  <div className="animate-blob absolute bottom-[10%] left-[20%] h-[45%] w-[60%] rounded-full
                  bg-[radial-gradient(circle,rgba(158,178,229,0.2),transparent_65%)] [animation-delay:-12s]" />
</div>
```

```ts
'page-wash': 'linear-gradient(165deg, #F5F9FC 0%, #E8F1F7 38%, #EEF4F8 68%, #E4EEF4 100%)'
blob: { '0%,100%': 'translate(0,0) scale(1)', '33%': 'translate(3%,-4%) scale(1.06)',
        '66%': 'translate(-3%,3%) scale(0.96)' }   // 18s ease-in-out infinite
```

A diagonal wash of four haze steps, then three large radial blooms (cornflower, teal, periwinkle at 20–28% opacity) drifting on an 18-second loop. **Negative** delays (-6s, -12s) start each bloom mid-cycle, so they're already out of phase on first paint. Fixed, behind everything, `aria-hidden`, `pointer-events-none`. This is what the frosted panels blur.

---

## 6. Layout

### Landing

- Sticky glass header: `border-b border-white/60 bg-haze-400/70 backdrop-blur-xl`, `pt-safe`, wordmark left, two links right; below `sm` the links collapse into a menu button so the wordmark keeps its width at 360px.
- Content container `max-w-6xl px-6`.
- Hero: `lg:grid-cols-[1.05fr_0.95fr]`, copy left, phone right.
- Sections in order: hero, live stats strip, four feature cards, a large Styles card, four step cards, the payment story, a centred closing CTA, a four-column footer.

### Studio (`/app`)

- A single `max-w-md` column on phones (`px-2.5`), becoming two columns inside `max-w-5xl` at `lg`, with the example showcase sticky on the right.
- The header carries only the wordmark (which is the way back) and a "$0.10 / shot" price pill.
- `pb-44` clears the fixed pay bar on phones.
- A result replaces the compose view in the same `max-w-md` column.

The studio's layout principle, stated in the preset picker's comment: keep the chosen style, the photo above it and the pay button below it on screen at once, so the whole flow fits in one thumb-reachable view.

---

## 7. Components

**Phone mock (the signature).** A hand-built phone rather than a screenshot, so it stays crisp and can't drift out of date. Inside: an "after" layer (styled, warm, periwinkle-tinted), a "before" layer (flat, desaturated) clipped by an animated `clip-path`, and a divider plus handle riding a wrapper animated with the same curve and keyframe stops, so the "before" edge always ends exactly under the divider. The sweep range is weighted right so the styled result holds the larger share of the frame. A sheen crosses the glass timed to the sweep, the device floats 10px, a quote callout floats 6px the other way for depth, and below the frame sit four style chips, a "Generate for $0.10" button, and the one real number in the mock: the live NIM price.

**Compare slider.** Pointer events for touch, pen and mouse with pointer capture; `preventDefault` on move so the webview doesn't take a horizontal drag as a page swipe. The "after" layer is clipped, not resized, so both images stay pixel-aligned. A 44px white handle is a `role="slider"` with `aria-valuetext`, arrow keys (Shift for 10%), Home and End. On mount it nudges 70% → 30% → 50% once to explain itself, and stops the moment you touch it.

**Preset picker.** A horizontal snap-scroll rail of 168px tiles, `role="radiogroup"` with `aria-checked`. Selected: `border-brand-300 bg-white shadow-card` plus a gradient check badge. Unselected: `bg-white/65 shadow-ghost`.

**Pay bar.** Fixed to the bottom inside the safe area, on the same haze glass as the header. When the device supports more than one payment rail, a pill `radiogroup` appears above the button; the selected rail takes the gradient. The full-width primary button names the price ("Generate for $0.10"), shows a shimmer sweep only when ready, and stays neutral ("…") until rail detection resolves, rather than flashing a price it might replace. A hint line under it tells you what's missing ("Add a photo to get started", "Pick a style").

**Generating overlay.** A full-screen haze glass with a pulsing ring, a spinner and the NimMark with its brackets "focusing". Instead of a fake percentage it walks the real pipeline stages (confirming payment, reading the photo, applying the style, finishing in HD) and stalls on the last one rather than completing early. "Stop waiting" fades in only after 12 seconds, captioned "Your payment stays credited". After 30 seconds without payment, it names the stuck wallet window and says nothing has been charged.

**Upload zone.** A `.card` with a pulsing icon, "Add your photo", and two stacked full-width buttons: camera (`capture="user"`) as primary, library as ghost. Drag-over adds a `ring-2 ring-brand-400`.

**Live stats.** A `dl` in a single 24px-radius glass strip, 2 columns on phones and 4 on desktop, value above label.

**Step cards.** `card-sm` with a large `brand-200` numeral (01–04) pinned top-right, used because the content is a real sequence.

**Payment log.** A `.card` of five rows, each a white tile with a gradient number badge, a bold step name and a muted note: "Order minted", "Chain verified", "Shot generated", and so on.

**Banners.** `card-sm` with a chip and a bold lead phrase inside `text-xs` copy. Tinted variants override the surface: amber for demo mode, `brand-50` for a waiting paid shot, rose (with `role="alert"`) for errors.

**NimMark.** Four rounded corner brackets around an N, drawn in SVG so it inherits colour and the brackets can animate separately; in `framed` mode they ease inward and back "the way a lens pulls focus".

**Wordmark.** A 3:1 PNG sized by height (`h-9 sm:h-10`) with auto width, so it doesn't shrink on narrow phones; `priority` because it's in the first viewport on every route.

**Error and 404.** A single centred `.card`, eyebrow, headline, one sentence, full-width primary and ghost actions, and the error digest in mono.

---

## 8. Motion

| Motion | Where | Timing |
|---|---|---|
| `blob` drift | backdrop blooms | 18s, infinite, staggered with negative delays |
| `fade-up` | hero columns | 0.5s `cubic-bezier(0.22,1,0.36,1)`, 12px rise, 120ms stagger |
| `ns-sweep` + `ns-reveal` | hero mock divider and clip | 8s `cubic-bezier(0.65,0,0.35,1)`, identical stops |
| `ns-sheen` | light across the mock | 8s, timed to arrive with the sweep |
| `ns-float` / `ns-float-counter` | phone / callout | 7s, 10px up / 6px down |
| `shimmer` | pay button when ready | 2.2s |
| `pulse-ring` | upload icon, generating overlay | 2s |
| `ns-frame` | NimMark brackets while generating | 2.2s |
| slider nudge | compare slider on mount | three steps over ~1s, once |
| press | buttons, chips | `scale(0.985)` |

The reasoning behind the hero motion, from the stylesheet: *rather than decorative motion, the divider walks the before/after comparison back and forth on a loop, so a visitor sees the actual product interaction demonstrated without touching anything.* That one is earned.

Reduced motion is handled twice, and well. A global rule clamps every animation and transition to 0.001ms with one iteration. Then the hero loops are removed outright and set to a **defined frozen frame**: the divider parked at 50% and the clip matching it, because *"the mock still reads correctly frozen."* The NimMark focus loop is also removed.

---

## 9. Accessibility

What's there:

- `role="slider"` with `aria-valuemin/max/now/valuetext` and full keyboard control on the compare handle.
- `role="radiogroup"` with `aria-checked` for presets and payment rails; `role="tablist"` / `aria-selected` for example styles.
- `role="status" aria-live="polite"` on the generating overlay; `role="alert"` on errors.
- `aria-expanded` / `aria-controls` / changing `aria-label` on the mobile menu button.
- `aria-hidden` on the backdrop, decorative icons and mock subjects; an `sr-only` label on the explorer link.
- Reduced motion with meaningful frozen states (§8).
- Documented contrast fixes for body text (§2).

What to add if you copy it:

- **A focus style.** Only the slider handle defines one (`focus-visible:ring-2 ring-brand-400`). Every other control relies on the browser default outline, which is hard to see against a gradient pill or white glass. Add one ring to `.btn-primary`, `.btn-ghost` and the tiles.
- **`ink-soft` on the bare page** dips to 4.33:1 at the dark end of the wash.
- **The result-page error** is `text-rose-600` directly on the page at 12px: 4.17:1.

---

## 10. Copy voice

- **The price is the headline:** "Studio photos for ten cents a shot." It's also the page title, the CTA caption and the studio's header pill.
- **Problem framed against the category:** "A good headshot should not cost fifty dollars a month." / "Most people need three headshots a year."
- **Trust as mechanism, stated plainly:** "We never take your word for it." / "Paid first, generated second." The payment story explains what the server actually checks.
- **Buttons carry the price:** "Generate for $0.10"; the studio header says "$0.10 / shot".
- **Waiting copy that answers the fear:** "Nothing has been charged unless you approved a payment." / "Stop waiting · Your payment stays credited."
- **Gesture hints in the corner:** "Swipe for more", "Drag to compare".
- **Short imperative sequence:** "Open, upload, pay, done."
- **Spaced hyphens rather than em dashes** in running copy: "NimSnap - Studio photos…", "pay $0.10 in NIM - from Nimiq Pay on your phone".

---

## 11. Build checklist

1. Tailwind v3 config: `ink`, `brand` (50–700), `haze` (50–400) and `accent` colours; `card` (46px) and `panel` (28px) radii; `brand`, `ghost`, `card`, `lift` shadows; `brand-gradient` and `page-wash` images; the `eyebrow` font size; the four keyframes.
2. Load one family through `next/font` as `--font-sans`; set every heading to 600 with -0.035em tracking.
3. Base layer: haze ground, navy ink, `100dvh`, no overscroll, no tap highlight, safe-area variables and `pt-safe` / `pb-safe`.
4. Match `themeColor`, manifest background and page ground.
5. Build the fixed backdrop: the wash plus three blooms with negative animation delays.
6. `.card` and `.card-sm`: white at 65–70%, 1px white border, backdrop blur, tinted long shadow.
7. `.btn-primary` with the two-layer gradient and inset-highlight shadow; `.btn-ghost` in white glass; both pills, both pressing to 0.985.
8. Keep every shadow tinted and pooled with negative spread.
9. Add a visible focus ring to buttons and tiles before anything else ships.
10. Pin the primary action to the bottom safe area on phones and pad the content to clear it.
11. Put the product's core interaction in the hero, animated, with a defined reduced-motion frame.
12. Check `ink-soft` and any status colour on the darkest end of the wash, not just on cards.

---

## 12. What to change when reusing

| Keep | Change |
|---|---|
| Navy ink with a three-step muted ramp, measured and documented | The hue |
| One gradient for every primary action | Its colours (and re-measure white on its lightest stop) |
| Frosted panels with a white edge and tinted, pooled shadows | Opacity and blur amounts |
| A hero that demonstrates the product's interaction on a loop | — the best idea here |
| Reduced motion that freezes on a meaningful frame, not just a shorter animation | — |
| Staged progress instead of a fake percentage, with a delayed, reassuring cancel | — |
| Pay bar pinned under the thumb, price in the button | — |
| Safe-area, theme-colour and viewport fit for in-app webviews | — |
| The 46 / 28 / 16px radius ladder | The values |

**The idea to think hardest about:** most of the visual layer here is the current soft-glass default. Pale wash, drifting colour blobs, frosted white cards, an indigo gradient pill, a tracked-out uppercase eyebrow over every section: you can find that combination on a great many product pages, and on its own it doesn't say "photo studio". What's genuinely NimSnap is the behaviour: the phone that shows the before/after without being touched, the price living in the headline and the button, and the payment flow that explains itself while you wait. If you reuse this, keep the behaviour and spend the visual freedom on something from your own product's world rather than on another copy of the glass kit.

**Also worth trimming:** the page carries a lot of ambient motion at once (three drifting blobs, a floating phone, a counter-floating callout, a sheen, a shimmer). The sweep earns its place; the rest competes with it. One orchestrated loop reads stronger than five.

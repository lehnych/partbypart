---
version: alpha
name: PartByPart
description: |
  PartByPart's design system is a dark, technical workspace for
  watching a brick model come together part by part. Monochromatic base surfaces
  keep the 3D stage calm and distraction-free, while a single red accent
  (#FF5A63) marks the next action, active tools, build progress and the newly
  added part. Monospace type carries step numbers and counters; depth comes from
  subtle colour shifts and 1px lines rather than layered shadows.
colors:
  primary: "#FF5A63"
  canvas: "#090C0A"
  surface: "#111215"
  on-primary: "#2A0507"
  ink: "#7D8A82"
  accent-1: "#2E3832"
  accent-2: "#34C77B"
  neutral-1: "#E3EAE5"
  neutral-2: "#AEB9B1"
typography:
  body-md:
    fontFamily: "Inter Variable"
    fontSize: 0.9375rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter Variable"
    fontSize: 0.84375rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-xs:
    fontFamily: "Inter Variable"
    fontSize: 0.78125rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-xs-strong:
    fontFamily: "Inter Variable"
    fontSize: 0.78125rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  button-sm:
    fontFamily: "Inter Variable"
    fontSize: 0.78125rem
    fontWeight: 600
    letterSpacing: 0
  button-xs:
    fontFamily: "Inter Variable"
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: 0
  button-xs-arial:
    fontFamily: Arial
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: 0
  button-xs-strong:
    fontFamily: "Inter Variable"
    fontSize: 0.75rem
    fontWeight: 600
    letterSpacing: 0
  caption-md:
    fontFamily: "Inter Variable"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption-md-tight:
    fontFamily: "Inter Variable"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  caption-md-2:
    fontFamily: "Inter Variable"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption-sm:
    fontFamily: "Inter Variable"
    fontSize: 0.71875rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption-xs:
    fontFamily: "Inter Variable"
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.06em
    textTransform: uppercase
  caption-xs-tight:
    fontFamily: "Inter Variable"
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.05em
    textTransform: uppercase
  code-xl:
    fontFamily: "JetBrains Mono Variable"
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.02em
  code-lg:
    fontFamily: "JetBrains Mono Variable"
    fontSize: 0.8125rem
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0.14em
  code-md:
    fontFamily: "JetBrains Mono Variable"
    fontSize: 0.6875rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  code-md-strong:
    fontFamily: "JetBrains Mono Variable"
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  code-md-uppercase:
    fontFamily: "JetBrains Mono Variable"
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.08em
    textTransform: uppercase
  code-sm:
    fontFamily: "JetBrains Mono Variable"
    fontSize: 0.625rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
rounded:
  none: 0
  xs: 0.25rem
  sm: 0.375rem
  md: 0.5rem
spacing:
  xxs: 0.25rem
  xs: 0.5rem
  sm: 0.75rem
  md: 1rem
borderWidths:
  thin: 1px
shadows:
  sm: "rgba(0, 0, 0, 0.45) 0px 12px 32px 0px"
  md: "rgb(46, 56, 50) 0px 0px 0px 1px inset"
elevationStrategy: progressive
themes:
  derived: light   # the other theme is the site's measured palette
  light:
    bg: "#F9FEFA"
    surface: "#EFF4F0"
    surfaceRaised: "#E8ECE9"
    text: "#141C17"
    textMuted: "#6A716C"
    border: "#D6DAD7"
    accent: "#D91F2A"
    accentFg: "#FFFFFF"
    focusRing: "#D91F2A"
    elevation: shadow
  dark:
    bg: "#090C0A"
    surface: "#111215"
    surfaceRaised: "#242528"
    text: "#7D8A82"
    textMuted: "#545E58"
    border: "#171B18"
    accent: "#FF5A63"
    accentFg: "#2A0507"
    focusRing: "#FF5A63"
    elevation: "border+surface"
  contrastFailures:
    - "dark: muted on bg = 2.92:1 (needs 4.5:1)"
components:
  button-primary:
    textColor: "{colors.neutral-1}"
    border: "1px solid rgba(255, 90, 99, 0.45)"
    height: 2rem
    padding: "0 0.625rem 0 0.625rem"
    fontSize: 0.78125rem
    fontFamily: "Inter Variable"
    fontWeight: 400
    rounded: "{rounded.sm}"
    backgroundColor: "rgba(255, 90, 99, 0.12)"
  button-primary-sm:
    typography: "{typography.button-xs-strong}"
    textColor: "rgb(42, 5, 7)"
    border: "1px solid {colors.primary}"
    height: 1.625rem
    padding: "0 0.5rem 0 0.5rem"
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.primary}"
  button-filled:
    typography: "{typography.button-xs}"
    textColor: "{colors.neutral-1}"
    border: "1px solid rgb(34, 42, 37)"
    height: 1.75rem
    padding: "0 0.5625rem 0 0.5625rem"
    rounded: "{rounded.sm}"
    backgroundColor: "rgb(20, 25, 22)"
  button-filled-sm:
    typography: "{typography.button-xs}"
    textColor: "{colors.neutral-1}"
    height: 1.375rem
    padding: "0 0.5625rem 0 0.5625rem"
    boxShadow: "{colors.accent-1} 0px 0px 0px 1px inset"
    rounded: "{rounded.xs}"
    backgroundColor: "rgb(26, 32, 28)"
  card:
    textColor: "{colors.neutral-1}"
    border: "1px solid {colors.accent-1}"
    fontSize: 0.8125rem
    boxShadow: "rgba(0, 0, 0, 0.45) 0px 12px 32px 0px"
    fontFamily: "Inter Variable"
    fontWeight: 400
    lineHeight: 1.4
    rounded: "{rounded.md}"
    backgroundColor: "rgba(17, 18, 21, 0.96)"
  card-sm:
    textColor: "{colors.neutral-1}"
    padding: "1rem 1rem 1rem 1rem"
    fontSize: 0.8125rem
    fontFamily: "Inter Variable"
    fontWeight: 400
    lineHeight: 1.4
  badge-filled:
    typography: "{typography.code-md-strong}"
    textColor: "{colors.neutral-2}"
    border: "1px solid rgb(34, 42, 37)"
    height: 1.25rem
    padding: "0 0.4375rem 0 0.4375rem"
    rounded: "{rounded.xs}"
    backgroundColor: "rgb(26, 32, 28)"
  badge-primary:
    textColor: "{colors.primary}"
    border: "1px solid rgba(255, 90, 99, 0.45)"
    height: 1.125rem
    padding: "0 0.3125rem 0 0.3125rem"
    fontSize: 0.65625rem
    fontFamily: "JetBrains Mono Variable"
    fontWeight: 600
    rounded: "{rounded.xs}"
    backgroundColor: "rgba(255, 90, 99, 0.12)"
  footer:
    typography: "{typography.caption-sm}"
    textColor: "{colors.ink}"
    border: "1px solid rgb(34, 42, 37)"
    padding: "0 0.75rem 0 0.75rem"
    backgroundColor: "rgb(15, 19, 17)"
states:
  button-disabled:
    target: button
    state: disabled
    opacity: 0.45
  button-hover:
    target: button
    state: hover
    borderColor: "rgb(47, 116, 230)"
    backgroundColor: "rgb(47, 116, 230)"
  card-hover:
    target: card
    state: hover
    transform: "translateY(-1px)"
breakpoints:
  - width: 375
    containerWidth: 375
    gridColumns: 2
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 0
    bodyPx: 13
    sectionPaddingX: 0
  - width: 768
    containerWidth: 768
    gridColumns: 0
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 0
    bodyPx: 13
    sectionPaddingX: 0
  - width: 1024
    containerWidth: 1024
    gridColumns: 0
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 0
    bodyPx: 13
    sectionPaddingX: 0
  - width: 1280
    containerWidth: 1280
    gridColumns: 0
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 0
    bodyPx: 13
    sectionPaddingX: 0
  - width: 1440
    containerWidth: 1440
    gridColumns: 0
    navLinksVisible: 0
    menuToggleVisible: false
    headingPx: 0
    bodyPx: 13
    sectionPaddingX: 0
coverage:
  statesFound: 13
  gradientsFound: 0
  rolesUnassigned: 4
  archetypesUnnamed: 0
  archetypesDetected: 0
  responsiveMeasured: true
  stylesheetsBlocked: false
  semanticRampDeclared: false
---

# Design System – PartByPart

PartByPart is a portal for 3D building instructions (brick models now, furniture later). The word mark is `PARTBYPART`
in capitals (code-lg), next to the brick logo. This file is the reference for every visual change. The tokens live as
CSS variables in `app/src/scss/style.scss`; change them there and here together.

- **Accent** is red: dark `#FF5A63` (tint `rgba(255, 90, 99, .12)`, line `.45`, text on it `#2A0507`), light `#D91F2A`
  (text on it `#FFFFFF`). It marks the primary button, pressed toggles, focus, build progress, the logo and the new part
  in the 3D view.
- **Light theme** uses `themes.light` with the red accent.
- **Muted text** stays `#7D8A82` in dark (`#545E58` fails contrast, see `contrastFailures`); light `#6A716C`.
- **Units:** sizes in `rem` (1rem = the browser's base size, 16px by default, so the page scales with the visitor's font
  setting); letter-spacing in `em` (relative to the text size); hairlines, borders and shadows in `px`; breakpoint
  widths describe devices and stay in `px`. In `style.scss` sizes are written `rem(Npx)`.
- **Fonts** are bundled from `app/src/fonts/` (Inter Variable, JetBrains Mono Variable, latin + latin-ext).

## Details

## 1. Visual Theme & Atmosphere

The simulator's design system is a dark, technical workspace for watching a brick model come together part by part.
Monochromatic base surfaces keep the 3D stage calm and distraction-free, while a single red accent (`{colors.primary}` —
`#FF5A63`) marks the next action, active tools, build progress and the newly added part. Monospace typography carries
step numbers, counters and the word mark, giving the interface a precise, instrument-like feel. Depth emerges not from
layered shadows but from subtle color shifts and 1px lines, with one soft shadow reserved for floating windows.

**Key Characteristics**
- Dark canvas (`{colors.canvas}` — `#090C0A`) establishes a neutral stage for the model
- One bright red accent marks the next action, active states and progress
- Monospace type for numbers (steps, counters) reinforces precision
- Minimal shadow use—depth comes primarily from color blocking
- Sharp and softly rounded corners reflect component precision
- High text contrast against dark surfaces ensures accessibility in focused environments

## 2. Color Palette & Roles

### Primary
- **Primary / Brand** (`{colors.primary}` — `#FF5A63`): Primary CTAs, active states, accent lighting, link highlights.
  Core brand identifier used for "Next part", the logo and focus states.

### Accent Colors
- **Accent 1** (`{colors.accent-1}` — `#2E3832`): Decorative; no measured role. Used for visual variation in component
  interiors.
- **Accent 2** (`{colors.accent-2}` — `#34C77B`): Decorative; no measured role. Visual accent in illustration or
  subsidiary UI elements.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#090C0A`): Default page background; primary environment surface.
- **Surface** (`{colors.surface}` — `#111215`): Card and panel backgrounds; contained content zones.
- **Ink** (`{colors.ink}` — `#7D8A82`): Primary headings and body text; readable mid-tone on dark.
- **On Primary** (`{colors.on-primary}` — `#2A0507`): Label text and elements rendered on brand-colored surfaces.
- **Neutral 1** (`{colors.neutral-1}` — `#E3EAE5`): Light neutral; secondary body text and captions.
- **Neutral 2** (`{colors.neutral-2}` — `#AEB9B1`): Medium neutral; tertiary text, muted labels, subtle accents.

## 3. Typography Rules

### Font Family
**Primary:** Inter Variable with fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

**Secondary (Code/Technical):** JetBrains Mono Variable with fallback: `"Courier New", monospace`

**Tertiary:** Arial (fallback usage only)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Code XL | JetBrains Mono | 1.25rem | 400 | 1.4 | 0.02em | Large numeric displays; readable at distance |
| Code Large | JetBrains Mono | 0.8125rem | 700 | 1.4 | 0.14em | Uppercase technical labels; high contrast |
| Body Medium | Inter | 0.9375rem | 600 | 1.4 | 0 | Section headings and prominent body text |
| Body Small | Inter | 0.84375rem | 600 | 1.4 | 0 | Standard body copy; secondary headings |
| Body XS Strong | Inter | 0.78125rem | 500 | 1.4 | 0 | Emphasized small text; instructional copy |
| Body XS | Inter | 0.78125rem | 400 | 1.55 | 0 | Base body text; reading comfort |
| Button Small | Inter | 0.78125rem | 600 | — | 0 | Action labels; medium density |
| Button XS Strong | Inter | 0.75rem | 600 | — | 0 | Dense action buttons; secondary CTAs |
| Button XS | Inter | 0.75rem | 500 | — | 0 | Compact button labels; tight spacing |
| Code Medium | JetBrains Mono | 0.6875rem | 400 | 1.4 | 0 | Counters, time-line labels; inline code |
| Code MD Strong | JetBrains Mono | 0.6875rem | 500 | 1.4 | 0.06em | Uppercase monospace labels; tight tracking |
| Code MD Uppercase | JetBrains Mono | 0.6875rem | 600 | 1 | 0.08em | Technical labels; set numbers |
| Caption Medium | Inter | 0.75rem | 400 | 1.5 | 0 | Supporting text; annotations |
| Caption MD Tight | Inter | 0.75rem | 400 | 1.45 | 0 | Condensed captions; space-constrained |
| Caption MD 2 | Inter | 0.75rem | 400 | 1.4 | 0 | Variant caption sizing |
| Caption XS | Inter | 0.6875rem | 600 | 1.4 | 0.06em | Uppercase small text; status badges |
| Caption XS Tight | Inter | 0.6875rem | 600 | 1.4 | 0.05em | Compact uppercase labels |
| Caption Small | Inter | 0.71875rem | 400 | 1.4 | 0 | Smallest text; footer, disclaimers |

### Principles
- **Multi-register precision:** Typography scales in small increments (0.6875–0.9375rem body range) enabling
  fine-grained density control in a compact, technical interface.
- **Monospace authenticity:** JetBrains Mono reserved exclusively for technical output (step numbers, counters,
  time-line labels, set number, word mark) to signal machine-readable data.
- **Tight leading:** Most scales use line-height 1.4 or tighter, prioritizing visual economy on a constrained canvas.
- **Tracking variation:** Uppercase technical labels receive increased letter-spacing (0.03438–0.11375rem) to reinforce
  non-interactive, read-only data zones.
- **Weight contrast:** 400–600 weight range enables hierarchy without relying on size alone; body text is lighter,
  headings and buttons are bold.

## 4. Component Stylings

### Buttons

**Primary (Large)**
- Background: `rgba(255, 90, 99, 0.12)` (tinted accent)
- Text color: `rgb(227, 234, 229)` (light neutral)
- Border: `1px solid rgba(255, 90, 99, 0.45)` (semi-transparent brand)
- Padding: `0 0.625rem`
- Height: `2rem`
- Font: `{typography.body-xs}` (0.78125rem, weight 400, Inter)
- Border radius: `{rounded.sm}` (0.375rem)
- Box shadow: none
- Hover state: Border color changes to `var(--border-strong)`; text color to `var(--text)`

**Primary Small (Filled)**
- Background: `rgb(255, 90, 99)` (solid accent)
- Text color: `rgb(42, 5, 7)` (dark ink on bright)
- Border: `1px solid rgb(255, 90, 99)` (solid brand)
- Padding: `0 0.5rem`
- Height: `1.625rem`
- Font: `{typography.button-xs-strong}` (0.75rem, weight 600, Inter)
- Border radius: `{rounded.sm}` (0.375rem)
- Box shadow: none
- Hover state: Border color changes to `var(--border-strong)`

**Secondary (Filled)**
- Background: `rgb(20, 25, 22)` (surface-adjacent dark)
- Text color: `rgb(227, 234, 229)` (light neutral)
- Border: `1px solid rgb(34, 42, 37)` (surface border)
- Padding: `0 0.5625rem`
- Height: `1.75rem`
- Font: `{typography.button-xs}` (0.75rem, weight 500, Inter)
- Border radius: `{rounded.sm}` (0.375rem)
- Box shadow: none
- Hover state: Text color to `var(--muted)`; background transparent

**Secondary Small (Filled)**
- Background: `rgb(26, 32, 28)` (slightly lighter dark surface)
- Text color: `rgb(227, 234, 229)` (light neutral)
- Border: none (`0`)
- Padding: `0 0.5625rem`
- Height: `1.375rem`
- Font: `{typography.button-xs}` (0.75rem, weight 500, Inter)
- Border radius: `{rounded.xs}` (0.25rem)
- Box shadow: `rgb(46, 56, 50) 0px 0px 0px 1px inset` (inset border effect)
- Hover state: Color and background adjust per interaction rules

### Cards & Containers

**Card (Default)**
- Background: `rgba(17, 18, 21, 0.96)` (semi-transparent surface)
- Text color: `rgb(227, 234, 229)` (light neutral)
- Border: `1px solid rgb(46, 56, 50)` (subtle surface separator)
- Padding: `0` (no internal padding)
- Border radius: `{rounded.md}` (0.5rem)
- Box shadow: `rgba(0, 0, 0, 0.45) 0px 12px 32px 0px` (soft drop shadow for depth)
- Font size: `0.8125rem`, weight 400 (Inter), line-height 1.1375rem
- Hover state: Transform `translateY(-1px)`; border color to `var(--border-strong)`

**Card (Small, Unshadowed)**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text color: `rgb(227, 234, 229)` (light neutral)
- Border: none (`0`)
- Padding: `{spacing.md}` (1rem on all sides)
- Border radius: `{rounded.none}` (0 / sharp)
- Box shadow: none
- Font size: `0.8125rem`, weight 400 (Inter), line-height 1.1375rem
- Hover state: None specified

### Inputs & Forms

**Input Base**
- Border: `1px solid` (color varies by state)
- Border radius: `{rounded.sm}` (0.375rem)
- Hover state: Border color to `var(--border-strong)` (elevated border visibility)
- Focus state: Border color to `var(--accent)` (accent on focus)

### Badges

**Badge (Filled)**
- Background: `rgb(26, 32, 28)` (dark surface variant)
- Text color: `rgb(174, 185, 177)` (muted neutral)
- Border: `1px solid rgb(34, 42, 37)` (surface border)
- Padding: `0 0.4375rem`
- Height: `1.25rem`
- Font: `{typography.code-md-strong}` (0.6875rem, weight 500, JetBrains Mono)
- Border radius: `{rounded.xs}` (0.25rem)
- Box shadow: none

**Badge (Primary)**
- Background: `rgba(255, 90, 99, 0.12)` (tinted brand)
- Text color: `rgb(255, 90, 99)` (bright accent)
- Border: `1px solid rgba(255, 90, 99, 0.45)` (semi-transparent brand)
- Padding: `0 0.3125rem`
- Height: `1.125rem`
- Font: `{typography.caption-xs}` (0.6875rem, weight 600, letter-spacing 0.04125rem, Inter, uppercase)
- Border radius: `{rounded.xs}` (0.25rem)
- Box shadow: none

### Header, picker and catalog

**Header:** logo cell (brick outline in the accent, width of the rail) · word mark `PARTBYPART` (code-lg) with the
accent block cursor · divider · **picker** · help · settings.

**Picker** (the instruction shown; opens the catalog)
- Background `rgba(255, 90, 99, 0.12)`, border `1px solid rgba(255, 90, 99, 0.45)` (accent tint), hover/open border
  accent
- Height `1.75rem`, radius `{rounded.sm}`, content: badge with the set number · title (ellipsis) · chevron
- Narrow screens: word mark hidden, picker takes the free width

**Catalog dialog** ("Instructions")
- Modal, centred, width `53.75rem` (max viewport − `2rem`), card style (`--card`, shadow, `{rounded.md}`); full screen
  on narrow screens. **All dialogs** (catalog, help) open centred between header and status bar; help is `33.75rem` wide
- Head: title + badge "n available" + close; tools row: segmented tabs `All (n) · Brick models (n) · Furniture (n)` and
  a filter field (name, set number, maker)
- One section per category: title `0.875rem/600` + caption `0.75rem` muted + badge with the count
- Cards in a grid (`minmax(21.25rem, 1fr)`, gap `0.75rem`): badge set number · state badge · title `0.875rem/600` ·
  description `0.78125rem` · chips (badge-filled) · progress bar (accent) for the open instruction
- Open card: accent border and accent tint; hover: border-strong and `translateY(-1px)`
- Empty category: dashed `border-strong` box with icon, "Coming soon" and one line of text

### Navigation

**Footer (Default)**
- Background: `rgb(15, 19, 17)` (darkest neutral; below canvas)
- Text color: `rgb(125, 138, 130)` (muted ink)
- Border: `1px solid rgb(34, 42, 37)` (top separator)
- Padding: `0 0.75rem`
- Height: `1.625rem`
- Font: `{typography.caption-sm}` (0.71875rem, weight 400, Inter)
- Border radius: `{rounded.none}` (0 / sharp)
- Box shadow: none

## 5. Layout Principles

### Spacing System
**Base unit:** `{spacing.xs}` = 0.5rem

**Scale:**
- `{spacing.xxs}` = 0.25rem — micro-adjustments, icon gaps
- `{spacing.xs}` = 0.5rem — standard vertical rhythm, button/input padding
- `{spacing.sm}` = 0.75rem — section spacing, grouped content
- `{spacing.md}` = 1rem — card padding, container margins, section separation

**Usage context:**
- Button/input padding typically uses `{spacing.xs}` or `{spacing.sm}` (0.5–0.75rem internal)
- Card padding uses `{spacing.md}` (1rem) when present
- Section-to-section vertical rhythm defaults to `{spacing.md}` (1rem)

### Grid & Container
- **Max width:** Measured viewport widths from 375px (mobile) to 1440px (desktop); no explicit max-width constraint
  observed. Content columns expand to full viewport width at all breakpoints.
- **Column strategy:** Single-column fluid layout across all breakpoints. No multi-column grid detected; responsive
  behavior is achieved through reflow and text-size adjustments, not column restructuring.
- **Section patterns:** Full-width sections with consistent padding (when measured: 0 section padding-x at all
  breakpoints indicates edge-to-edge layouts).

### Whitespace Philosophy
The system favors **compact, high-density layouts** that maximize visible information on a constrained screen. Vertical
rhythm is maintained through consistent `{spacing.md}` gaps between sections, but internal card/component padding is
minimal or absent. This creates a focused, tool-like interface where users can follow the build and reach the controls
without visual noise. Horizontal whitespace is conserved; components flex to available width rather than floating in
centered, padded containers.

### Border Radius Scale
- `{rounded.none}` = 0 — cards (small variant), footer, sections with sharp edges
- `{rounded.xs}` = 0.25rem — badges, small contained elements, fine-tuned UI density
- `{rounded.sm}` = 0.375rem — buttons (primary, secondary), inputs, moderate-sized interactive elements
- `{rounded.md}` = 0.5rem — cards (default), larger contained surfaces, prominent components

### Border Widths
- **Thin:** `1px` — used on all borders (buttons, cards, badges, inputs, footer). The system uses a single, consistent
  stroke weight for visual cohesion.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow; border only | Small cards (unshadowed variant), badge, footer, input, secondary buttons |
| Lifted | `rgba(0, 0, 0, 0.45) 0px 12px 32px 0px` | Primary card component; pronounced depth for content panels |
| Inset | `rgb(46, 56, 50) 0px 0px 0px 1px inset` | Secondary button variants; tactile depression effect |

**Shadow Philosophy:** The system employs a **single-tier elevation strategy** with a generous drop shadow reserved for
the primary card component, creating a clear visual hierarchy without cascading shadow layers. Most UI elements
(buttons, small cards, badges) remain flat, relying on border color and background shifts to establish hierarchy. An
inset shadow variant appears on secondary button fills, adding tactile feedback without introducing external depth. This
restraint maintains the calm, flat aesthetic while providing critical visual separation for content panels.

### Opacity Levels
- **0.80 (80%)** — semi-transparent surfaces; slightly reduced opacity
- **0.45 (45%)** — disabled button opacity; significantly reduced opacity for inactive states

### Z-index / Layering
The system employs a linear stacking scale for dropdown and overlay elements:
- Base: 0 (default)
- Dropdown: 11, 12, 15, 20, 25, 30, 50, 60 (ascending z-index values for layered dropdown states and modal surfaces)

The measured z-indices show a sparse but deliberate stacking context. Dropdowns and overlays cluster in the 11–30 range
for standard interactions; higher values (50, 60) reserve space for top-level modals or system alerts.

## 7. Do's and Don'ts

### Do
- **Use `{colors.primary}` (`#FF5A63`) for all primary CTAs and active states.** The red accent is the single source of
  emphasis; deploy it consistently on "Next part", pressed tools, progress and focus states to train user recognition.
- **Maintain high contrast between text and surfaces.** Light neutral text (`{colors.neutral-1}` — `#E3EAE5`) on dark
  backgrounds (`{colors.canvas}`, `{colors.surface}`) ensures legibility on the dark stage. Test WCAG AA compliance.
- **Reserve JetBrains Mono for technical output only:** step numbers, counters, time-line labels, the set number and the
  word mark. Never use monospace for UI labels or navigation; it should signal "machine-readable data."
- **Group related controls with `{spacing.md}` (1rem) gaps** between sections and `{spacing.xs}` (0.5rem) gaps between
  inline elements.
- **Layer cards with the primary drop shadow (`{colors.primary}` box-shadow rule) when content requires visual
  prominence.** Flat, borderless cards are acceptable for supporting or secondary content.
- **Apply soft border radii (`{rounded.sm}`, `{rounded.md}`) to interactive elements** to signal affordance while
  maintaining technical precision. Avoid sharp corners on buttons and inputs.

### Don't
- **Do not use opacity-adjusted colors as borders or backgrounds.** The system provides discrete color values; do not
  alpha-blend intermediate tones. If a tinted surface is needed (e.g., brand accent at 12% opacity), use the extracted
  `rgba()` values exactly.
- **Do not mix font families within a single interactive component.** Buttons and form fields use Inter exclusively;
  monospace is reserved for display zones (code, technical readouts, status lines).
- **Do not layer multiple shadows.** Use either flat (no shadow), the single drop shadow on cards, or an inset shadow on
  secondary buttons. Stacked shadows create visual clutter on a low-contrast dark canvas.
- **Do not exceed `{spacing.md}` (1rem) internal padding on compact components.** Buttons use 0.5–0.625rem, badges use
  0.3125–0.4375rem; violating this constraint adds unnecessary height and breaks the visual density.
- **Do not disable buttons or inputs with color changes alone.** Use opacity (`0.45`) or a dedicated muted state to
  indicate disabled status; never rely on color alone for accessibility.
- **Do not introduce new border radii values.** Only `{rounded.none}`, `{rounded.xs}`, `{rounded.sm}`, `{rounded.md}`
  are permitted. Inconsistent radii fragment the design language.

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Viewport Width | Content Column | Key Changes |
|------------|--------|---|---|
| Mobile | 375px | 375px (full width) | Single column; body text 0.84375rem; section padding-x: 0 |
| Tablet | 768px | 768px (full width) | No layout change; full-width sections maintained; body text 0.84375rem |
| Laptop | 1024px | 1024px (full width) | No layout change; body text 0.84375rem |
| Desktop | 1280px | 1280px (full width) | No layout change; body text 0.84375rem |
| Large Desktop | 1440px | 1440px (full width) | No layout change; body text 0.84375rem |

**Responsive Strategy:** The interface uses a **single-column, full-width fluid layout** at all breakpoints. No media
query-driven layout changes are observed; the system scales content horizontally to fill available space rather than
introducing multi-column grids. Typography remains consistent across breakpoints (body text fixed at 0.84375rem),
ensuring readability on both small and large displays without size-dependent hierarchy shifts.

### Touch Targets
No explicit touch-target sizing data was extracted. Button heights measure 1.375–2rem across variants, and standard
input heights are 1.75–2rem, meeting or exceeding typical 3rem touch-target recommendations when accounting for
surrounding spacing. Badge heights are smaller (1.125–1.25rem) but are typically read-only, non-interactive elements.

### Collapsing Strategy
The interface does not collapse or hide UI elements based on viewport width. Navigation link visibility remains constant
(0 visible links measured across all breakpoints); the UI is consistently minimal and full-width. Sections and cards
reflow to available horizontal space without breaking into multiple columns or invoking hamburger menus.

## 9. Implementation Guide

### Quick Color Reference
When implementing UI from this design system, use:
- **Primary CTA & Active States:** Primary (`{colors.primary}` — `#FF5A63`)
- **Page/Canvas Background:** Canvas (`{colors.canvas}` — `#090C0A`)
- **Card/Panel Surface:** Surface (`{colors.surface}` — `#111215`)
- **Heading & Primary Text:** Ink (`{colors.ink}` — `#7D8A82`)
- **Button/Input Text:** Neutral 1 (`{colors.neutral-1}` — `#E3EAE5`)
- **Muted/Secondary Text:** Neutral 2 (`{colors.neutral-2}` — `#AEB9B1`)
- **On-Brand (Text on accent):** On Primary (`{colors.on-primary}` — `#2A0507`)

### Iteration Guide
1. **All interactive elements (buttons, inputs, badges) use `{rounded.sm}` (0.375rem) or `{rounded.xs}` (0.25rem).**
   Sharp corners are reserved for cards and sections; only use `{rounded.none}` (0) for full-width footers or
   edge-aligned elements.
2. **Typography pairs use Inter for UI and JetBrains Mono exclusively for numbers and technical labels.** If text is a
   step number, counter, set number or code, render it in monospace; all other labels and body text must be sans-serif
   Inter.
3. **Buttons come in two primary variants:** brand-tinted (light background, low opacity border) and dark-filled
   (high-contrast on dark surfaces). Choose brand-tinted for primary actions ("Next part"), dark-filled for secondary
   controls.
4. **Cards and containers use `{rounded.md}` (0.5rem) with optional drop shadow
   (`rgba(0, 0, 0, 0.45) 0px 12px 32px 0px`) for prominent content. Flat, borderless cards are acceptable for supporting
   information.
5. **Spacing follows a strict 0.5rem base unit:** padding and margins are `0.25rem`, `0.5rem`, `0.75rem`, or `1rem`
   only. Never use arbitrary spacing; round to the nearest step.
6. **Primary accent (`{colors.primary}` — `#FF5A63`) is reserved for CTAs, active badges, and focus states.** Do not use
   it for disabled, error, or background fills except as semi-transparent tints (`rgba(255, 90, 99, 0.12)` or `0.45`).
7. **Disabled states use `opacity: 0.45` on the entire element**, not color change. Text, border, and background all
   reduce opacity uniformly.
8. **Footer and base sections use the darkest neutrals (`#090C0A`, `#0F1311`) for below-canvas visual separation.**
   Never repeat canvas color; establish hierarchy through color blocking.

## 10. Known Gaps

- **No semantic status colors extracted.** The site does not expose error, success, warning, or info color roles in its
  measured styles. If status indication is needed, it must be inferred from context or added as a new role (not covered
  by this document).
- **No interaction states beyond hover, focus, disabled, and active.** Visited link states, long-press, or multi-touch
  gestures were not present in extracted data and are not defined here.
- **No dark/light mode variation.** One theme was measured; no derived or alternate theme data was provided. If the site
  ships dark-mode styles, they were not accessed during extraction.
- **No gradients or decorative meshes.** All fills are solid colors or flat rgba values; no linear/radial gradients or
  layered pattern overlays were detected.
- **Four extracted colors have no assigned role** (`{colors.accent-1}`, `{colors.accent-2}`, and two unmeasured
  decorative accents). These are described as visual accents in illustrations or component interiors but do not map to a
  semantic UI function.
- **No documented animation or transition states.** Hover state transforms (`translateY(-1px)`, `translateY(-50%)`) were
  read from CSS but no easing curves, durations, or keyframe details were provided. Implementation of motion should
  follow platform defaults or be specified separately.
- **Touch-target guidance is inferred, not measured.** Button and input heights meet or exceed typical recommendations,
  but no explicit accessibility audit or minimum touch size rule was enforced during design extraction.
- **No z-index context provided beyond dropdown values.** The 11–60 stacking range applies to dropdowns and overlays,
  but no information about how sidebars, modals, or toasts interact in the full layout hierarchy is available.
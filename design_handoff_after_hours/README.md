# Handoff: Class Tracklist — "After Hours" visual direction

## Overview
`2bstone2/personal` is Class Tracklist: a browser app that listens for a few seconds every two
minutes during a fitness class and builds a list of what played, auto-starting from Google /
Outlook / iCloud calendar events. The app works; its look and feel was the problem. This bundle
carries a new visual direction ("After Hours") applied across the app's existing screens, plus the
exploration it came out of and one parked alternative.

Nothing about the app's behavior, routes, or data model changes. This is a restyle: the palette is
the one already in `public/index.html` (`--primary`, `--secondary`, `--matcha`, `--olive`, etc.),
re-balanced, with one color replaced and a new type stack.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended
look and behavior, not production code to copy directly. They render as static mock screens; there
is no wiring to the real API.

The task is to **recreate these designs inside the existing codebase**: `public/index.html` (one
plain HTML file with an inline `<style>` block of CSS custom properties and an inline `<script>`
holding all app logic), served by `server.js` with routes in `src/routes/`. Keep that structure —
update the `:root` custom properties, the font links, and the element-level CSS/markup. Do not
introduce a build step or a framework.

The `.dc.html` files need `support.js` (included) sitting next to them to render; open them in a
browser to view.

## Fidelity
**High-fidelity.** Exact colors, fonts, sizes, weights, radii, and copy are specified below and
present in the HTML. Recreate pixel-accurately, then adapt spacing to real content lengths.

## The direction
Dark field, chartreuse highlight, periwinkle for secondary/meta labels, pink for the live state.
Wide grotesque headlines in uppercase, humanist sans for body, mono for every number and label.
The point is that a phone held in a dim studio at 6am shows a dark screen, and the one thing that
must be legible mid-class — what's playing and whether it's listening — is what carries color.

### Type stack
| Role | Font | Google Fonts spec |
| --- | --- | --- |
| Display / screen titles | Archivo | `Archivo:wdth,wght@112,700;112,800` — width axis at **112**, weight 800 |
| Body / UI | Manrope | `Manrope:wght@400;500;700` |
| Numbers, labels, timestamps | Space Mono | `Space+Mono:wght@400;700` |

Replaces Baloo 2 / Nunito / JetBrains Mono. Single link tag:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112,700;112,800;100,400&family=Manrope:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" />
```

Display type is always `text-transform: uppercase`, `letter-spacing: -0.02em`, `line-height: 1`,
`font-stretch: 112%`, `font-weight: 800`.

## Design Tokens

### Colors
| Token | Hex | Role |
| --- | --- | --- |
| `--field` | `#211D42` | App background (was `--on-secondary`) |
| `--field-deep` | `#17142F` | Page/desk background behind the app |
| `--card` | `rgba(239,237,250,0.07)` | Card and row fill on the field |
| `--card-hairline` | `rgba(239,237,250,0.14)` | Section rules inside cards |
| `--outline` | `rgba(239,237,250,0.30)` | Secondary button borders, unchecked boxes |
| `--text` | `#EFEDFA` | Primary text on field |
| `--text-muted` | `#C9C4E8` | Artists, meta, body copy |
| `--text-faint` | `#9089B0` | Zero-state numerals, disabled meta |
| `--accent` | `#ABDF53` | Chartreuse — active nav, track numbers, primary button, connected chip, checkbox fill, column headers |
| `--on-accent` | `#1F2B06` | Text on chartreuse |
| `--secondary` | `#9093EF` | Periwinkle — section labels (`CALENDARS`, `NEXT UP`), empty-state heading |
| `--live` | `#E97BB2` | Pink — listening pill, destructive hover |
| `--on-live` | `#3B1830` | Text on pink |

`#ABDF53` replaces the app's `--matcha: #B7CE8E`, which read too earthy on a dark field. Pink stays
as the live state; **red (`--danger: #FF2130`) is deliberately unused in this direction** — it was
tried and read as an error rather than a recording indicator. Keep `--danger` for genuine errors
(failed connect, permission denied).

Preserved from the current app: `#9093EF`, `#E97BB2`, `#211D42`, `#3B1830`, `#EFEDFA`, `#C9C4E8`.

### Spacing
Screen padding `22px` horizontal. Header block `26px` top, `18px` bottom. Content bottom `26px`.
Card padding `14–16px`. Row vertical padding `9px`. Gaps: `4px` label→value, `8px` between cards and
pills, `14–16px` between blocks, `22px` between Settings sections.

### Radii
App frame `26px` · cards and rows `14px` · pills, buttons, chips `99px` · checkboxes `5px`.

### Type scale
| Use | Font | Size | Weight | Notes |
| --- | --- | --- | --- | --- |
| Screen title | Archivo | 30px | 800 | uppercase, `line-height:1`, `letter-spacing:-0.02em` |
| Empty-state heading | Archivo | 22px | 800 | uppercase, periwinkle |
| Track title | Manrope | 15px | 700 | |
| Row title (History, events, settings) | Manrope | 14px | 700 | |
| Body copy | Manrope | 13px | 400 | `line-height:1.55` |
| Nav pill / button label | Manrope | 12–13px | 700 | |
| Artist / meta | Manrope | 12px | 400 | `--text-muted` |
| Section label | Space Mono | 10px | 400 | `letter-spacing:0.1em`, uppercase, periwinkle |
| Column header | Space Mono | 10px | 400 | `letter-spacing:0.1em`, chartreuse |
| Track number, timestamp | Space Mono | 11px | 400 | numbers zero-padded (`01`) |
| Chip (SPOTIFY, AUTO, CONNECTED) | Space Mono | 9px | 700 | `letter-spacing:0.06–0.08em` |

No shadows anywhere. Depth comes from the translucent card fill, not elevation.

## Screens / Views

All screens are one column, `width: 390px` in the mock (fluid in the real app — it currently caps at
`max-width: 480px`; keep that), on `--field`, radius `26px`.

### 1. Home — listening
**Purpose:** the live screen during class; shows what's been caught so far.

Layout: header block (`padding: 26px 22px 18px`, `flex-direction: column`, `gap: 16px`) then content
(`padding: 0 22px 26px`, `gap: 14px`).

- **Title** "Class Tracklist", Archivo 30px/800 uppercase, two lines (`Class` / `Tracklist`).
- **Live pill** — pink `#E97BB2`, `--on-live` text, `border-radius: 99px`, `padding: 8px 14px`,
  `align-self: flex-start`, Space Mono 10px/700, `letter-spacing: 0.1em`. A 7px `#3B1830` dot,
  then `LISTENING · SPIN W/ JORDAN` (the detected event title, uppercased). Shown only while
  a session is running; the manual-start case reads `LISTENING · MANUAL SESSION`.
- **Nav pills** — row, `gap: 8px`. Active: chartreuse fill, `--on-accent` text. Inactive:
  `--card` fill, `--text-muted` text. All `padding: 7px 14px`, radius 99px, Manrope 12px/700.
  Labels `Home` / `History` / `Settings` (sentence case, unlike everything else).
- **Column header** — `NO.  TRACK` left, `TIME` right. Space Mono 10px, chartreuse,
  `letter-spacing: 0.1em`, `justify-content: space-between`. Two spaces after `NO.` are intentional.
- **Track rows** — `--card` fill, radius 14px, `padding: 14px`, `gap: 12px`, `align-items:
  flex-start`. Zero-padded number in Space Mono 11px chartreuse, fixed `width: 18px`. Then a column
  (`gap: 3px`): title Manrope 15px/700, artist Manrope 12px `--text-muted`, and — when AudD returned
  links — a chip row (`gap: 6px`, `margin-top: 6px`). Timestamp right-aligned, Space Mono 11px
  `--text-muted`. Rows are stacked newest-first, `gap: 8px`.
- **Service chips** — `SPOTIFY`: chartreuse fill, `--on-accent` text, radius 99px, `padding:
  3px 8px`, Space Mono 9px/700. `APPLE`: transparent, `1px solid --outline`, `--text` text. Only
  render a chip when the corresponding URL exists. (In the mock the chips sit on track 01 only,
  because AudD often returns neither.)
- **Actions** — row, `gap: 8px`. `Copy list` fills (`flex: 1`), chartreuse, `--on-accent`,
  radius 99px, `padding: 14px`, Manrope 13px/700; hover `#BAE770`. `Stop` is transparent with
  `1px solid --outline` and `--text` label, `padding: 14px 20px`; hover border and label go
  pink `#E97BB2`. Copy-list swaps its label to `Copied!` for 1.5s, as today.

### 2. Home — idle
**Purpose:** what you see most of the time — auto-listen armed, no class running.

Same header, no live pill. Then:
- **Empty block** — `padding: 24px 0`, hairline rule top and bottom. Heading `NOTHING YET` in
  Archivo 22px/800 uppercase periwinkle; below it, Manrope 13px `--text-muted`: "Auto-listen is on.
  It'll start on its own when a class begins."
- **Next up** — column, `gap: 4px`. Label `NEXT UP · GOOGLE` (source uppercased) in Space Mono 10px
  periwinkle, `letter-spacing: 0.1em`; value Manrope 14px/700, e.g. "Pilates · tomorrow, 7:00am".
  Hidden when no upcoming match exists — replace with "No upcoming class detected."
- **`Start manually`** — full-width outline button, `1px solid --outline`, radius 99px,
  `padding: 14px`; hover border and label chartreuse.

### 3. History
**Purpose:** past sessions, expandable to their tracklists.

Header: title `HISTORY`, nav pills with History active.
- **Session card** — `--card`, radius 14px, `padding: 16px`, `gap: 12px`. Top row: event title
  Manrope 15px/700 left, `14 TRACKS` Space Mono 10px chartreuse right, `align-items: baseline`.
  Below: `TUE SEP 9 · 6:15AM` in Space Mono 10px `--text-muted`, `letter-spacing: 0.06em`.
- **Expanded tracklist** — hairline rule above, `padding-top: 4px`. Each row `padding: 9px 0`,
  `gap: 12px`: number (Space Mono 11px chartreuse, `width: 18px`), then `Title` 13px/700 followed
  inline by the artist at weight 400 `--text-muted`. Keeps the existing click-to-expand behavior.
- **Collapsed cards** — same shell, two-line left column (title + `SUN SEP 7 · 9:00AM`), track
  count right. A zero-track session shows `0 TRACKS` in `--text-faint`, not chartreuse — the color
  is reserved for sessions that actually caught something.

### 4. Upcoming events
**Purpose:** hand-pick events to treat as classes when keywords don't catch them.

Header: title `UPCOMING`, then body copy 13px `--text-muted`: "Check an event to treat it as a
class, even if the title doesn't match a keyword."
- **Event row** — `--card`, radius 14px, `padding: 14px`, `gap: 12px`, `align-items: flex-start`.
- **Checkbox** — 18px square, radius 5px. Checked: chartreuse fill with a `#1F2B06` ✓ (11px/700,
  centered). Unchecked: transparent with `1px solid --outline`. Keyword-matched events are checked
  and disabled, as today — mark them with an `AUTO` chip (Space Mono 9px, chartreuse,
  `letter-spacing: 0.08em`) at the row's right edge.
- **Text column** — title Manrope 14px/700; meta `TUE SEP 16, 6:15–7:00AM · GOOGLE` in Space Mono
  10px `--text-muted`. Rows `gap: 8px`.
- Non-class events (the "Dentist" row in the mock) look identical but unchecked — no filtering.

### 5. Settings
**Purpose:** connect calendars, edit keywords, grant mic access.

Header: title `SETTINGS`, nav pills with Settings active. Three sections, `gap: 22px`, each
introduced by a periwinkle Space Mono 10px label.

- **`CALENDARS`** — one `--card` row per provider, radius 14px, `padding: 14px 16px`, name
  Manrope 14px/700 left. Connected shows a `CONNECTED` chip (chartreuse fill, `--on-accent`, radius
  99px, `padding: 4px 10px`, Space Mono 9px/700); disconnected shows a `Connect` button
  (transparent, `1px solid --outline`, radius 99px, `padding: 6px 14px`, Manrope 12px/700; hover
  border and label chartreuse). Disconnect uses the same button with `--danger` border and label —
  the one place red belongs. The iCloud form (Apple ID + app-specific password) expands below its
  row: inputs get `--card` fill, `1px solid --outline`, radius 14px, `padding: 10px 12px`, Manrope
  13px, `--text` color, placeholder `--text-faint`; focus border chartreuse. Keep the
  appleid.apple.com note in 12px `--text-muted`.
- **`CLASS KEYWORDS`** — keywords as chips: `rgba(239,237,250,0.1)` fill, radius 99px, `padding:
  6px 12px`, Manrope 12px/700, wrapping with `gap: 6px`. A `+ add` chip in chartreuse text with a
  `1px dashed #ABDF53` border opens text entry. This replaces the current comma-separated text
  input — if that's more work than you want, keep the input and style it like the iCloud fields.
  Helper line below: "An event title matching any of these counts as a class."
- **`MICROPHONE`** — a `--card` block, radius 14px, `padding: 16px`, `gap: 10px`: body copy
  "Auto-listen needs mic access granted once. The tab has to stay open and awake for the length of
  class." then a full-width chartreuse `Enable auto-listen` button (radius 99px, `padding: 12px`,
  Manrope 13px/700). Once granted, the button reads `Auto-listen enabled` and goes to the disabled
  treatment: `--card` fill, `--text-faint` label, no pointer.

## Interactions & Behavior
All existing behavior is unchanged — this direction only specifies appearance and the states above.

- Nav pills switch panels client-side (existing tab code); active pill is chartreuse.
- Status text: today's `.status` box is replaced by the live pill (running) and the empty block +
  next-up line (idle). Text content maps 1:1 to the existing status strings.
- Recording: rows are prepended as AudD matches arrive; duplicate consecutive matches are skipped,
  as today. New rows should fade/rise in (~180ms, `ease-out`, opacity + 4px translate) — the only
  motion in the design.
- Hovers: chartreuse buttons lighten to `#BAE770`; outline buttons take a chartreuse border and
  label, except `Stop`, which takes pink. Transition `120ms ease`.
- Disabled buttons: `--card` fill, `--text-faint` label, `cursor: default` — do not use opacity
  fades on the dark field, they turn muddy.
- Errors (mic denied, iCloud connect failed) use `--danger` `#FF2130` for the message text and any
  border, at 13px. Keep them short and inline where the action was.
- Responsive: single column throughout, `max-width: 480px`, centered. Nav pills wrap if the
  viewport is very narrow. Nothing is fixed-height.

## State Management
Unchanged from the current app — no new state is required by this restyle. For reference, what the
screens read: `running` / `autoStarted` (live pill vs. idle block), `micEnabled` (mic button state),
`tracks[]` (track rows), `currentSessionId`, calendar connection status per provider, `keywords[]`,
the 7-day event list with `keywordMatch` / `selected` flags, and the session list from
`/api/sessions`. Data comes from the existing endpoints: `/api/class-status` (30s poll),
`/api/recognize`, `/api/sessions`, `/api/calendars/*`.

## Assets
None. No images, no icons, no SVG — the only graphic elements are the CSS dot in the live pill and
the ✓ glyph in checkboxes. Fonts load from Google Fonts.

## Files
In this bundle:

- `After Hours - Chartreuse.dc.html` — **the direction to build.** Five screens: Home listening,
  History, Upcoming events, Settings, Home idle, plus the palette swatches.
- `Color + Type Directions.dc.html` — the exploration it came from. Turn 1 holds three directions
  (`1a` Studio Poster, `1b` Setlist Receipt, `1c` After Hours — the ancestor of this design, using
  matcha `#9FD4A4` and a red live tag); turn 2 holds three olive/paper iterations of `1a`. Context
  only; not for implementation.
- `Studio Poster - Olive Cap.dc.html` — a parked light-mode alternative (olive header, paper body,
  Instrument Serif + Public Sans + IBM Plex Mono). Not for implementation unless asked.
- `support.js` — runtime needed to open the `.dc.html` files in a browser.

In the repo, the design lives entirely in `public/index.html` (`:root` custom properties, the font
`<link>`, and element CSS). `server.js`, `src/routes/*`, `src/providers/*`, and `src/store.js` need
no changes.

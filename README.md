# Earshot

Listens for a few seconds at a time during an event you care about and builds
a list of what played — checking your connected calendars and starting
itself when it sees you're inside one of them, instead of you tapping
"Start."

## The one thing this can't get around

A browser tab can't listen for mic input while your screen is locked or
you've switched apps — that's a platform restriction, not something fixable
in code. Auto-start removes the need to tap a button, it doesn't remove the
need to keep the tab open and your phone awake for the length of the event.

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Copy `.env.example` to `.env`.**

3. **AudD** (song recognition) — token from https://dashboard.audd.io. The
   app also asks AudD for Spotify/Apple Music metadata on every match, which
   is where song artwork and streaming links come from — not every match
   includes it, and it may depend on your AudD plan.

4. **Google Calendar** (optional) — in https://console.cloud.google.com,
   create an OAuth client (type: Web application), add
   `http://localhost:3000/auth/google/callback` as an authorized redirect
   URI, and put the client ID/secret in `.env`. While your app is unverified
   (the default), add your own Google account under **Audience → Test
   users** on the OAuth consent screen, or you'll get an access-blocked
   error when connecting. Earshot reads events from every calendar in your
   Google account you own or can edit — not just the primary one — and
   skips events you've declined.

5. **Outlook Calendar** — scaffolded in the code but disabled in the UI
   ("Coming soon"); not currently connectable.

6. **iCloud Calendar** (optional) — nothing to configure in `.env`. You
   connect it from the app itself with your Apple ID email and an
   app-specific password generated at https://appleid.apple.com (your normal
   Apple ID password won't work for this). Reads every calendar in the
   account, not just one.

7. **Spotify** (optional, for turning a session's tracklist into a real
   playlist) — create an app at https://developer.spotify.com/dashboard,
   check **Web API** under "Which APIs/SDKs are you planning to use," and
   add a Redirect URI. Spotify requires HTTPS for redirect URIs except for
   the literal loopback address `127.0.0.1` — so use
   `http://127.0.0.1:3000/auth/spotify/callback`, not `localhost`. Put the
   client ID/secret in `.env`.

   You only need to set up the providers you actually use — leave the others'
   env vars blank and just don't connect them in the app.

8. **Run it**
   ```
   npm start
   ```
   Then open `http://localhost:3000` (or your phone, over the same wifi
   network, using your computer's local IP — see the note on HTTPS below).

9. In the app: connect whichever calendar(s) and Spotify if you want, adjust
   the event keywords if you want (defaults: yoga, hiit, spin, pilates,
   cycling, barre, boxing, zumba, crossfit, bootcamp, workout, class), then
   tap **Enable auto-listen** once to grant microphone access. After that,
   leave the tab open — it checks your calendars every 30 seconds and starts
   listening on its own when a tracked event is currently happening.

## How detection works

- A tracked event is one that either matches a keyword (checked against the
  title, location, *and* description), looks like it's at a gym or studio
  (based on location), or was manually checked in the **Events** tab.
- If two tracked events happen to overlap, Home shows a picker asking which
  one this session is for instead of guessing.
- Every 30 seconds the page asks the server whether a tracked event is
  happening right now. If yes, and it's not already listening, it starts —
  using the mic permission you granted with "Enable auto-listen," so nothing
  interrupts you. The first recognition attempt fires about 5 seconds in
  (to skip past any pre-song silence), then again every 60 seconds. If the
  event ends, it stops on its own — a session you started yourself with
  **Start a session** is left alone; ending it early asks for confirmation.
- **Manual events** (added via **+ Add event** in the Events tab) exist only
  inside Earshot — they aren't written to any real calendar. Writing events
  back to a real calendar isn't built yet.

## History

Every session — auto-started or manual — is saved server-side in
`data.json`. The **History** tab lists past sessions with a source tag
(Google / iCloud / Manual), duration, and track count; tap one to see its
tracklist with artwork and Spotify/Apple Music links wherever AudD returned
them. Each session has two icon menus:
- **⋯ (event options)** — rename the session, reassign it to a different
  (or new) event, or delete it entirely (with a confirmation prompt).
- **♪ (song list options)**, shown when the session has at least one
  track — **Copy list** (copies the tracklist to your clipboard), and if
  Spotify is connected and the session has Spotify-linked tracks,
  **Create Spotify playlist** (makes a new playlist from this session) and
  **Add to Spotify playlist** (appends to one of your existing playlists).

History is stored on the server, not the browser, so it survives reloads —
the in-progress list on Home does not.

**Home** also shows **Recently heard** — your last 5 recognized songs across
all past sessions — so there's something to look at even when nothing is
currently playing.

## Liked songs

Tap the heart on any song in History or Recently Heard to like it (filled
pink = liked, outlined = not) — it's saved per-track server-side. The
**Liked** tab collects every liked song across all your sessions in one
place, with the same ♪ song list menu (Copy list / Create Spotify playlist /
Add to Spotify playlist) scoped to just your liked tracks. Session/event
names aren't shown there on purpose, since the same song could've been
caught during more than one event.

## Picking specific events by hand

Keywords won't catch everything — an event titled "Cardio Blast" won't match
"hiit" unless you add "cardio" or "blast." The **Events** tab lists
everything on your connected calendars for the next 7 days with a checkbox;
check any of them to track it regardless of title. Events already caught by
a keyword or location show as tracked with a locked, pre-checked box.
Manually created events can't be edited or deleted from the UI yet — you'd
need to wait for them to age out of the 7-day window.

## Profile & Account

**My profile** (via the profile menu, top right) holds a first/last name,
which also sets the initials shown on the profile icon. **Account** (split
out from Settings) has app version info, data export, and clear-history.

## When something's not working

Earshot tries not to fail silently:
- If song recognition keeps failing (e.g. a missing or invalid
  `AUDD_API_TOKEN`), the error shows directly in the live "Listening…" view
  instead of just quietly catching nothing.
- If a connected calendar (Google, iCloud) starts failing to fetch — an
  expired iCloud app-specific password, a revoked Google token — Settings
  shows "Connection issue: `<reason>` — try reconnecting" under that
  provider instead of its events just silently disappearing.

## Known limitations to know going in

- **No login or accounts** — Earshot is single-user by design. There's one
  `data.json` for everything; "My profile" is just a display name, not
  authentication. Fine for one person running it locally; a real blocker the
  moment more than one person needs their own data.
- **Foreground only**, as above — a platform-level limit, not this app's.
- **HTTPS required off localhost** for microphone access on a real phone —
  deploy behind HTTPS (Render, Railway, etc.) for anything beyond local
  testing on your own wifi.
- **Keyword matching is a substring check** on the title, location, and
  description — an event titled "Spin w/ Jordan" matches "spin," but
  "Cardio Blast" won't unless you add "cardio" or "blast" to your keywords.
- **iCloud app-specific passwords are stored in plain text** in `data.json`
  for simplicity. Fine for personal local use; don't deploy this as-is
  somewhere multi-user without adding real encryption.
- **The live in-progress list resets on reload** — the underlying session
  and any tracks already caught are safely saved server-side and show up in
  History, but the on-screen live view itself starts over.
- **AudD needs a clear signal** — loud rooms or short intros can cause a
  silent miss; it tries again at the next 60-second check.
- **Song artwork depends on AudD** returning Spotify/Apple Music metadata for
  that specific track — not every match has it, and it may depend on your
  AudD plan.

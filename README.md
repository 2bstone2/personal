# Class Tracklist — with calendar auto-start

Same idea as before — listens for a few seconds every 2 minutes during class
and builds a list of what played — but now it checks Google, Outlook, and
iCloud calendars and starts itself when it sees you're in a class, instead of
you tapping "Start."

## The one thing this can't get around

A browser tab can't listen for mic input while your screen is locked or
you've switched apps — that's a platform restriction, not something fixable
in code. Auto-start removes the need to tap "Start," it doesn't remove the
need to keep the tab open and phone awake for the length of class.

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Copy `.env.example` to `.env`.**

3. **AudD** (song recognition) — token from https://dashboard.audd.io.

4. **Google Calendar** (optional) — in https://console.cloud.google.com,
   create an OAuth client (type: Web application), add
   `http://localhost:3000/auth/google/callback` as an authorized redirect
   URI, and put the client ID/secret in `.env`.

5. **Outlook Calendar** (optional) — in https://portal.azure.com, register
   an app, add `http://localhost:3000/auth/microsoft/callback` as a redirect
   URI, enable the `Calendars.Read` and `offline_access` permissions, and put
   the client ID/secret in `.env`.

6. **iCloud Calendar** (optional) — nothing to configure in `.env`. You
   connect it from the app itself with your Apple ID email and an
   app-specific password generated at https://appleid.apple.com (your normal
   Apple ID password won't work for this).

   You only need to set up the providers you actually use — leave the others'
   env vars blank and just don't connect them in the app.

7. **Run it**
   ```
   npm start
   ```
   Then open `http://localhost:3000` (or your phone, over the same wifi
   network, using your computer's local IP — see the note on HTTPS below).

8. In the app: connect whichever calendar(s) you use, adjust the class
   keywords if you want (defaults: yoga, hiit, spin, pilates, cycling, barre,
   boxing, zumba, crossfit, bootcamp, workout, class), then tap **Enable
   auto-listen** once to grant microphone access. After that, leave the tab
   open — it'll check your calendars every 30 seconds and start listening on
   its own when an event title matches one of your keywords and you're
   currently inside its time window.

## History and music links

Every session — auto-started or manual — is saved server-side in
`data.json`, tied to the calendar event it was detected against (or "Manual
session" if you tapped Start yourself). The **History** section lists past
sessions; tap one to see its tracklist, with a Spotify and/or Apple Music
link under each song wherever AudD returned one — not every match includes
both, some include neither, depending on what's in AudD's catalog for that
track. History is stored on the server, not in the browser, so it survives
page reloads (unlike the live in-progress list above it, which still resets
if you reload mid-class).

## Picking specific events by hand

Keywords won't catch everything — a class titled "Cardio Blast" won't match
"hiit" unless you add "cardio" or "blast." The **Upcoming events** section
lists every event on your connected calendars for the next 7 days with a
checkbox; check any of them to have it treated as a class regardless of its
title, even if no keyword matches. Events already caught by a keyword show
as "auto-detected" with a locked, pre-checked box — nothing to do there.

## How the auto-start actually works

- Every 30 seconds the page asks the server whether any connected calendar
  has a matching event happening right now.
- If yes, and it's not already listening, it starts — using the mic
  permission you granted with "Enable auto-listen" earlier, so no extra tap
  or prompt interrupts you mid-class.
- If the event ends, it stops on its own. (A session you started manually
  with "Start manually" is left alone — only auto-started sessions auto-stop.)

## Known limitations to know going in

- **Foreground only**, as above — the platform-level limit, not this app's.
- **HTTPS required off localhost** for microphone access on a real phone —
  deploy behind HTTPS (Render, Railway, etc.) for anything beyond local
  testing on your own wifi.
- **Keyword matching is just a substring check** on the event title — a
  class titled "Spin w/ Jordan" matches "spin," but "Cardio Blast" won't
  unless you add "cardio" or "blast" to your keywords.
- **iCloud app-specific passwords are stored in plain text** in `data.json`
  for simplicity. Fine for personal local use; don't deploy this as-is
  somewhere multi-user without adding real encryption.
- **List still doesn't persist** across a page reload — copy it before you
  leave if you want to keep it.
- **AudD needs a clear signal** — loud rooms or short intros can cause a
  silent miss; it just tries again at the next 2-minute check.

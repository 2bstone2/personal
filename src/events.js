const store = require("./store");
const google = require("./providers/google");
const microsoft = require("./providers/microsoft");
const apple = require("./providers/apple");

async function getAllEvents(startIso, endIso) {
  const results = await Promise.allSettled([
    (async () => {
      const conn = store.getProvider("google");
      if (!conn) return [];
      return google.listEvents(conn.refreshToken, startIso, endIso);
    })(),
    (async () => {
      const conn = store.getProvider("microsoft");
      if (!conn) return [];
      return microsoft.listEvents(conn.refreshToken, startIso, endIso);
    })(),
    (async () => {
      const conn = store.getProvider("apple");
      if (!conn) return [];
      return apple.listEvents(conn.username, conn.appPassword, startIso, endIso);
    })(),
  ]);

  const events = [];
  for (const r of results) {
    if (r.status === "fulfilled") events.push(...r.value);
    else console.error("[events] provider fetch failed:", r.reason?.message || r.reason);
  }
  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

function matchesKeyword(title, keywords) {
  const lower = (title || "").toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function eventKey(event) {
  return `${event.source}:${event.id}`;
}

// Looks 2 hours back and 12 hours ahead — enough to catch a class in progress
// or find the next one coming up today. An event counts if it matches a
// keyword OR was manually picked, regardless of its title.
async function getClassStatus() {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const keywords = store.getKeywords();
  const selected = new Set(store.getSelectedEvents());

  const events = (await getAllEvents(start, end)).filter(
    (e) => matchesKeyword(e.title, keywords) || selected.has(eventKey(e))
  );

  const current = events.find((e) => new Date(e.start) <= now && now <= new Date(e.end));
  if (current) return { inClass: true, event: current };

  const upcoming = events.find((e) => new Date(e.start) > now);
  return { inClass: false, event: upcoming || null };
}

// Raw upcoming events (not filtered to matches) for the manual picker, each
// flagged with whether it's already auto-detected or hand-picked.
async function getUpcomingEvents(days = 7) {
  const now = new Date();
  const start = now.toISOString();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const keywords = store.getKeywords();
  const selected = new Set(store.getSelectedEvents());

  const events = await getAllEvents(start, end);
  return events.map((e) => ({
    ...e,
    keywordMatch: matchesKeyword(e.title, keywords),
    selected: selected.has(eventKey(e)),
  }));
}

module.exports = { getAllEvents, getClassStatus, getUpcomingEvents, eventKey };

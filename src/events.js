const store = require("./store");
const google = require("./providers/google");
const microsoft = require("./providers/microsoft");
const apple = require("./providers/apple");

function getManualEventsInRange(startIso, endIso) {
  const start = new Date(startIso), end = new Date(endIso);
  return store.getManualEvents()
    .filter((e) => new Date(e.end) >= start && new Date(e.start) <= end)
    .map((e) => ({ id: e.id, title: e.title, location: null, start: e.start, end: e.end, source: "manual" }));
}

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
  events.push(...getManualEventsInRange(startIso, endIso));
  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

// Checks title, location, and description — a class keyword can show up in
// any of them (e.g. "yoga" mentioned only in an event's description).
function matchesKeyword(event, keywords) {
  const haystack = [event.title, event.location, event.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

// Fixed heuristic, not user-configurable: catches events booked at a gym or
// studio even when nothing else about the event mentions a class keyword.
const FITNESS_LOCATION_TERMS = ["studio", "gym", "fitness"];

function matchesFitnessLocation(location) {
  const lower = (location || "").toLowerCase();
  return FITNESS_LOCATION_TERMS.some((t) => lower.includes(t));
}

function isAutoMatch(event, keywords) {
  return matchesKeyword(event, keywords) || matchesFitnessLocation(event.location);
}

function eventKey(event) {
  return `${event.source}:${event.id}`;
}

// Looks 2 hours back and 12 hours ahead — enough to catch a class in progress
// or find the next one coming up today. An event counts if it matches a
// keyword, its location looks like a gym/studio, or it was manually picked,
// regardless of its title.
async function getClassStatus() {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const keywords = store.getKeywords();
  const selected = new Set(store.getSelectedEvents());

  const events = (await getAllEvents(start, end)).filter(
    (e) => isAutoMatch(e, keywords) || selected.has(eventKey(e))
  );

  const current = events.filter((e) => new Date(e.start) <= now && now <= new Date(e.end));
  if (current.length > 1) return { inClass: true, event: null, candidates: current };
  if (current.length === 1) return { inClass: true, event: current[0] };

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
    autoMatch: isAutoMatch(e, keywords),
    selected: selected.has(eventKey(e)),
  }));
}

module.exports = { getAllEvents, getClassStatus, getUpcomingEvents, eventKey };

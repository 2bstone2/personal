const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data.json");

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      google: null,
      microsoft: null,
      apple: null,
      keywords: null,
      selectedEvents: [],
      sessions: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getProfile() {
  return load().profile || { firstName: "", lastName: "" };
}

function setProfile({ firstName, lastName }) {
  const db = load();
  db.profile = { firstName: (firstName || "").trim(), lastName: (lastName || "").trim() };
  save(db);
  return db.profile;
}

function getProvider(name) {
  return load()[name] || null;
}

function setProvider(name, value) {
  const db = load();
  db[name] = value;
  save(db);
}

function clearProvider(name) {
  setProvider(name, null);
}

function getKeywords() {
  const db = load();
  if (db.keywords && db.keywords.length) return db.keywords;
  return (process.env.CLASS_KEYWORDS || "class,workout")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

function setKeywords(keywords) {
  const db = load();
  db.keywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  save(db);
  return db.keywords;
}

function getSelectedEvents() {
  const db = load();
  return db.selectedEvents || [];
}

function setSelectedEvents(list) {
  const db = load();
  db.selectedEvents = Array.isArray(list) ? list : [];
  save(db);
  return db.selectedEvents;
}

// ---- manual events ----

function getManualEvents() {
  const db = load();
  return db.manualEvents || [];
}

function addManualEvent({ title, start, end }) {
  const db = load();
  if (!db.manualEvents) db.manualEvents = [];
  if (!db.selectedEvents) db.selectedEvents = [];
  const event = {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "Untitled event",
    start,
    end,
  };
  db.manualEvents.push(event);
  db.selectedEvents.push(`manual:${event.id}`);
  save(db);
  return event;
}

function removeManualEvent(id) {
  const db = load();
  db.manualEvents = (db.manualEvents || []).filter((e) => e.id !== id);
  db.selectedEvents = (db.selectedEvents || []).filter((key) => key !== `manual:${id}`);
  save(db);
}

// ---- session history ----

function createSession({ eventTitle, eventSource, eventId }) {
  const db = load();
  if (!db.sessions) db.sessions = [];
  const title = eventTitle || "Manual session";
  const session = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventTitle: title,
    originalTitle: title,
    eventSource: eventSource || null,
    eventId: eventId || null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    tracks: [],
  };
  db.sessions.unshift(session);
  save(db);
  return session;
}

function endSession(id) {
  const db = load();
  const session = (db.sessions || []).find((s) => s.id === id);
  if (!session) return null;
  session.endedAt = new Date().toISOString();
  save(db);
  return session;
}

// Blank eventTitle resets to the session's original calendar title.
function renameSession(id, eventTitle) {
  const db = load();
  const session = (db.sessions || []).find((s) => s.id === id);
  if (!session) return null;
  const trimmed = (eventTitle || "").trim();
  session.eventTitle = trimmed || session.originalTitle || session.eventTitle;
  save(db);
  return session;
}

// Links (or, with no eventId, unlinks back to "unassigned") a session to an
// event after the fact. Works on any session, not just ones started manually.
function linkSessionToEvent(id, { eventTitle, eventSource, eventId }) {
  const db = load();
  const session = (db.sessions || []).find((s) => s.id === id);
  if (!session) return null;
  session.eventSource = eventSource || null;
  session.eventId = eventId || null;
  if (eventTitle) {
    session.eventTitle = eventTitle;
    session.originalTitle = eventTitle;
  }
  save(db);
  return session;
}

function addTrackToSession(id, track) {
  const db = load();
  const session = (db.sessions || []).find((s) => s.id === id);
  if (!session) return null;
  session.tracks.push(track);
  save(db);
  return session;
}

function listSessions(limit = 50) {
  const db = load();
  return (db.sessions || []).slice(0, limit);
}

function clearSessions() {
  const db = load();
  db.sessions = [];
  save(db);
}

function removeSession(id) {
  const db = load();
  db.sessions = (db.sessions || []).filter((s) => s.id !== id);
  save(db);
}

module.exports = {
  getProfile,
  setProfile,
  getProvider,
  setProvider,
  clearProvider,
  getKeywords,
  setKeywords,
  getSelectedEvents,
  setSelectedEvents,
  getManualEvents,
  addManualEvent,
  removeManualEvent,
  createSession,
  endSession,
  renameSession,
  linkSessionToEvent,
  addTrackToSession,
  listSessions,
  clearSessions,
  removeSession,
};

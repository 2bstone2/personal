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

// ---- session history ----

function createSession({ eventTitle, eventSource, eventId }) {
  const db = load();
  if (!db.sessions) db.sessions = [];
  const title = eventTitle || "Manual session";
  const session = {
    id: `session-${Date.now()}`,
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

module.exports = {
  getProvider,
  setProvider,
  clearProvider,
  getKeywords,
  setKeywords,
  getSelectedEvents,
  setSelectedEvents,
  createSession,
  endSession,
  renameSession,
  addTrackToSession,
  listSessions,
};

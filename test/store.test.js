const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Point store.js at a throwaway file for this test process only — never the
// real data.json. Must be set before store.js is first required.
const TEST_DB = path.join(os.tmpdir(), `earshot-test-${process.pid}-store.json`);
process.env.EARSHOT_DB_PATH = TEST_DB;

const store = require("../src/store");

function resetDb() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
}

test.beforeEach(resetDb);
test.after(resetDb);

test("createSession sets originalTitle to match eventTitle", () => {
  const session = store.createSession({ eventTitle: "Yoga Flow" });
  assert.equal(session.eventTitle, "Yoga Flow");
  assert.equal(session.originalTitle, "Yoga Flow");
  assert.equal(session.endedAt, null);
  assert.deepEqual(session.tracks, []);
});

test("createSession defaults to 'Manual session' when no title given", () => {
  const session = store.createSession({});
  assert.equal(session.eventTitle, "Manual session");
});

test("sessions created back-to-back get unique ids", () => {
  const a = store.createSession({ eventTitle: "A" });
  const b = store.createSession({ eventTitle: "B" });
  assert.notEqual(a.id, b.id);
});

test("endSession sets endedAt and returns null for an unknown id", () => {
  const session = store.createSession({});
  assert.equal(session.endedAt, null);
  const ended = store.endSession(session.id);
  assert.ok(ended.endedAt);
  assert.equal(store.endSession("nonexistent"), null);
});

test("renameSession updates the title", () => {
  const session = store.createSession({ eventTitle: "Original" });
  const renamed = store.renameSession(session.id, "Custom Name");
  assert.equal(renamed.eventTitle, "Custom Name");
});

test("renameSession with a blank title reverts to originalTitle", () => {
  const session = store.createSession({ eventTitle: "Original" });
  store.renameSession(session.id, "Custom Name");
  const reverted = store.renameSession(session.id, "");
  assert.equal(reverted.eventTitle, "Original");
});

test("renameSession returns null for a nonexistent session", () => {
  assert.equal(store.renameSession("nonexistent-id", "X"), null);
});

test("linkSessionToEvent sets eventSource/eventId/title", () => {
  const session = store.createSession({});
  const linked = store.linkSessionToEvent(session.id, {
    eventTitle: "Spin Class",
    eventSource: "google",
    eventId: "abc123",
  });
  assert.equal(linked.eventSource, "google");
  assert.equal(linked.eventId, "abc123");
  assert.equal(linked.eventTitle, "Spin Class");
});

test("linkSessionToEvent with no eventId unlinks the session", () => {
  const session = store.createSession({});
  store.linkSessionToEvent(session.id, { eventSource: "google", eventId: "abc123" });
  const unlinked = store.linkSessionToEvent(session.id, {});
  assert.equal(unlinked.eventSource, null);
  assert.equal(unlinked.eventId, null);
});

test("addTrackToSession appends a track", () => {
  const session = store.createSession({});
  store.addTrackToSession(session.id, { title: "Song A", artist: "Artist A" });
  const [saved] = store.listSessions();
  assert.equal(saved.tracks.length, 1);
  assert.equal(saved.tracks[0].title, "Song A");
});

test("toggleTrackLiked flips liked state and getLikedTracks reflects it", () => {
  const session = store.createSession({ eventTitle: "Spin" });
  store.addTrackToSession(session.id, { title: "Song A", artist: "Artist A" });

  const liked = store.toggleTrackLiked(session.id, 0);
  assert.equal(liked.liked, true);
  let likedTracks = store.getLikedTracks();
  assert.equal(likedTracks.length, 1);
  assert.equal(likedTracks[0].title, "Song A");
  assert.equal(likedTracks[0].sessionId, session.id);

  const unliked = store.toggleTrackLiked(session.id, 0);
  assert.equal(unliked.liked, false);
  likedTracks = store.getLikedTracks();
  assert.equal(likedTracks.length, 0);
});

test("toggleTrackLiked returns null for an out-of-range index or unknown session", () => {
  const session = store.createSession({});
  assert.equal(store.toggleTrackLiked(session.id, 5), null);
  assert.equal(store.toggleTrackLiked("nonexistent", 0), null);
});

test("removeSession removes only the targeted session", () => {
  const a = store.createSession({ eventTitle: "A" });
  const b = store.createSession({ eventTitle: "B" });
  store.removeSession(a.id);
  const remaining = store.listSessions();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, b.id);
});

test("clearSessions empties all sessions", () => {
  store.createSession({ eventTitle: "A" });
  store.createSession({ eventTitle: "B" });
  store.clearSessions();
  assert.equal(store.listSessions().length, 0);
});

test("addManualEvent auto-selects the new event", () => {
  const event = store.addManualEvent({
    title: "Pilates",
    start: "2026-01-01T10:00:00Z",
    end: "2026-01-01T11:00:00Z",
  });
  assert.ok(store.getSelectedEvents().includes(`manual:${event.id}`));
});

test("removeManualEvent removes the event and its selection", () => {
  const event = store.addManualEvent({
    title: "Pilates",
    start: "2026-01-01T10:00:00Z",
    end: "2026-01-01T11:00:00Z",
  });
  store.removeManualEvent(event.id);
  assert.equal(store.getManualEvents().length, 0);
  assert.ok(!store.getSelectedEvents().includes(`manual:${event.id}`));
});

test("setKeywords lowercases, trims, and drops empty entries", () => {
  const saved = store.setKeywords([" Yoga ", "HIIT", ""]);
  assert.deepEqual(saved, ["yoga", "hiit"]);
  assert.deepEqual(store.getKeywords(), ["yoga", "hiit"]);
});

test("getKeywords falls back to CLASS_KEYWORDS env var when none stored", () => {
  const original = process.env.CLASS_KEYWORDS;
  process.env.CLASS_KEYWORDS = "spin,pilates";
  assert.deepEqual(store.getKeywords(), ["spin", "pilates"]);
  process.env.CLASS_KEYWORDS = original;
});

test("setProvider/getProvider/clearProvider round-trip", () => {
  store.setProvider("spotify", { refreshToken: "abc" });
  assert.deepEqual(store.getProvider("spotify"), { refreshToken: "abc" });
  store.clearProvider("spotify");
  assert.equal(store.getProvider("spotify"), null);
});

test("setProfile trims names, getProfile returns them", () => {
  const profile = store.setProfile({ firstName: "  Bailey ", lastName: " Stone " });
  assert.equal(profile.firstName, "Bailey");
  assert.equal(profile.lastName, "Stone");
  assert.deepEqual(store.getProfile(), { firstName: "Bailey", lastName: "Stone" });
});

test("getProfile defaults to empty names when nothing saved", () => {
  assert.deepEqual(store.getProfile(), { firstName: "", lastName: "" });
});

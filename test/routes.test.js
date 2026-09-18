const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const TEST_DB = path.join(os.tmpdir(), `earshot-test-${process.pid}-routes.json`);
process.env.EARSHOT_DB_PATH = TEST_DB;

const request = require("supertest");
const app = require("../src/app");
const store = require("../src/store");

function resetDb() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
}

test.beforeEach(resetDb);
test.after(resetDb);

test("GET /api/calendars/status returns everything disconnected by default", async () => {
  const res = await request(app).get("/api/calendars/status");
  assert.equal(res.status, 200);
  assert.equal(res.body.google, false);
  assert.equal(res.body.apple, false);
  assert.equal(res.body.microsoft, false);
});

test("POST /api/calendars/manual-events requires start and end", async () => {
  const res = await request(app).post("/api/calendars/manual-events").send({ title: "No dates" });
  assert.equal(res.status, 400);
});

test("POST /api/calendars/manual-events creates an event", async () => {
  const res = await request(app).post("/api/calendars/manual-events").send({
    title: "Pilates",
    start: "2026-01-01T10:00:00Z",
    end: "2026-01-01T11:00:00Z",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, "Pilates");
  assert.ok(res.body.id);
});

test("DELETE /api/calendars/manual-events/:id removes the event", async () => {
  const created = await request(app).post("/api/calendars/manual-events").send({
    title: "Pilates",
    start: "2026-01-01T10:00:00Z",
    end: "2026-01-01T11:00:00Z",
  });
  const res = await request(app).delete(`/api/calendars/manual-events/${created.body.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.removed, true);
});

test("POST /api/calendars/keywords requires an array", async () => {
  const res = await request(app).post("/api/calendars/keywords").send({ keyword: "yoga" });
  assert.equal(res.status, 400);
});

test("POST /api/calendars/keywords sets and returns lowercased keywords", async () => {
  const res = await request(app).post("/api/calendars/keywords").send({ keywords: ["Yoga", "HIIT"] });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.keywords, ["yoga", "hiit"]);
});

test("POST /api/calendars/selected-events requires an array", async () => {
  const res = await request(app).post("/api/calendars/selected-events").send({ selected: "nope" });
  assert.equal(res.status, 400);
});

test("DELETE /api/calendars/:provider rejects an unknown provider name", async () => {
  const res = await request(app).delete("/api/calendars/unknownprovider");
  assert.equal(res.status, 400);
});

test("GET /api/calendars/events returns an array even with nothing connected", async () => {
  const res = await request(app).get("/api/calendars/events");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test("POST /api/sessions creates a session", async () => {
  const res = await request(app).post("/api/sessions").send({ eventTitle: "Spin Class" });
  assert.equal(res.status, 200);
  assert.equal(res.body.eventTitle, "Spin Class");
  assert.deepEqual(res.body.tracks, []);
});

test("POST /api/sessions/:id/rename with a blank title reverts to the original", async () => {
  const created = await request(app).post("/api/sessions").send({ eventTitle: "Original Title" });
  await request(app).post(`/api/sessions/${created.body.id}/rename`).send({ eventTitle: "Renamed" });
  const reverted = await request(app).post(`/api/sessions/${created.body.id}/rename`).send({ eventTitle: "" });
  assert.equal(reverted.body.eventTitle, "Original Title");
});

test("POST /api/sessions/:id/rename on a nonexistent session returns 404", async () => {
  const res = await request(app).post("/api/sessions/does-not-exist/rename").send({ eventTitle: "X" });
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:id/link-event links and then unlinks a session", async () => {
  const created = await request(app).post("/api/sessions").send({});
  const linked = await request(app)
    .post(`/api/sessions/${created.body.id}/link-event`)
    .send({ eventSource: "google", eventId: "abc", eventTitle: "Spin Class" });
  assert.equal(linked.body.eventSource, "google");
  assert.equal(linked.body.eventId, "abc");

  const unlinked = await request(app).post(`/api/sessions/${created.body.id}/link-event`).send({});
  assert.equal(unlinked.body.eventSource, null);
  assert.equal(unlinked.body.eventId, null);
});

test("DELETE /api/sessions clears all sessions", async () => {
  await request(app).post("/api/sessions").send({ eventTitle: "A" });
  await request(app).post("/api/sessions").send({ eventTitle: "B" });
  const clearRes = await request(app).delete("/api/sessions");
  assert.equal(clearRes.status, 200);
  const listRes = await request(app).get("/api/sessions");
  assert.equal(listRes.body.length, 0);
});

test("DELETE /api/sessions/:id removes only the targeted session", async () => {
  const a = await request(app).post("/api/sessions").send({ eventTitle: "A" });
  const b = await request(app).post("/api/sessions").send({ eventTitle: "B" });
  await request(app).delete(`/api/sessions/${a.body.id}`);
  const listRes = await request(app).get("/api/sessions");
  assert.equal(listRes.body.length, 1);
  assert.equal(listRes.body[0].id, b.body.id);
});

test("POST /api/sessions/:id/tracks/:index/like 404s when the track doesn't exist", async () => {
  const created = await request(app).post("/api/sessions").send({ eventTitle: "Spin" });
  const res = await request(app).post(`/api/sessions/${created.body.id}/tracks/0/like`);
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:id/tracks/:index/like toggles a real track and shows up in liked-tracks", async () => {
  const created = await request(app).post("/api/sessions").send({ eventTitle: "Spin" });
  store.addTrackToSession(created.body.id, { title: "Song A", artist: "Artist A" });

  const res = await request(app).post(`/api/sessions/${created.body.id}/tracks/0/like`);
  assert.equal(res.status, 200);
  assert.equal(res.body.liked, true);

  const likedRes = await request(app).get("/api/liked-tracks");
  assert.equal(likedRes.body.length, 1);
  assert.equal(likedRes.body[0].title, "Song A");

  const unres = await request(app).post(`/api/sessions/${created.body.id}/tracks/0/like`);
  assert.equal(unres.body.liked, false);
  const likedRes2 = await request(app).get("/api/liked-tracks");
  assert.equal(likedRes2.body.length, 0);
});

test("GET /api/liked-tracks returns an empty array with nothing liked", async () => {
  const res = await request(app).get("/api/liked-tracks");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test("GET /api/spotify/status returns disconnected by default", async () => {
  const res = await request(app).get("/api/spotify/status");
  assert.equal(res.status, 200);
  assert.equal(res.body.connected, false);
});

test("POST /api/spotify/playlist requires Spotify to be connected", async () => {
  const res = await request(app).post("/api/spotify/playlist").send({ name: "Test", trackUrls: [] });
  assert.equal(res.status, 400);
});

test("GET /api/profile returns a default empty profile", async () => {
  const res = await request(app).get("/api/profile");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { firstName: "", lastName: "" });
});

test("POST /api/profile sets and trims profile fields", async () => {
  const res = await request(app).post("/api/profile").send({ firstName: "  Bailey ", lastName: " Stone " });
  assert.equal(res.status, 200);
  assert.equal(res.body.firstName, "Bailey");
  assert.equal(res.body.lastName, "Stone");
});

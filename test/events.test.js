const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const TEST_DB = path.join(os.tmpdir(), `earshot-test-${process.pid}-events.json`);
process.env.EARSHOT_DB_PATH = TEST_DB;

const store = require("../src/store");
const events = require("../src/events");

function resetDb() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
}

test.beforeEach(resetDb);
test.after(resetDb);

test("matchesKeyword checks title, location, and description", () => {
  const keywords = ["yoga", "spin"];
  assert.equal(events.matchesKeyword({ title: "Morning Yoga" }, keywords), true);
  assert.equal(events.matchesKeyword({ title: "Team sync", location: "Spin Studio" }, keywords), true);
  assert.equal(
    events.matchesKeyword({ title: "Team sync", description: "weekly yoga check-in" }, keywords),
    true
  );
  assert.equal(events.matchesKeyword({ title: "Team sync" }, keywords), false);
});

test("matchesKeyword is case-insensitive", () => {
  assert.equal(events.matchesKeyword({ title: "YOGA FLOW" }, ["yoga"]), true);
});

test("matchesFitnessLocation matches studio/gym/fitness in the location only", () => {
  assert.equal(events.matchesFitnessLocation("Downtown Gym"), true);
  assert.equal(events.matchesFitnessLocation("Yoga Studio"), true);
  assert.equal(events.matchesFitnessLocation("Fitness Center"), true);
  assert.equal(events.matchesFitnessLocation("Conference Room B"), false);
  assert.equal(events.matchesFitnessLocation(null), false);
});

test("isAutoMatch is true for a keyword match or a fitness-sounding location", () => {
  assert.equal(events.isAutoMatch({ title: "Spin Class" }, ["spin"]), true);
  assert.equal(events.isAutoMatch({ title: "Team sync", location: "Studio A" }, ["spin"]), true);
  assert.equal(events.isAutoMatch({ title: "Team sync", location: "Room B" }, ["spin"]), false);
});

test("eventKey combines source and id", () => {
  assert.equal(events.eventKey({ source: "google", id: "abc" }), "google:abc");
});

test("getUpcomingEvents flags a manually-tracked event as autoMatch and selected", async () => {
  store.setKeywords(["yoga"]);
  const event = store.addManualEvent({
    title: "Yoga Flow",
    start: new Date(Date.now() + 3600000).toISOString(),
    end: new Date(Date.now() + 7200000).toISOString(),
  });

  const upcoming = await events.getUpcomingEvents(7);
  const found = upcoming.find((e) => e.id === event.id);
  assert.ok(found, "manual event should appear in upcoming events");
  assert.equal(found.autoMatch, true);
  assert.equal(found.selected, true);
});

test("getUpcomingEvents does not flag autoMatch for an event with no matching keyword", async () => {
  store.setKeywords(["yoga"]);
  const event = store.addManualEvent({
    title: "1:1 with Manager",
    start: new Date(Date.now() + 3600000).toISOString(),
    end: new Date(Date.now() + 7200000).toISOString(),
  });

  const upcoming = await events.getUpcomingEvents(7);
  const found = upcoming.find((e) => e.id === event.id);
  assert.equal(found.autoMatch, false);
  // still selected — manual events are auto-selected regardless of keyword match
  assert.equal(found.selected, true);
});

test("getClassStatus returns candidates when multiple tracked events overlap right now", async () => {
  store.setKeywords(["yoga", "spin"]);
  const now = new Date();
  const start = new Date(now.getTime() - 5 * 60000).toISOString();
  const end = new Date(now.getTime() + 30 * 60000).toISOString();
  store.addManualEvent({ title: "Yoga Flow", start, end });
  store.addManualEvent({ title: "Spin Class", start, end });

  const status = await events.getClassStatus();
  assert.equal(status.inClass, true);
  assert.equal(status.event, null);
  assert.equal(status.candidates.length, 2);
});

test("getClassStatus returns a single event when only one is currently happening", async () => {
  store.setKeywords(["yoga"]);
  const now = new Date();
  store.addManualEvent({
    title: "Yoga Flow",
    start: new Date(now.getTime() - 5 * 60000).toISOString(),
    end: new Date(now.getTime() + 30 * 60000).toISOString(),
  });

  const status = await events.getClassStatus();
  assert.equal(status.inClass, true);
  assert.equal(status.event.title, "Yoga Flow");
});

test("getClassStatus returns inClass:false with the next upcoming event when nothing is happening now", async () => {
  store.setKeywords(["yoga"]);
  const future = new Date(Date.now() + 3600000);
  store.addManualEvent({
    title: "Yoga Flow",
    start: future.toISOString(),
    end: new Date(future.getTime() + 3600000).toISOString(),
  });

  const status = await events.getClassStatus();
  assert.equal(status.inClass, false);
  assert.equal(status.event.title, "Yoga Flow");
});

test("getClassStatus returns inClass:false and no event when nothing is tracked", async () => {
  const status = await events.getClassStatus();
  assert.equal(status.inClass, false);
  assert.equal(status.event, null);
});

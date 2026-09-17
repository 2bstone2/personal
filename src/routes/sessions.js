const express = require("express");
const store = require("../store");

const router = express.Router();

router.post("/api/sessions", (req, res) => {
  const { eventTitle, eventSource, eventId } = req.body || {};
  res.json(store.createSession({ eventTitle, eventSource, eventId }));
});

router.post("/api/sessions/:id/end", (req, res) => {
  const session = store.endSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found." });
  res.json(session);
});

// Blank eventTitle resets to the session's original calendar title.
router.post("/api/sessions/:id/rename", (req, res) => {
  const { eventTitle } = req.body || {};
  const session = store.renameSession(req.params.id, eventTitle);
  if (!session) return res.status(404).json({ error: "Session not found." });
  res.json(session);
});

// Links (or unlinks, when eventId is omitted) a session to a calendar/manual
// event after the fact — works on any session, not just unassigned ones.
router.post("/api/sessions/:id/link-event", (req, res) => {
  const { eventTitle, eventSource, eventId } = req.body || {};
  const session = store.linkSessionToEvent(req.params.id, { eventTitle, eventSource, eventId });
  if (!session) return res.status(404).json({ error: "Session not found." });
  res.json(session);
});

router.get("/api/sessions", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json(store.listSessions(limit));
});

router.delete("/api/sessions", (req, res) => {
  store.clearSessions();
  res.json({ cleared: true });
});

router.delete("/api/sessions/:id", (req, res) => {
  store.removeSession(req.params.id);
  res.json({ removed: true });
});

router.post("/api/sessions/:id/tracks/:index/like", (req, res) => {
  const track = store.toggleTrackLiked(req.params.id, Number(req.params.index));
  if (!track) return res.status(404).json({ error: "Track not found." });
  res.json(track);
});

router.get("/api/liked-tracks", (req, res) => {
  res.json(store.getLikedTracks());
});

module.exports = router;

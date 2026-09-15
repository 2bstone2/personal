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

router.get("/api/sessions", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json(store.listSessions(limit));
});

module.exports = router;

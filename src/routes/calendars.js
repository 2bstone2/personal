const express = require("express");
const store = require("../store");
const google = require("../providers/google");
const microsoft = require("../providers/microsoft");
const apple = require("../providers/apple");
const events = require("../events");
const { oauthPage } = require("../oauthPage");

const router = express.Router();

// Upcoming events across all connected calendars, for manually picking which
// ones to listen during — regardless of whether their title matches a keyword.
router.get("/api/calendars/events", async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    res.json(await events.getUpcomingEvents(days));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Couldn't load upcoming events." });
  }
});

// Body: { selected: ["google:eventId", "apple:eventId", ...] } — replaces the
// full set of manually-picked events.
router.post("/api/calendars/selected-events", (req, res) => {
  const { selected } = req.body;
  if (!Array.isArray(selected)) return res.status(400).json({ error: "selected must be an array" });
  res.json({ selected: store.setSelectedEvents(selected) });
});

// A hand-added event with no calendar behind it — start/end are ISO strings.
// Created already selected, so it's tracked immediately.
router.post("/api/calendars/manual-events", (req, res) => {
  const { title, start, end } = req.body || {};
  if (!start || !end) return res.status(400).json({ error: "start and end are required" });
  res.json(store.addManualEvent({ title, start, end }));
});

router.delete("/api/calendars/manual-events/:id", (req, res) => {
  store.removeManualEvent(req.params.id);
  res.json({ removed: true });
});

router.get("/api/calendars/status", (req, res) => {
  res.json({
    google: !!store.getProvider("google"),
    microsoft: !!store.getProvider("microsoft"),
    apple: !!store.getProvider("apple"),
    keywords: store.getKeywords(),
  });
});

router.post("/api/calendars/keywords", (req, res) => {
  const { keywords } = req.body;
  if (!Array.isArray(keywords)) return res.status(400).json({ error: "keywords must be an array" });
  res.json({ keywords: store.setKeywords(keywords) });
});

router.delete("/api/calendars/:provider", (req, res) => {
  const { provider } = req.params;
  if (!["google", "microsoft", "apple"].includes(provider)) {
    return res.status(400).json({ error: "unknown provider" });
  }
  store.clearProvider(provider);
  res.json({ disconnected: provider });
});

// --- Google ---
router.get("/auth/google/login", (req, res) => res.redirect(google.getAuthUrl()));
router.get("/auth/google/callback", async (req, res) => {
  try {
    const tokens = await google.exchangeCodeForTokens(req.query.code);
    store.setProvider("google", { refreshToken: tokens.refresh_token });
    res.send(oauthPage({ message: "Google Calendar connected — you can close this tab." }));
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send(oauthPage({ message: "Something went wrong connecting Google Calendar.", isError: true }));
  }
});

// --- Microsoft ---
router.get("/auth/microsoft/login", (req, res) => res.redirect(microsoft.getAuthUrl()));
router.get("/auth/microsoft/callback", async (req, res) => {
  try {
    const tokens = await microsoft.exchangeCodeForTokens(req.query.code);
    store.setProvider("microsoft", { refreshToken: tokens.refresh_token });
    res.send(oauthPage({ message: "Outlook Calendar connected — you can close this tab." }));
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send(oauthPage({ message: "Something went wrong connecting Outlook Calendar.", isError: true }));
  }
});

// --- Apple / iCloud (no redirect flow — submitted directly from the page) ---
router.post("/api/calendars/apple/connect", async (req, res) => {
  const { username, appPassword } = req.body;
  if (!username || !appPassword) {
    return res.status(400).json({ error: "username and appPassword are required" });
  }
  try {
    await apple.verifyCredentials(username, appPassword);
    store.setProvider("apple", { username, appPassword });
    res.json({ connected: true });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ error: "Couldn't verify those iCloud credentials." });
  }
});

module.exports = router;

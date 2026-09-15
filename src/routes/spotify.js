const express = require("express");
const store = require("../store");
const spotify = require("../providers/spotify");

const router = express.Router();

router.get("/auth/spotify/login", (req, res) => res.redirect(spotify.getAuthUrl()));
router.get("/auth/spotify/callback", async (req, res) => {
  try {
    const tokens = await spotify.exchangeCodeForTokens(req.query.code);
    store.setProvider("spotify", { refreshToken: tokens.refresh_token });
    res.send("Spotify connected — you can close this tab.");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Something went wrong connecting Spotify.");
  }
});

router.get("/api/spotify/status", (req, res) => {
  res.json({ connected: !!store.getProvider("spotify") });
});

router.delete("/api/spotify", (req, res) => {
  store.clearProvider("spotify");
  res.json({ disconnected: true });
});

// Body: { name, trackUrls: ["https://open.spotify.com/track/...", ...] }
router.post("/api/spotify/playlist", async (req, res) => {
  const conn = store.getProvider("spotify");
  if (!conn) return res.status(400).json({ error: "Spotify isn't connected." });
  const { name, trackUrls } = req.body;
  if (!name || !Array.isArray(trackUrls)) {
    return res.status(400).json({ error: "name and trackUrls are required" });
  }
  try {
    const result = await spotify.createPlaylist(conn.refreshToken, name, trackUrls);
    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Couldn't create the Spotify playlist." });
  }
});

module.exports = router;

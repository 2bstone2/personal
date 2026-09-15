const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const store = require("../store");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/api/recognize", upload.single("clip"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No audio clip received." });
  if (!process.env.AUDD_API_TOKEN) {
    return res.status(500).json({ error: "Server is missing AUDD_API_TOKEN — add it to .env." });
  }
  try {
    const form = new FormData();
    form.append("api_token", process.env.AUDD_API_TOKEN);
    form.append("file", req.file.buffer, { filename: "clip.webm" });

    const audd = await axios.post("https://api.audd.io/", form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    const result = audd.data?.result;
    if (!result) return res.json({ matched: false });

    const track = {
      title: result.title,
      artist: result.artist,
      album: result.album,
      spotifyUrl: result.spotify?.external_urls?.spotify || null,
      appleMusicUrl: result.apple_music?.url || null,
      playedAt: new Date().toISOString(),
    };

    if (req.body.sessionId) {
      store.addTrackToSession(req.body.sessionId, track);
    }

    res.json({ matched: true, ...track });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Recognition request failed." });
  }
});

module.exports = router;

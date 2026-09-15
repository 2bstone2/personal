const express = require("express");
const events = require("../events");

const router = express.Router();

router.get("/api/class-status", async (req, res) => {
  try {
    const status = await events.getClassStatus();
    res.json(status);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Couldn't check your calendars." });
  }
});

module.exports = router;

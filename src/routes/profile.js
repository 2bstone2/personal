const express = require("express");
const store = require("../store");

const router = express.Router();

router.get("/api/profile", (req, res) => {
  res.json(store.getProfile());
});

router.post("/api/profile", (req, res) => {
  const { firstName, lastName } = req.body || {};
  res.json(store.setProfile({ firstName, lastName }));
});

module.exports = router;

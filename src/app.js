const express = require("express");
const cors = require("cors");
const path = require("path");

const recognizeRoutes = require("./routes/recognize");
const calendarRoutes = require("./routes/calendars");
const statusRoutes = require("./routes/status");
const sessionRoutes = require("./routes/sessions");
const spotifyRoutes = require("./routes/spotify");
const profileRoutes = require("./routes/profile");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(recognizeRoutes);
app.use(calendarRoutes);
app.use(statusRoutes);
app.use(sessionRoutes);
app.use(spotifyRoutes);
app.use(profileRoutes);

module.exports = app;

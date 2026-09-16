require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const recognizeRoutes = require("./src/routes/recognize");
const calendarRoutes = require("./src/routes/calendars");
const statusRoutes = require("./src/routes/status");
const sessionRoutes = require("./src/routes/sessions");
const spotifyRoutes = require("./src/routes/spotify");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(recognizeRoutes);
app.use(calendarRoutes);
app.use(statusRoutes);
app.use(sessionRoutes);
app.use(spotifyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Earshot running at http://localhost:${PORT}`));

const axios = require("axios");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"].join(" ");

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    })
  );
  return res.data; // { access_token, refresh_token, expires_in, ... }
}

async function refreshAccessToken(refreshToken) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    })
  );
  return res.data; // { access_token, expires_in, ... }
}

async function listEvents(refreshToken, startIso, endIso) {
  const { access_token } = await refreshAccessToken(refreshToken);
  const params = new URLSearchParams({
    timeMin: startIso,
    timeMax: endIso,
    singleEvents: "true",
    orderBy: "startTime",
  });
  const res = await axios.get(`${EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return (res.data.items || []).map((e) => ({
    id: e.id,
    title: e.summary || "(untitled)",
    location: e.location || null,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    source: "google",
  }));
}

module.exports = { getAuthUrl, exchangeCodeForTokens, listEvents };

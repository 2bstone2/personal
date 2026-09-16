const axios = require("axios");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const EVENTS_URL = (calendarId) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

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

// Lists every calendar in the user's "My calendars" list (not calendars
// they've merely subscribed to view), since a Google account commonly has
// more than just the primary calendar and classes can live on any of them.
async function listCalendars(accessToken) {
  const res = await axios.get(CALENDAR_LIST_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return (res.data.items || []).filter(
    (c) => c.accessRole === "owner" || c.accessRole === "writer"
  );
}

async function listEvents(refreshToken, startIso, endIso) {
  const { access_token } = await refreshAccessToken(refreshToken);
  const calendars = await listCalendars(access_token);
  const params = new URLSearchParams({
    timeMin: startIso,
    timeMax: endIso,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const perCalendar = await Promise.allSettled(
    calendars.map((cal) =>
      axios.get(`${EVENTS_URL(cal.id)}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
    )
  );

  const events = [];
  perCalendar.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const items = result.value.data.items || [];
    for (const e of items) {
      const self = (e.attendees || []).find((a) => a.self);
      if (self && self.responseStatus === "declined") continue;
      events.push({
        id: e.id,
        title: e.summary || "(untitled)",
        location: e.location || null,
        description: e.description || null,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        source: "google",
        calendarId: calendars[i].id,
        calendarName: calendars[i].summary,
      });
    }
  });
  return events;
}

module.exports = { getAuthUrl, exchangeCodeForTokens, listEvents, listCalendars };

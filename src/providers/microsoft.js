const axios = require("axios");

const AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const CALENDARVIEW_URL = "https://graph.microsoft.com/v1.0/me/calendarview";

const SCOPES = ["offline_access", "Calendars.Read"].join(" ");

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    response_type: "code",
    response_mode: "query",
    scope: SCOPES,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      grant_type: "authorization_code",
      scope: SCOPES,
    })
  );
  return res.data; // { access_token, refresh_token, expires_in, ... }
}

async function refreshAccessToken(refreshToken) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: "refresh_token",
      scope: SCOPES,
    })
  );
  return res.data; // { access_token, refresh_token, expires_in, ... }
}

async function listEvents(refreshToken, startIso, endIso) {
  const { access_token } = await refreshAccessToken(refreshToken);
  const params = new URLSearchParams({
    startDateTime: startIso,
    endDateTime: endIso,
  });
  const res = await axios.get(`${CALENDARVIEW_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  return (res.data.value || []).map((e) => ({
    id: e.id,
    title: e.subject || "(untitled)",
    location: e.location?.displayName || null,
    description: e.bodyPreview || null,
    start: e.start?.dateTime ? e.start.dateTime + "Z" : null,
    end: e.end?.dateTime ? e.end.dateTime + "Z" : null,
    source: "microsoft",
  }));
}

module.exports = { getAuthUrl, exchangeCodeForTokens, listEvents };

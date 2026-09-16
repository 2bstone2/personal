const axios = require("axios");

const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

const SCOPES = ["playlist-modify-public", "playlist-modify-private"].join(" ");

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      grant_type: "authorization_code",
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    })
  );
  return res.data; // { access_token, refresh_token, expires_in, ... }
}

async function refreshAccessToken(refreshToken) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    })
  );
  return res.data; // { access_token, expires_in, ... }
}

// Pulls the track id out of a web URL like https://open.spotify.com/track/<id>
// and turns it into the spotify:track:<id> URI the playlist API expects.
function trackUriFromUrl(spotifyUrl) {
  const match = /track\/([a-zA-Z0-9]+)/.exec(spotifyUrl || "");
  return match ? `spotify:track:${match[1]}` : null;
}

async function createPlaylist(refreshToken, name, trackUrls) {
  const { access_token } = await refreshAccessToken(refreshToken);
  const headers = { Authorization: `Bearer ${access_token}` };

  const me = await axios.get(`${API_BASE}/me`, { headers });
  const userId = me.data.id;

  const playlist = await axios.post(
    `${API_BASE}/users/${userId}/playlists`,
    { name, public: false, description: "Built by Earshot" },
    { headers }
  );

  const uris = trackUrls.map(trackUriFromUrl).filter(Boolean);
  if (uris.length) {
    await axios.post(`${API_BASE}/playlists/${playlist.data.id}/tracks`, { uris }, { headers });
  }

  return { url: playlist.data.external_urls.spotify };
}

module.exports = { getAuthUrl, exchangeCodeForTokens, createPlaylist };

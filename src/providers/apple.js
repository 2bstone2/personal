const { DAVClient } = require("tsdav");
const ical = require("node-ical");

function makeClient(username, appPassword) {
  return new DAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username, password: appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

// Throws if the credentials are bad — used to validate before saving them.
async function verifyCredentials(username, appPassword) {
  const client = makeClient(username, appPassword);
  await client.login();
  await client.fetchCalendars();
  return true;
}

async function listEvents(username, appPassword, startIso, endIso) {
  const client = makeClient(username, appPassword);
  await client.login();
  const calendars = await client.fetchCalendars();

  const events = [];
  for (const calendar of calendars) {
    let objects;
    try {
      objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: { start: startIso, end: endIso },
      });
    } catch (e) {
      continue; // some calendars (e.g. subscribed read-only ones) can reject timeRange queries
    }
    for (const obj of objects) {
      if (!obj.data) continue;
      let parsed;
      try {
        parsed = ical.parseICS(obj.data);
      } catch (e) {
        continue;
      }
      for (const key in parsed) {
        const item = parsed[key];
        if (item.type !== "VEVENT" || !item.start || !item.end) continue;
        events.push({
          id: item.uid || key,
          title: item.summary || "(untitled)",
          location: item.location || null,
          description: item.description || null,
          start: new Date(item.start).toISOString(),
          end: new Date(item.end).toISOString(),
          source: "apple",
        });
      }
    }
  }
  return events;
}

module.exports = { verifyCredentials, listEvents };

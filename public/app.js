  const CAPTURE_INTERVAL_MS = 60 * 1000;
  const FIRST_CAPTURE_DELAY_MS = 5000;
  const CLIP_LENGTH_MS = 7000;

  const STOP_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" style="margin-right:7px;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" style="margin-right:7px;"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  const PLAY_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" style="margin-right:7px;"><path d="M8 5v14l11-7z"/></svg>';
  const POLL_MS = 30 * 1000;

  const startStopBtn = document.getElementById('startStopBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const enableMicBtn = document.getElementById('enableMicBtn');
  const listEl = document.getElementById('list');
  const emptyMsg = document.getElementById('emptyMsg');
  const timerEl = document.getElementById('timer');
  const colHeader = document.getElementById('colHeader');
  const trackSortWrap = document.getElementById('trackSortWrap');
  const trackSortBtn = document.getElementById('trackSortBtn');
  const trackSortMenu = document.getElementById('trackSortMenu');
  const trackSortLabel = document.getElementById('trackSortLabel');
  let trackSortOrder = 'newest';
  const liveSessionLine = document.getElementById('liveSessionLine');
  const liveArea = document.getElementById('liveArea');
  const liveError = document.getElementById('liveError');
  const liveSessionText = document.getElementById('liveSessionText');
  const idleArea = document.getElementById('idleArea');
  const idleHeading = document.getElementById('idleHeading');
  const idleSub = document.getElementById('idleSub');
  const nextUp = document.getElementById('nextUp');
  const nextUpLabel = document.getElementById('nextUpLabel');
  const nextUpValue = document.getElementById('nextUpValue');
  const eventPicker = document.getElementById('eventPicker');
  const eventPickerList = document.getElementById('eventPickerList');
  const upcomingEventsHint = document.getElementById('upcomingEventsHint');
  let pickerCandidates = [];
  const tagList = document.getElementById('tagList');
  const tagSearchInput = document.getElementById('tagSearchInput');
  const tagSuggestions = document.getElementById('tagSuggestions');
  const SUGGESTED_KEYWORDS = ['yoga', 'hiit', 'spin', 'pilates', 'cycling', 'barre', 'boxing', 'zumba', 'crossfit', 'bootcamp', 'workout', 'class'];
  let keywordTags = [];

  let stream = null;
  let intervalId = null;
  let tracks = [];
  let running = false;
  let autoStarted = false;
  let micEnabled = false;
  let currentSessionId = null;
  let timerInterval = null;
  let sessionStartedAt = null;
  let elapsedBeforePause = 0;
  let paused = false;

  // ---- tab navigation ----

  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = {
    home: document.getElementById('tab-home'),
    events: document.getElementById('tab-events'),
    history: document.getElementById('tab-history'),
    liked: document.getElementById('tab-liked'),
    settings: document.getElementById('tab-settings'),
    profile: document.getElementById('tab-profile'),
    account: document.getElementById('tab-account'),
    help: document.getElementById('tab-help'),
  };

  function switchTab(name) {
    if (!tabPanels[name]) return;
    tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    Object.values(tabPanels).forEach((panel) => (panel.hidden = true));
    tabPanels[name].hidden = false;
    try { localStorage.setItem('earshot_active_tab', name); } catch (e) {}
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'liked') loadLikedSongs();
    });
  });

  // ---- live tag / idle block ----

  function showLive(sessionLabel) {
    liveSessionLine.hidden = false;
    liveArea.hidden = false;
    liveSessionText.textContent = sessionLabel;
    idleArea.hidden = true;
    nextUp.hidden = true;
    eventPicker.hidden = true;
    upcomingEventsHint.hidden = true;
    colHeader.hidden = false;
  }

  function showIdleMessage(text, isError) {
    liveSessionLine.hidden = true;
    liveArea.hidden = true;
    colHeader.hidden = true;
    idleArea.hidden = false;
    idleHeading.textContent = isError ? 'Action needed' : 'Waiting to listen…';
    idleSub.textContent = text;
    idleSub.classList.toggle('is-error', !!isError);
    nextUp.hidden = true;
    eventPicker.hidden = true;
    upcomingEventsHint.hidden = false;
  }

  function showIdleNext(event) {
    liveSessionLine.hidden = true;
    liveArea.hidden = true;
    colHeader.hidden = true;
    idleArea.hidden = false;
    idleHeading.textContent = 'Waiting to listen…';
    idleSub.textContent = "Listening starts automatically once a tracked event begins — or hit Start a session to begin now.";
    idleSub.classList.remove('is-error');
    nextUp.hidden = false;
    eventPicker.hidden = true;
    upcomingEventsHint.hidden = true;
    nextUpLabel.textContent = `Next up · ${event.source || ''}`;
    const when = new Date(event.start);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    let dayLabel;
    if (when.toDateString() === now.toDateString()) dayLabel = 'today';
    else if (when.toDateString() === tomorrow.toDateString()) dayLabel = 'tomorrow';
    else dayLabel = when.toLocaleDateString(undefined, { weekday: 'long' });
    const timeLabel = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    nextUpValue.textContent = `${event.title} · ${dayLabel}, ${timeLabel}`;
  }

  function showEventPicker(candidates) {
    pickerCandidates = candidates;
    liveSessionLine.hidden = true;
    liveArea.hidden = true;
    colHeader.hidden = true;
    idleArea.hidden = true;
    nextUp.hidden = true;
    upcomingEventsHint.hidden = true;
    eventPicker.hidden = false;
    eventPickerList.innerHTML = candidates.map((e, i) => `
      <button type="button" class="event-picker-option" data-idx="${i}">
        <div class="event-title">${escapeHtml(e.title)}</div>
        <div class="event-time">${fmtEventTime(e.start, e.end)} · ${e.source}${e.location ? ' · ' + escapeHtml(e.location) : ''}</div>
      </button>
    `).join('');
    eventPickerList.querySelectorAll('.event-picker-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = pickerCandidates[Number(btn.dataset.idx)];
        pickerCandidates = [];
        eventPicker.hidden = true;
        start(true, chosen);
      });
    });
  }

  function setStatus(text, mode) {
    showIdleMessage(text, mode === 'error');
  }

  // ---- mic capture loop (same mechanics as manual mode) ----

  function renderTracks() {
    if (tracks.length === 0) {
      // Only show "No songs caught yet" once a session is actually running —
      // otherwise it just repeats the idle heading above ("Nothing yet").
      emptyMsg.style.display = running ? 'block' : 'none';
      trackSortWrap.hidden = true;
      listEl.style.display = 'none';
      listEl.innerHTML = '';
      return;
    }
    emptyMsg.style.display = 'none';
    listEl.style.display = 'flex';
    trackSortWrap.hidden = tracks.length < 2;
    // tracks[] is newest-first (unshift on capture); track number must reflect
    // recognition order regardless of which end the list is displayed from.
    const ordered = trackSortOrder === 'oldest' ? tracks.slice().reverse() : tracks;
    listEl.innerHTML = ordered.map((t, i) => {
      const num = trackSortOrder === 'oldest' ? i + 1 : tracks.length - i;
      return `
      <div class="track">
        <span class="track-num">${String(num).padStart(2, '0')}</span>
        ${trackArtHTML(t, 'track-art')}
        <div class="track-info">
          <div class="title">${escapeHtml(t.title)}</div>
          <div class="artist">${escapeHtml(t.artist)}</div>
          ${trackLinksHTML(t)}
        </div>
        <div class="track-time">${t.time}</div>
      </div>
    `;
    }).join('');
  }

  function likeButtonHTML(sessionId, index, liked) {
    return `<button class="like-btn${liked ? ' liked' : ''}" type="button" data-like-session="${sessionId}" data-like-index="${index}" aria-label="${liked ? 'Unlike' : 'Like'}" title="${liked ? 'Unlike' : 'Like'}">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.5-8.28C.86 10.42 1 7.3 3.4 5.6c2.02-1.43 4.6-.98 6.1.9L12 9.2l2.5-2.7c1.5-1.88 4.08-2.33 6.1-.9 2.4 1.7 2.54 4.82.9 7.12C18.7 16.65 12 21 12 21z"/></svg>
    </button>`;
  }

  function trackArtHTML(t, sizeClass) {
    if (t.artworkUrl) return `<img class="${sizeClass}" src="${t.artworkUrl}" alt="" loading="lazy" />`;
    const fallbackClass = sizeClass === 'session-track-art' ? 'art-fallback session-art-fallback' : 'art-fallback';
    return `<div class="${fallbackClass}"><div class="art-fallback-mark"><div class="art-fallback-mark-inner"><div class="art-fallback-mark-dot"></div></div></div></div>`;
  }

  function trackLinksHTML(t) {
    const links = [];
    if (t.spotifyUrl) links.push(`<a class="track-link spotify" href="${t.spotifyUrl}" target="_blank">Spotify</a>`);
    if (t.appleMusicUrl) links.push(`<a class="track-link apple" href="${t.appleMusicUrl}" target="_blank">Apple</a>`);
    return links.length ? `<div class="track-links">${links.join('')}</div>` : '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function isDuplicate(title, artist) {
    const last = tracks[0];
    return last && last.title === title && last.artist === artist;
  }

  async function captureAndSend() {
    if (!running || !stream) return;
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.start();
    setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), CLIP_LENGTH_MS);
    await stopped;
    if (!running) return;

    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    const form = new FormData();
    form.append('clip', blob, 'clip.webm');
    if (currentSessionId) form.append('sessionId', currentSessionId);
    try {
      const res = await fetch('/api/recognize', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        console.error('Recognition failed:', data.error);
        liveError.textContent = data.error || 'Recognition failed.';
        liveError.hidden = false;
        return;
      }
      liveError.hidden = true;
      if (data.matched && !isDuplicate(data.title, data.artist)) {
        tracks.unshift({
          title: data.title,
          artist: data.artist,
          spotifyUrl: data.spotifyUrl,
          appleMusicUrl: data.appleMusicUrl,
          artworkUrl: data.artworkUrl,
          time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        });
        renderTracks();
      }
    } catch (e) {
      // network-level failure (offline, etc) — leave any existing error message as-is and retry next capture
    }
  }

  async function start(auto, event) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setStatus(auto ? 'Event detected, but mic access isn\'t enabled — tap "Enable auto-listen" in Settings.' : 'Microphone permission is needed to listen for songs.', 'error');
      return;
    }
    running = true;
    autoStarted = !!auto;
    liveError.hidden = true;
    tracks = [];
    renderTracks();
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: event?.title || null,
          eventSource: event?.source || null,
          eventId: event?.id || null,
        }),
      });
      const session = await res.json();
      currentSessionId = session.id;
    } catch (e) { currentSessionId = null; }
    startStopBtn.innerHTML = STOP_ICON + 'Stop';
    startStopBtn.classList.remove('start');
    startStopBtn.classList.add('stop');
    paused = false;
    elapsedBeforePause = 0;
    pauseBtn.hidden = false;
    pauseBtn.innerHTML = PAUSE_ICON + 'Pause';
    sessionStartedAt = Date.now();
    timerEl.hidden = false;
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
    showLive(auto ? (event?.title || 'Class') : 'Session');
    setTimeout(captureAndSend, FIRST_CAPTURE_DELAY_MS);
    intervalId = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
  }

  function updateTimer() {
    const elapsed = elapsedBeforePause + Math.floor((Date.now() - sessionStartedAt) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }

  function togglePause() {
    if (!running) return;
    if (paused) {
      paused = false;
      pauseBtn.innerHTML = PAUSE_ICON + 'Pause';
      sessionStartedAt = Date.now();
      timerInterval = setInterval(updateTimer, 1000);
      captureAndSend();
      intervalId = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
    } else {
      paused = true;
      pauseBtn.innerHTML = PLAY_ICON + 'Resume';
      elapsedBeforePause += Math.floor((Date.now() - sessionStartedAt) / 1000);
      clearInterval(timerInterval);
      clearInterval(intervalId);
    }
  }

  function stop() {
    running = false;
    autoStarted = false;
    paused = false;
    elapsedBeforePause = 0;
    clearInterval(intervalId);
    clearInterval(timerInterval);
    timerEl.hidden = true;
    timerEl.textContent = '00:00';
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    startStopBtn.textContent = 'Start a session';
    startStopBtn.classList.remove('stop');
    startStopBtn.classList.add('start');
    pauseBtn.hidden = true;
    setStatus('Stopped.', null);
    if (currentSessionId) {
      fetch(`/api/sessions/${currentSessionId}/end`, { method: 'POST' }).finally(() => {
        loadHistory();
        loadRecentlyHeard();
      });
      currentSessionId = null;
    }
  }

  function fmtHeardAt(iso) {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    let dayLabel;
    if (d.toDateString() === now.toDateString()) dayLabel = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) dayLabel = 'Yesterday';
    else dayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeLabel = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${dayLabel} · ${timeLabel}`;
  }

  async function loadRecentlyHeard() {
    const section = document.getElementById('recentlyHeardSection');
    const list = document.getElementById('recentlyHeardList');
    try {
      const res = await fetch('/api/sessions?limit=10');
      const sessions = await res.json();
      const recent = [];
      sessions.forEach((s) => s.tracks.forEach((t, idx) => recent.push({
        ...t, sessionId: s.id, trackIndex: idx, sessionTitle: s.eventTitle, playedAt: t.playedAt || s.startedAt,
      })));
      recent.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
      const top = recent.slice(0, 5);
      if (!top.length) { section.hidden = true; return; }
      section.hidden = false;
      list.innerHTML = top.map((t) => `
        <div class="track">
          ${trackArtHTML(t, 'track-art')}
          <div class="track-info">
            <div class="title">${escapeHtml(t.title)}</div>
            <div class="artist">${escapeHtml(t.artist)} · ${escapeHtml(t.sessionTitle)}</div>
          </div>
          <div class="track-time">${fmtHeardAt(t.playedAt)}</div>
          ${likeButtonHTML(t.sessionId, t.trackIndex, t.liked)}
        </div>
      `).join('');
      list.querySelectorAll('[data-like-session]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const track = await toggleLike(btn.dataset.likeSession, btn.dataset.likeIndex);
          if (track) btn.classList.toggle('liked', !!track.liked);
        });
      });
    } catch (e) { section.hidden = true; }
  }

  async function loadLikedSongs() {
    const list = document.getElementById('likedList');
    const empty = document.getElementById('likedEmpty');
    const menuBtn = document.getElementById('likedTrackMenuBtn');
    try {
      const res = await fetch('/api/liked-tracks');
      const liked = await res.json();
      likedTracksCache = liked;
      if (!liked.length) {
        empty.hidden = false;
        empty.textContent = 'No liked songs yet — tap the heart on any song in History.';
        list.innerHTML = '';
        menuBtn.hidden = true;
        return;
      }
      empty.hidden = true;
      menuBtn.hidden = false;
      list.innerHTML = liked.map((t) => `
        <div class="track">
          ${trackArtHTML(t, 'track-art')}
          <div class="track-info">
            <div class="title">${escapeHtml(t.title)}</div>
            <div class="artist">${escapeHtml(t.artist)}</div>
          </div>
          ${likeButtonHTML(t.sessionId, t.trackIndex, true)}
        </div>
      `).join('');
      list.querySelectorAll('[data-like-session]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await toggleLike(btn.dataset.likeSession, btn.dataset.likeIndex);
          loadLikedSongs();
        });
      });
    } catch (e) {
      empty.hidden = false;
      empty.textContent = "Couldn't load liked songs.";
      list.innerHTML = '';
      menuBtn.hidden = true;
    }
  }

  let likedTracksCache = [];
  document.getElementById('likedTrackMenuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    showTrackMenu(e.currentTarget, { eventTitle: 'Liked Songs', tracks: likedTracksCache });
  });

  startStopBtn.addEventListener('click', () => {
    if (!running) return start(false);
    showConfirmModal({
      title: 'End session early?',
      body: 'Are you sure you want to end this session early? Any songs already caught will be saved to History.',
      confirmLabel: 'Stop',
      onConfirm: stop,
    });
  });
  pauseBtn.addEventListener('click', togglePause);

  enableMicBtn.addEventListener('click', async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      micEnabled = true;
      enableMicBtn.textContent = 'Auto-listen enabled';
      enableMicBtn.disabled = true;
    } catch (e) {
      setStatus('Microphone permission was denied.', 'error');
    }
  });

  // ---- profile ----

  const profileBtnIcon = document.getElementById('profileBtnIcon');
  const profileBtnInitial = document.getElementById('profileBtnInitial');
  const profileFirstNameInput = document.getElementById('profileFirstNameInput');
  const profileLastNameInput = document.getElementById('profileLastNameInput');

  function updateProfileAvatar(firstName) {
    const initial = (firstName || '').trim().charAt(0).toUpperCase();
    profileBtn.classList.toggle('has-name', !!initial);
    profileBtnIcon.style.display = initial ? 'none' : '';
    profileBtnInitial.hidden = !initial;
    profileBtnInitial.textContent = initial;
  }

  async function loadProfile() {
    const res = await fetch('/api/profile');
    const profile = await res.json();
    profileFirstNameInput.value = profile.firstName || '';
    profileLastNameInput.value = profile.lastName || '';
    updateProfileAvatar(profile.firstName);
  }

  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: profileFirstNameInput.value, lastName: profileLastNameInput.value }),
    });
    const profile = await res.json();
    updateProfileAvatar(profile.firstName);
  });

  // ---- account ----

  document.getElementById('exportDataBtn').addEventListener('click', async () => {
    const [sessionsRes, statusRes] = await Promise.all([
      fetch('/api/sessions?limit=1000'),
      fetch('/api/calendars/status'),
    ]);
    const sessions = await sessionsRes.json();
    const status = await statusRes.json();
    const exportData = {
      exportedAt: new Date().toISOString(),
      keywords: status.keywords || [],
      sessions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'earshot-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
    if (!confirm("Delete all session history? This can't be undone.")) return;
    await fetch('/api/sessions', { method: 'DELETE' });
    loadHistory();
  });

  // ---- calendar status polling / auto-start ----

  async function pollClassStatus() {
    try {
      const res = await fetch('/api/class-status');
      const data = await res.json();
      if (data.inClass) {
        if (data.candidates && data.candidates.length > 1) {
          if (!running && eventPicker.hidden) showEventPicker(data.candidates);
        } else if (!running) {
          if (!eventPicker.hidden) eventPicker.hidden = true;
          await start(true, data.event);
        }
      } else if (autoStarted && running) {
        stop();
        setStatus('Event ended — stopped listening.', null);
      } else if (!running) {
        if (data.event) showIdleNext(data.event);
        else showIdleMessage("Listening starts automatically once a tracked event begins — or hit Start a session to begin now.");
      }
    } catch (e) {
      // leave whatever status is currently shown
    }
  }

  // ---- calendar connect UI ----

  function providerActionHTML(provider, connected) {
    if (provider === 'apple') {
      return connected
        ? '<button class="link-btn danger" data-disconnect="apple">Disconnect</button>'
        : '<button class="link-btn" id="appleToggle">Connect</button>';
    }
    return connected
      ? `<button class="link-btn danger" data-disconnect="${provider}">Disconnect</button>`
      : `<a href="/auth/${provider}/login" target="_blank"><button class="link-btn">Connect</button></a>`;
  }

  async function refreshCalendarStatus() {
    const res = await fetch('/api/calendars/status');
    const data = await res.json();

    ['google', 'apple'].forEach((p) => {
      const chip = document.getElementById(`chip-${p}`);
      chip.hidden = !data[p];
      chip.textContent = 'Connected';
      chip.classList.add('connected');
      chip.classList.remove('off');
      document.getElementById(`dot-${p}`).classList.toggle('connected', !!data[p]);
      document.getElementById(`row-${p}-action`).innerHTML = providerActionHTML(p, data[p]);
      const errorEl = document.getElementById(`error-${p}`);
      const errorKey = `${p}Error`;
      errorEl.hidden = !data[errorKey];
      errorEl.textContent = data[errorKey] ? `Connection issue: ${data[errorKey]} — try reconnecting.` : '';
    });

    document.querySelectorAll('[data-disconnect]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await fetch(`/api/calendars/${btn.dataset.disconnect}`, { method: 'DELETE' });
        refreshCalendarStatus();
      });
    });

    const appleToggle = document.getElementById('appleToggle');
    if (appleToggle) {
      appleToggle.addEventListener('click', () => {
        document.getElementById('appleForm').classList.toggle('open');
      });
    }

    keywordTags = data.keywords || [];
    renderTags();
  }

  // ---- Spotify connect + playlists ----

  let spotifyConnected = false;

  async function refreshSpotifyStatus() {
    const res = await fetch('/api/spotify/status');
    const data = await res.json();
    spotifyConnected = !!data.connected;

    const chip = document.getElementById('chip-spotify');
    chip.hidden = !spotifyConnected;
    chip.textContent = 'Connected';
    chip.classList.add('connected');
    chip.classList.remove('off');
    document.getElementById('dot-spotify').classList.toggle('connected', spotifyConnected);
    document.getElementById('row-spotify-action').innerHTML = spotifyConnected
      ? '<button class="link-btn danger" id="spotifyDisconnect">Disconnect</button>'
      : '<a href="/auth/spotify/login" target="_blank"><button class="link-btn">Connect</button></a>';

    const disconnectBtn = document.getElementById('spotifyDisconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', async () => {
        await fetch('/api/spotify', { method: 'DELETE' });
        refreshSpotifyStatus();
      });
    }

    applyHistoryView();
  }

  async function createSpotifyPlaylist(btn, session) {
    btn.disabled = true;
    btn.textContent = 'Creating…';
    try {
      const trackUrls = session.tracks.filter((t) => t.spotifyUrl).map((t) => t.spotifyUrl);
      const res = await fetch('/api/spotify/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: session.eventTitle, trackUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      btn.textContent = 'Open in Spotify';
      btn.disabled = false;
      btn.onclick = () => window.open(data.url, '_blank');
    } catch (e) {
      btn.textContent = "Couldn't create playlist";
    }
  }

  // ---- keyword tag editor ----

  function renderTags() {
    if (!keywordTags.length) {
      tagList.innerHTML = '<span class="tag-chip tag-chip-placeholder">e.g. yoga</span>';
      return;
    }
    tagList.innerHTML = keywordTags.map((kw) => `
      <span class="tag-chip">
        ${escapeHtml(kw)}
        <button type="button" data-remove="${escapeHtml(kw)}" aria-label="Remove ${escapeHtml(kw)}" title="Remove ${escapeHtml(kw)}">&times;</button>
      </span>
    `).join('');
    tagList.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removeKeyword(btn.dataset.remove));
    });
  }

  function addKeyword(raw) {
    const kw = raw.trim().toLowerCase();
    if (!kw || keywordTags.includes(kw)) return;
    keywordTags.push(kw);
    renderTags();
    tagSearchInput.value = '';
    closeSuggestions();
    tagSearchInput.focus();
  }

  function removeKeyword(kw) {
    keywordTags = keywordTags.filter((k) => k !== kw);
    renderTags();
  }

  function closeSuggestions() {
    tagSuggestions.hidden = true;
    tagSuggestions.innerHTML = '';
  }

  function renderSuggestions(query) {
    const q = query.trim().toLowerCase();
    const matches = SUGGESTED_KEYWORDS.filter((kw) => !keywordTags.includes(kw) && kw.includes(q));
    const items = matches.map((kw) => `<div class="tag-suggestion" data-value="${escapeHtml(kw)}">${escapeHtml(kw)}</div>`);
    if (q && !SUGGESTED_KEYWORDS.includes(q) && !keywordTags.includes(q)) {
      items.push(`<div class="tag-suggestion create" data-value="${escapeHtml(q)}">Add "${escapeHtml(query.trim())}"</div>`);
    }
    if (!items.length) { closeSuggestions(); return; }
    tagSuggestions.innerHTML = items.join('');
    tagSuggestions.hidden = false;
    tagSuggestions.querySelectorAll('[data-value]').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addKeyword(el.dataset.value);
      });
    });
  }

  tagSearchInput.addEventListener('focus', () => renderSuggestions(tagSearchInput.value));
  tagSearchInput.addEventListener('input', () => renderSuggestions(tagSearchInput.value));
  document.getElementById('tagSearchBtn').addEventListener('click', () => {
    renderSuggestions(tagSearchInput.value);
    tagSearchInput.focus();
  });
  tagSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagSearchInput.value.trim()) addKeyword(tagSearchInput.value);
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });
  tagSearchInput.addEventListener('blur', () => setTimeout(closeSuggestions, 150));

  document.getElementById('appleSubmit').addEventListener('click', async () => {
    const username = document.getElementById('appleEmail').value.trim();
    const appPassword = document.getElementById('applePassword').value.trim();
    if (!username || !appPassword) return;
    const res = await fetch('/api/calendars/apple/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, appPassword }),
    });
    if (res.ok) {
      document.getElementById('appleForm').classList.remove('open');
      refreshCalendarStatus();
    } else {
      const data = await res.json();
      alert(data.error || 'Could not connect iCloud Calendar.');
    }
  });

  document.getElementById('saveKeywords').addEventListener('click', async () => {
    await fetch('/api/calendars/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: keywordTags }),
    });
  });

  // ---- manual event picker ----

  function fmtEventTime(startIso, endIso) {
    const s = new Date(startIso), e = new Date(endIso);
    const dateStr = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const endStr = e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${dateStr}, ${timeStr}–${endStr}`;
  }

  let allEvents = [];

  async function loadEvents() {
    const container = document.getElementById('eventsList');
    container.innerHTML = '<div class="events-empty">Loading…</div>';
    try {
      const res = await fetch('/api/calendars/events?days=7');
      allEvents = await res.json();
      await renderEventsList();
    } catch (e) {
      container.innerHTML = '<div class="events-empty">Couldn\'t load events.</div>';
    }
  }

  async function renderEventsList() {
    const container = document.getElementById('eventsList');
    const query = document.getElementById('eventsSearch').value.trim().toLowerCase();
    const evts = query
      ? allEvents.filter((e) =>
          e.title.toLowerCase().includes(query) ||
          (e.location || '').toLowerCase().includes(query) ||
          (e.description || '').toLowerCase().includes(query))
      : allEvents;

    if (!evts.length) {
      if (!allEvents.length) {
        const statusRes = await fetch('/api/calendars/status');
        const status = await statusRes.json();
        const anyConnected = !!(status.google || status.apple);
        container.innerHTML = anyConnected
          ? '<div class="events-empty">No upcoming events in the next 7 days.</div>'
          : '<div class="events-empty">No upcoming events found. Connect a calendar in <a href="#" id="goToSettingsLink">Settings</a> first.</div>';
        const settingsLink = document.getElementById('goToSettingsLink');
        if (settingsLink) {
          settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('settings');
          });
        }
      } else {
        container.innerHTML = '<div class="events-empty">No events match your search.</div>';
      }
      return;
    }

    const tracked = evts.filter((e) => e.autoMatch || e.selected);
    const untracked = evts.filter((e) => !(e.autoMatch || e.selected));

    let html = '';
    if (tracked.length) {
      html += `<div class="event-group-label">Tracked (${tracked.length})</div>`;
      html += tracked.map(eventRowHTML).join('');
    }
    if (untracked.length) {
      html += `<div class="event-group-label">Untracked (${untracked.length})</div>`;
      html += untracked.map(eventRowHTML).join('');
    }
    container.innerHTML = html;

    container.querySelectorAll('input[type=checkbox]:not([disabled])').forEach((cb) => {
      cb.addEventListener('change', saveSelectedEvents);
    });
  }

  document.getElementById('eventsSearch').addEventListener('input', renderEventsList);
  document.getElementById('eventsSearchBtn').addEventListener('click', renderEventsList);

  function eventRowHTML(e) {
    const key = `${e.source}:${e.id}`;
    const checked = e.autoMatch || e.selected;
    const disabled = e.autoMatch;
    return `
      <div class="event-row">
        <input type="checkbox" data-key="${key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
        <div style="flex:1; min-width:0;">
          <div class="event-title">${escapeHtml(e.title)}</div>
          <div class="event-time">${fmtEventTime(e.start, e.end)} · ${e.source}${e.location ? ' · ' + escapeHtml(e.location) : ''}</div>
        </div>
      </div>
    `;
  }

  async function saveSelectedEvents() {
    const selected = Array.from(document.querySelectorAll('#eventsList input[type=checkbox]:checked:not([disabled])'))
      .map((cb) => cb.dataset.key);
    await fetch('/api/calendars/selected-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected }),
    });
  }

  // ---- manually adding an event ----

  const addEventForm = document.getElementById('addEventForm');
  document.getElementById('addEventToggle').addEventListener('click', () => {
    addEventForm.hidden = !addEventForm.hidden;
  });

  document.getElementById('manualEventSubmit').addEventListener('click', async () => {
    const titleInput = document.getElementById('manualEventTitle');
    const startInput = document.getElementById('manualEventStart');
    const endInput = document.getElementById('manualEventEnd');
    if (!startInput.value || !endInput.value) return;
    const start = new Date(startInput.value);
    const end = new Date(endInput.value);
    if (end <= start) {
      alert('End time has to be after the start time.');
      return;
    }
    await fetch('/api/calendars/manual-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titleInput.value.trim() || 'Untitled event',
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    });
    titleInput.value = '';
    startInput.value = '';
    endInput.value = '';
    addEventForm.hidden = true;
    loadEvents();
  });

  // ---- history ----

  const historyList = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  const historySortBtn = document.getElementById('historySortBtn');
  const historySortMenu = document.getElementById('historySortMenu');
  const historySortLabel = document.getElementById('historySortLabel');
  let historySortValue = 'newest';
  const historySearchEl = document.getElementById('historySearch');
  let allSessions = [];

  function fmtSessionDate(session) {
    const started = new Date(session.startedAt);
    const dateStr = started.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${dateStr} · ${timeStr}`;
  }

  function fmtSessionDuration(session) {
    if (!session.endedAt) return 'Live';
    const mins = Math.max(1, Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function renderHistoryList(sessions, query) {
    if (!sessions.length) {
      historyEmpty.textContent = allSessions.length ? 'No sessions match your search.' : 'No past sessions yet.';
      historyEmpty.style.display = 'block';
      historyList.innerHTML = '';
      return;
    }
    historyEmpty.style.display = 'none';
    historyList.innerHTML = sessions.map((s, i) => {
      const titleMatch = query && s.eventTitle.toLowerCase().includes(query);
      const trackMatch = query && !titleMatch && s.tracks.some((t) =>
        t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));

      const sourceLabel = s.eventSource === 'google' ? 'Google' : s.eventSource === 'apple' ? 'iCloud' : 'Manual';
      const count = s.tracks.length;
      const countLabel = `${count} track${count === 1 ? '' : 's'}`;

      return `
      <div class="session-card">
        <div>
          <div class="session-head${trackMatch ? ' open' : ''}${count === 0 ? ' no-toggle' : ''}" data-idx="${i}" role="button" tabindex="${count === 0 ? -1 : 0}">
            <div class="session-title">
              <span class="session-title-text">${escapeHtml(s.eventTitle)}</span>
              <button class="session-edit-btn" type="button" data-session-menu="${s.id}" aria-label="Event options" title="Event options">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>
              </button>
            </div>
            ${count > 0 ? `<button class="session-edit-btn" type="button" data-track-menu="${s.id}" aria-label="Song list options" title="Song list options">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </button>` : ''}
            <span class="session-count${count === 0 ? ' zero' : ''}">${countLabel}</span>
            ${count > 0 ? '<span class="session-caret"></span>' : ''}
          </div>
          <div class="session-meta">${sourceLabel} · ${fmtSessionDate(s)} · <span class="session-duration${s.endedAt ? '' : ' is-live'}">${fmtSessionDuration(s)}</span></div>
        </div>
        <div class="session-tracks" style="display:${trackMatch ? 'flex' : 'none'};">
          ${s.tracks.length ? s.tracks.map((t, j) => `
            <div class="session-track">
              <span class="session-track-num">${String(j + 1).padStart(2, '0')}</span>
              ${trackArtHTML(t, 'session-track-art')}
              <span class="title">${escapeHtml(t.title)} <span class="artist">${escapeHtml(t.artist)}</span></span>
              ${likeButtonHTML(s.id, j, t.liked)}
            </div>
          `).join('') : '<div class="events-empty">Nothing was recognized during this session.</div>'}
        </div>
      </div>
    `;
    }).join('');

    historyList.querySelectorAll('.session-head').forEach((head) => {
      const toggle = () => {
        const card = head.closest('.session-card');
        const body = card.querySelector('.session-tracks');
        const opening = body.style.display === 'none';
        body.style.display = opening ? 'flex' : 'none';
        head.classList.toggle('open', opening);
      };
      head.addEventListener('click', (e) => {
        if (head.classList.contains('no-toggle')) return;
        if (e.target.closest('[data-session-menu], [data-track-menu]')) return;
        toggle();
      });
      head.addEventListener('keydown', (e) => {
        if (head.classList.contains('no-toggle')) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    historyList.querySelectorAll('[data-session-menu]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showSessionMenu(btn, btn.dataset.sessionMenu);
      });
    });

    historyList.querySelectorAll('[data-track-menu]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showTrackMenu(btn, sessions.find((s) => s.id === btn.dataset.trackMenu));
      });
    });

    historyList.querySelectorAll('[data-like-session]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const track = await toggleLike(btn.dataset.likeSession, btn.dataset.likeIndex);
        if (track) btn.classList.toggle('liked', !!track.liked);
      });
    });
  }

  async function toggleLike(sessionId, index) {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/tracks/${index}/like`, { method: 'POST' });
      if (!res.ok) return null;
      return res.json();
    } catch (e) { return null; }
  }

  async function getLinkableEvents() {
    const res = await fetch('/api/calendars/events?days=14');
    return res.json();
  }

  const linkEventMenu = document.getElementById('linkEventMenu');

  async function showLinkEventMenu(btn, sessionId) {
    const events = await getLinkableEvents();
    const session = allSessions.find((s) => s.id === sessionId);
    const rect = btn.getBoundingClientRect();
    linkEventMenu.style.top = `${rect.bottom + 6}px`;
    linkEventMenu.style.left = `${rect.left}px`;
    const items = [`<button type="button" data-create="1"><span class="pill-dot"></span>Create new event…</button>`]
      .concat(events.map((e, i) => `<button type="button" data-idx="${i}"><span class="pill-dot"></span>${escapeHtml(e.title)}</button>`));
    if (session && session.eventId) {
      items.push(`<button type="button" class="danger" data-unlink="1"><span class="pill-dot"></span>Unlink event</button>`);
    }
    linkEventMenu.innerHTML = items.join('');
    linkEventMenu.hidden = false;
    linkEventMenu.querySelector('[data-create]').addEventListener('click', (e) => {
      e.stopPropagation();
      linkEventMenu.hidden = true;
      startEventFromSession(session);
    });
    linkEventMenu.querySelectorAll('button[data-idx]').forEach((opt) => {
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        const chosen = events[Number(opt.dataset.idx)];
        linkEventMenu.hidden = true;
        await fetch(`/api/sessions/${sessionId}/link-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventSource: chosen.source, eventId: chosen.id, eventTitle: chosen.title }),
        });
        loadHistory();
      });
    });
    const unlinkBtn = linkEventMenu.querySelector('[data-unlink]');
    if (unlinkBtn) {
      unlinkBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        linkEventMenu.hidden = true;
        await fetch(`/api/sessions/${sessionId}/link-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        loadHistory();
      });
    }
  }

  const sessionMenu = document.getElementById('sessionMenu');

  function showSessionMenu(btn, sessionId) {
    const session = allSessions.find((s) => s.id === sessionId);
    const rect = btn.getBoundingClientRect();
    sessionMenu.style.top = `${rect.bottom + 6}px`;
    sessionMenu.style.left = `${rect.left}px`;
    sessionMenu.innerHTML = `
      <button type="button" data-action="rename"><span class="pill-dot"></span>Rename</button>
      <button type="button" data-action="reassign"><span class="pill-dot"></span>Reassign</button>
      <button type="button" class="danger" data-action="delete"><span class="pill-dot"></span>Delete</button>
    `;
    sessionMenu.hidden = false;

    sessionMenu.querySelector('[data-action="rename"]').addEventListener('click', (e) => {
      e.stopPropagation();
      sessionMenu.hidden = true;
      const titleEl = btn.closest('.session-title').querySelector('.session-title-text');
      startEditingSessionTitle(session, titleEl);
    });
    sessionMenu.querySelector('[data-action="reassign"]').addEventListener('click', (e) => {
      e.stopPropagation();
      sessionMenu.hidden = true;
      showLinkEventMenu(btn, sessionId);
    });
    sessionMenu.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      sessionMenu.hidden = true;
      const count = session.tracks.length;
      showConfirmModal({
        title: 'Delete session?',
        body: `This permanently deletes "${session.eventTitle}" and its ${count} track${count === 1 ? '' : 's'}. This can't be undone.`,
        confirmLabel: 'Delete',
        onConfirm: async () => {
          await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
          loadHistory();
        },
      });
    });
  }

  const trackMenu = document.getElementById('trackMenu');

  function showTrackMenu(btn, session) {
    const rect = btn.getBoundingClientRect();
    trackMenu.style.top = `${rect.bottom + 6}px`;
    trackMenu.style.left = `${rect.left}px`;
    const spotifyTrackUrls = session.tracks.filter((t) => t.spotifyUrl).map((t) => t.spotifyUrl);

    const items = [`<button type="button" data-action="copy"><span class="pill-dot"></span>Copy list</button>`];
    if (spotifyTrackUrls.length) {
      if (spotifyConnected) {
        items.push(`<button type="button" data-action="create"><span class="pill-dot"></span>Create Spotify playlist</button>`);
        items.push(`<button type="button" data-action="add"><span class="pill-dot"></span>Add to Spotify playlist</button>`);
      } else {
        items.push(`<button type="button" data-action="connect"><span class="pill-dot"></span>Connect Spotify in Settings</button>`);
      }
    }
    trackMenu.innerHTML = items.join('');
    trackMenu.hidden = false;

    trackMenu.querySelector('[data-action="copy"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = session.tracks.map((t) => `${t.title} by ${t.artist}`).join('\n');
      try { await navigator.clipboard.writeText(text); } catch (err) { /* clipboard unavailable */ }
      trackMenu.hidden = true;
    });

    const createBtn = trackMenu.querySelector('[data-action="create"]');
    if (createBtn) createBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      createSpotifyPlaylist(createBtn, session);
    });

    const addBtn = trackMenu.querySelector('[data-action="add"]');
    if (addBtn) addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showAddToPlaylistPicker(spotifyTrackUrls);
    });

    const connectBtn = trackMenu.querySelector('[data-action="connect"]');
    if (connectBtn) connectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trackMenu.hidden = true;
      switchTab('settings');
    });
  }

  async function showAddToPlaylistPicker(trackUrls) {
    trackMenu.innerHTML = '<button type="button" disabled><span class="pill-dot"></span>Loading playlists…</button>';
    try {
      const res = await fetch('/api/spotify/playlists');
      const playlists = await res.json();
      if (!res.ok) throw new Error(playlists.error || 'Failed');
      if (!playlists.length) {
        trackMenu.innerHTML = '<button type="button" disabled><span class="pill-dot"></span>No playlists found</button>';
        return;
      }
      trackMenu.innerHTML = playlists.map((p, i) => `<button type="button" data-idx="${i}"><span class="pill-dot"></span>${escapeHtml(p.name)}</button>`).join('');
      trackMenu.querySelectorAll('button[data-idx]').forEach((opt) => {
        opt.addEventListener('click', async (e) => {
          e.stopPropagation();
          opt.textContent = 'Adding…';
          try {
            const addRes = await fetch(`/api/spotify/playlists/${playlists[Number(opt.dataset.idx)].id}/tracks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trackUrls }),
            });
            if (!addRes.ok) throw new Error();
            opt.textContent = 'Added!';
            setTimeout(() => { trackMenu.hidden = true; }, 1000);
          } catch (err) {
            opt.textContent = "Couldn't add";
          }
        });
      });
    } catch (err) {
      trackMenu.innerHTML = '<button type="button" disabled><span class="pill-dot"></span>Couldn\'t load playlists</button>';
    }
  }

  const confirmModalOverlay = document.getElementById('confirmModalOverlay');
  const confirmModalTitle = document.getElementById('confirmModalTitle');
  const confirmModalBody = document.getElementById('confirmModalBody');
  const confirmModalCancel = document.getElementById('confirmModalCancel');
  const confirmModalConfirm = document.getElementById('confirmModalConfirm');

  function showConfirmModal({ title, body, confirmLabel, onConfirm }) {
    confirmModalTitle.textContent = title;
    confirmModalBody.textContent = body;
    confirmModalConfirm.textContent = confirmLabel || 'Confirm';
    confirmModalOverlay.hidden = false;

    const cleanup = () => {
      confirmModalOverlay.hidden = true;
      confirmModalConfirm.removeEventListener('click', onConfirmClick);
      confirmModalCancel.removeEventListener('click', onCancelClick);
    };
    const onConfirmClick = () => { cleanup(); onConfirm(); };
    const onCancelClick = () => cleanup();
    confirmModalConfirm.addEventListener('click', onConfirmClick);
    confirmModalCancel.addEventListener('click', onCancelClick);
  }

  confirmModalOverlay.addEventListener('click', (e) => {
    if (e.target === confirmModalOverlay) confirmModalOverlay.hidden = true;
  });

  function startEventFromSession(session) {
    switchTab('events');
    addEventForm.hidden = false;
    document.getElementById('manualEventTitle').value = session.eventTitle;
    const startInput = document.getElementById('manualEventStart');
    startInput.focus();
    startInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function startEditingSessionTitle(session, titleEl) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = session.eventTitle;
    input.className = 'session-title-input';
    input.placeholder = `Leave blank for "${session.originalTitle || session.eventTitle}"`;
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = async () => {
      const newTitle = input.value.trim();
      if (newTitle !== session.eventTitle) {
        try {
          const res = await fetch(`/api/sessions/${session.id}/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventTitle: newTitle }),
          });
          if (res.ok) {
            const updated = await res.json();
            session.eventTitle = updated.eventTitle;
          }
        } catch (e) { /* keep old title on failure */ }
      }
      applyHistoryView();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = session.eventTitle; input.blur(); }
    });
    input.addEventListener('blur', commit, { once: true });
  }

  function applyHistoryView() {
    const sort = historySortValue;
    const query = historySearchEl.value.trim().toLowerCase();

    let sessions = allSessions.filter((s) => {
      if (!query) return true;
      const titleMatch = s.eventTitle.toLowerCase().includes(query);
      const trackMatch = s.tracks.some((t) =>
        t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
      return titleMatch || trackMatch;
    });

    sessions = sessions.slice().sort((a, b) => {
      if (sort === 'oldest') return new Date(a.startedAt) - new Date(b.startedAt);
      if (sort === 'most') return b.tracks.length - a.tracks.length;
      if (sort === 'fewest') return a.tracks.length - b.tracks.length;
      return new Date(b.startedAt) - new Date(a.startedAt); // newest
    });

    renderHistoryList(sessions, query);
  }

  function setupDropdown(btn, menu, label, onSelect) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = menu.hidden;
      document.querySelectorAll('.profile-menu').forEach((m) => { if (m !== menu) m.hidden = true; });
      menu.hidden = !opening;
    });
    menu.addEventListener('click', (e) => e.stopPropagation());
    menu.querySelectorAll('button[data-value]').forEach((opt) => {
      opt.addEventListener('click', () => {
        label.textContent = opt.textContent.trim();
        menu.hidden = true;
        onSelect(opt.dataset.value);
      });
    });
  }

  setupDropdown(historySortBtn, historySortMenu, historySortLabel, (v) => { historySortValue = v; applyHistoryView(); });
  setupDropdown(trackSortBtn, trackSortMenu, trackSortLabel, (v) => { trackSortOrder = v; renderTracks(); });
  historySearchEl.addEventListener('input', applyHistoryView);
  document.getElementById('historySearchBtn').addEventListener('click', applyHistoryView);

  async function loadHistory() {
    try {
      const res = await fetch('/api/sessions?limit=30');
      allSessions = await res.json();
      applyHistoryView();
    } catch (e) {
      historyList.innerHTML = '';
      historyEmpty.textContent = "Couldn't load history.";
      historyEmpty.style.display = 'block';
    }
  }

  document.getElementById('goToEventsLink').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('events');
  });

  // ---- profile menu ----

  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');

  profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = profileMenu.hidden;
    document.querySelectorAll('.profile-menu').forEach((m) => { if (m !== profileMenu) m.hidden = true; });
    profileMenu.hidden = !opening;
  });
  profileMenu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => {
    document.querySelectorAll('.profile-menu').forEach((m) => { m.hidden = true; });
  });

  document.querySelectorAll('[data-profile-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      profileMenu.hidden = true;
      switchTab(btn.dataset.profileAction);
    });
  });

  try {
    const savedTab = localStorage.getItem('earshot_active_tab');
    if (savedTab && tabPanels[savedTab]) switchTab(savedTab);
  } catch (e) {}

  renderTracks();
  refreshCalendarStatus();
  refreshSpotifyStatus();
  loadProfile();
  loadEvents();
  loadHistory();
  loadRecentlyHeard();
  loadLikedSongs();
  pollClassStatus();
  setInterval(pollClassStatus, POLL_MS);

(() => {
  'use strict';

  // These chapters have their own songs. Keep the saved background position intact.
  if (['song', 'stay'].includes(document.body.dataset.journey)) return;

  const positionKey = 'garden:backgroundMusicPosition';
  const audio = document.createElement('audio');
  audio.src = 'assets/audio/apologize.m4a';
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = .13;
  audio.hidden = true;
  document.body.append(audio);

  let restored = false;
  let pending = false;
  let leaving = false;
  let lastSave = 0;

  function restorePosition() {
    if (!audio.readyState) return;
    let position = 0;
    try { position = Number(sessionStorage.getItem(positionKey)) || 0; }
    catch { /* Playback still works when storage is unavailable. */ }
    if (!Number.isFinite(position) || position < 0) position = 0;
    if (Number.isFinite(audio.duration) && audio.duration > 0) position %= audio.duration;
    audio.currentTime = position;
    restored = true;
  }

  function savePosition() {
    if (!restored) return;
    try { sessionStorage.setItem(positionKey, String(audio.currentTime)); }
    catch { /* Storage is optional. */ }
  }

  async function play() {
    if (leaving || document.hidden || pending || !audio.paused) return;
    pending = true;
    try {
      if (!restored) restorePosition();
      // Also invoked directly from a gesture for browsers that block autoplay.
      await audio.play();
      if (leaving || document.hidden) audio.pause();
    } catch { /* A later tap or key press retries without showing a player. */ }
    finally { pending = false; }
  }

  function pause() {
    audio.pause();
    savePosition();
  }

  audio.addEventListener('loadedmetadata', () => {
    if (!restored) restorePosition();
  });
  audio.addEventListener('timeupdate', () => {
    if (Date.now() - lastSave < 1000) return;
    lastSave = Date.now();
    savePosition();
  });
  document.addEventListener('click', play, { capture: true });
  document.addEventListener('keydown', play, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else play();
  });
  window.addEventListener('pagehide', () => { leaving = true; pause(); });
  window.addEventListener('pageshow', event => {
    leaving = false;
    if (event.persisted) {
      restored = false;
      restorePosition();
    }
    play();
  });
  play();
})();

(() => {
  'use strict';
  const audio = document.querySelector('#longingAudio');
  const reveal = document.querySelector('#revealSong');
  const lines = document.querySelector('#songLines');
  const status = document.querySelector('#songStatus');
  const next = document.querySelector('#chapterContinue');
  const panel = document.querySelector('.song-panel');
  const navigation = document.querySelector('#songNavigation');
  const messages = [
    'ал егер кешірмесеңіз…',
    'ренішіңіз тарқамаса…',
    'АУАНЫ ЖҰТТЫМ СІЗ ЖҰТҚАН\nӨЗІМЕ ОЛ ДА ЖҰБАНЫЫЫЫЫШ',
  ];
  const startAt = 52;
  let step = 0;
  let needsSeek = true;
  let playAttempt = 0;
  audio.volume = .65;

  function seekToVerse() {
    if (audio.readyState === 0) { needsSeek = true; return; }
    try { audio.currentTime = startAt; needsSeek = false; }
    catch { needsSeek = true; }
  }
  audio.addEventListener('loadedmetadata', () => { if (needsSeek) seekToVerse(); });
  seekToVerse();

  function playVerse() {
    const attempt = ++playAttempt;
    seekToVerse();
    // Call play directly during the click, including when metadata is still loading.
    // The metadata handler seeks before the first audio samples can play.
    const playing = audio.play();
    status.textContent = '';
    if (playing) playing.catch(() => {
      if (attempt === playAttempt && !document.hidden) status.textContent = 'Әуенді тыңдау үшін ▶ батырмасын басыңыз.';
    });
  }
  reveal.addEventListener('click', () => {
    if (step >= messages.length) return;
    panel.hidden = false;
    const line = document.createElement('p');
    line.className = step === 2 ? 'song-lyric' : 'song-line';
    line.textContent = messages[step];
    lines.append(line);
    step++;
    if (step === messages.length) {
      reveal.hidden = true;
      next.hidden = false;
      navigation.hidden = false;
      panel.classList.add('verse-revealed');
      document.body.classList.add('song-complete');
      next.focus({ preventScroll: true });
      playVerse();
    } else {
      reveal.setAttribute('aria-label', step === 1 ? 'Екінші жолды ашу' : 'Өлең жолын ашып, әнді қосу');
    }
  });
  document.querySelector('#replaySong').addEventListener('click', playVerse);
  audio.addEventListener('error', () => {
    status.textContent = 'Әуен жүктелмеді. Бетті жаңартып, қайта тыңдап көріңіз.';
  });
  function pause() { playAttempt++; audio.pause(); }
  window.addEventListener('pagehide', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
})();

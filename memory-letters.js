(() => {
  'use strict';
  const notes = [
  {
    "style": "postcard",
    "ornament": "✉",
    "title": "Универден қайтқан сайын",
    "text": "Білесіз бе, мен универге барып қайтқан сайын «Омар» деген шоурумның қасынан өтем. Сол жерден өткен сайын сізді еске аламын."
  },
  {
    "style": "tea",
    "ornament": "◌",
    "title": "Бір жұтым судың өзінде",
    "text": "Үйде отырып су ішкенде, сіз берген кружкамен ішемін. Күнделікті сондай кішкентай сәттің өзінде сіз есіме түсесіз."
  },
  {
    "style": "ribbon",
    "ornament": "✂",
    "title": "Шашымды бояп бергеніңіз",
    "text": "Шаш бояу туралы ойлаған сайын, шашымды бояп бергеніңізді еске аламын. Мен үшін сол сәттің де өз жылулығы бар."
  },
  {
    "style": "jewel",
    "ornament": "◇",
    "title": "«Қандай күшті, қайдан алдың?»",
    "text": "Құрбыларым сіз берген алқаны көріп: «Қандай күшті! Қайдан алдың?» — деген сайын сізді еске аламын. Сіздің сыйлығыңыз менімен бірге жүр."
  },
  {
    "style": "quote",
    "ornament": "“",
    "title": "Өзімді басқаша көре бастадым",
    "text": "Жазда маған айтқан «Талантливый человек талантлив во всём» деген сөзіңіз маған көп көмегін тигізді деп айта аламын. Мен өзімді талантты адам деп санамаған едім. Бірақ сіздің сөзіңізден кейін ойланып, өзімді сезіне бастадым."
  },
  {
    "style": "receipt",
    "ornament": "✳",
    "title": "Бірге байланыстырып қоямын",
    "text": "Фастфуд жеу мен үшін сізбен ассоциация. Сондай қарапайым нәрсенің өзі сізді есіме түсіреді."
  },
  {
    "style": "soda",
    "ornament": "◦",
    "title": "Сусын алған кезде де",
    "text": "Сушняк алып ішу де сізді еске түсіреді. Күнделікті өмірімде сізбен байланыстырып қоятын нәрселер көп екен."
  },
  {
    "style": "japan",
    "ornament": "✿",
    "title": "Алыс ел туралы ойласам да",
    "text": "Жапонияны ойлағанда да сіз есіме түсесіз. Тіпті сондай алыс жер туралы ойдың ішінде де сіз барсыз."
  },
  {
    "style": "sketch",
    "ornament": "✎",
    "title": "Сурет сала бастадым",
    "text": "Сіз берген скетчбукқа сурет сала бастадым. Өзімді сурет сала алатын адам деп санамайтын едім. Ал қазір байқап көріп жүрмін. Маған өзіме сенуге себеп бергеніңіз үшін рақмет."
  }
];
  const dialog = document.createElement('dialog');
  dialog.className = 'butterfly-letter-dialog page-memories';
  dialog.setAttribute('aria-labelledby', 'butterflyLetterTitle');
  dialog.innerHTML = `
    <button class="letter-close" type="button" aria-label="Хатты жабу" autofocus>×</button>
    <div class="memory-entry">
      <article class="memory-letter">
        <span class="memory-pressed-flower" aria-hidden="true"></span>
        <p class="small-label memory-number"></p>
        <h2 id="butterflyLetterTitle"></h2>
        <p class="memory-text"></p>
        <p class="memory-signoff">Күнделікті өмірімнің талай жерінде сіз барсыз. ♡</p>
      </article>
    </div>`;
  document.body.append(dialog);
  let cursor = 0, opener = null;
  try { cursor = Number(sessionStorage.getItem('garden:butterflyLetter')) || 0; } catch {}
  if (!Number.isInteger(cursor) || cursor < 0) cursor = 0;
  window.addEventListener('meadow:butterfly', event => {
    if (dialog.open) return;
    const index = cursor % notes.length, note = notes[index];
    dialog.querySelector('.memory-entry').dataset.memoryStyle = note.style;
    dialog.querySelector('.memory-pressed-flower').textContent = note.ornament;
    dialog.querySelector('.memory-number').textContent = `КӨБЕЛЕК ӘКЕЛГЕН ХАТ · ${String(index + 1).padStart(2, '0')} / 09`;
    dialog.querySelector('h2').textContent = note.title;
    dialog.querySelector('.memory-text').textContent = note.text;
    opener = event.detail?.trigger || document.activeElement;
    dialog.showModal();
    dialog.scrollTop = 0;
    cursor = (index + 1) % notes.length;
    try { sessionStorage.setItem('garden:butterflyLetter', String(cursor)); } catch {}
  });
  dialog.querySelector('.letter-close').addEventListener('click', () => dialog.close());
  // Only a deliberate click on the backdrop closes the letter.
  let backdropPress = false;
  const outside = event => {
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  };
  dialog.addEventListener('pointerdown', event => { backdropPress = event.target === dialog && outside(event); });
  dialog.addEventListener('pointercancel', () => { backdropPress = false; });
  dialog.addEventListener('click', event => {
    if (backdropPress && event.target === dialog && outside(event)) dialog.close();
    backdropPress = false;
  });
  dialog.addEventListener('close', () => { opener?.focus?.({ preventScroll:true }); });
})();

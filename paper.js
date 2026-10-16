const pageName = window.location.pathname.split("/").pop() || "index.html";
const backTargets = {
  "index.html": "index.html",
  "yes.html": "index.html",
  "rating.html": "song.html",
  "sarange.html": "rating.html",
  "gentle.html": "quiz.html",
  "improve.html": "rating.html",
  "ten.html": "rating.html",
  "error67.html": "rating.html",
};

const hiddenNotes = {
  "index.html": null,
  "yes.html": {
    label: "КІШКЕНТАЙ ҚҰПИЯ",
    title: "«Иә» дегеніңізге<br />сенгім келеді.",
    text: "Осы сұрақты қайта қойғаным — жауабыңызды бағаламағанымнан емес. Сіздің кешіріміңіз мен үшін өте маңызды болғандықтан.",
    sign: "Рақмет сізге ♡",
  },
  "rating.html": {
    label: "ШЫНДЫҚ ҮШІН",
    title: "Кез келген санды<br />қабылдаймын.",
    text: "Жауабыңыз қандай болса да, сізге ренжімеймін. Маған шындықты айтқаныңыздың өзі — үлкен мүмкіндік.",
    sign: "Мен тыңдауға дайынмын ♡",
  },
  "sarange.html": {
    label: "ЖҮРЕКТІҢ ІШІНДЕ",
    title: "Сіз мен үшін<br />өте қымбатсыз.",
    text: "Кейбір адамдарды күнде көрмесек те, олар күнделікті кішкентай сәттердің бәрінде бізбен бірге болады.",
    sign: "Сіз сондай адамсыз ♡",
  },
  "gentle.html": {
    label: "ТАҒЫ БІР РАҚМЕТ",
    title: "Жылы жауабыңызды<br />ұмытпаймын.",
    text: "Бұл кішкентай хат біздің арамыздағы барлық нәрсені бірден түземейді. Бірақ жаңа, жақсы бастама болса екен деймін.",
    sign: "Асықпай, шын жүректен ♡",
  },
  "improve.html": {
    label: "МЕНІҢ ШЫН НИЕТІМ",
    title: "Тек жауап емес,<br />өзгергім келеді.",
    text: "Айтқаныңызды жай ғана оқып қоймаймын. Түсінуге, есте сақтауға және ісіммен көрсетуге тырысамын.",
    sign: "Сізді тыңдап тұрмын ♡",
  },
  "ten.html": {
    label: "РЕКОРДТЫҢ АРТЫНДА",
    title: "10/10 болса да,<br />үмітімді үзбеймін.",
    text: "Қатты ренжіткенімді түсінемін. Сіз дайын болған кезде, мен бәрін тыныш отырып тыңдауға дайынмын.",
    sign: "Әлі де кешірім сұраймын ♡",
  },
  "error67.html": {
    label: "SECRET_SYSTEM_LOG",
    title: "67 DETECTED",
    text: "STATUS: реніш шкаладан тыс. APOLOGY: әлі белсенді. HEART: қайта іске қосылуға дайын.",
    sign: "end_of_secret.log ♡",
  },
};

const surface = document.querySelector("main .card, main .error-window");
const stage = surface?.parentElement;
const noteData = hiddenNotes[pageName];

if (pageName !== "index.html") {
  const backButton = document.createElement("button");
  backButton.className = "back-button";
  backButton.type = "button";
  backButton.textContent = "← Артқа";
  backButton.addEventListener("click", () => {
    window.location.href = backTargets[pageName] || "index.html";
  });
  (surface || document.body).appendChild(backButton);
}

if (surface && stage && noteData && !stage.querySelector(".secret-note")) {
  const note = document.createElement("aside");
  note.className = `secret-note${pageName === "error67.html" ? " secret-error-note" : ""}`;
  note.setAttribute("aria-label", "Жасырын хат");
  note.innerHTML = `
    <span class="secret-note-heart" aria-hidden="true">♡</span>
    <p class="eyebrow">${noteData.label}</p>
    <h2>${noteData.title}</h2>
    <p>${noteData.text}</p>
    <span class="secret-signoff">${noteData.sign}</span>
  `;
  stage.insertBefore(note, surface);
}

if (surface && !surface.querySelector(".tape-handle")) {
  const handle = document.createElement("button");
  handle.className = "tape tape-handle";
  handle.type = "button";
  handle.setAttribute("aria-label", "Қағазды жылжыту үшін ұстап тартыңыз");
  handle.innerHTML = "<span>pull me</span>";
  surface.prepend(handle);
  surface.classList.add("draggable-card");

  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let dragging = false;

  const movePaper = (nextX, nextY) => {
    const maxX = Math.min(window.innerWidth * 0.42, 520);
    const maxY = Math.min(window.innerHeight * 0.42, 360);
    x = Math.max(-maxX, Math.min(maxX, nextX));
    y = Math.max(-maxY, Math.min(maxY, nextY));
    surface.style.setProperty("--card-x", `${x}px`);
    surface.style.setProperty("--card-y", `${y}px`);
    surface.style.setProperty("--card-tilt", `${Math.max(-3, Math.min(3, x / 100))}deg`);
  };

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originX = x;
    originY = y;
    surface.classList.add("is-dragging", "has-moved");
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (dragging) movePaper(originX + event.clientX - startX, originY + event.clientY - startY);
  });
  const stopDragging = (event) => {
    if (!dragging) return;
    dragging = false;
    surface.classList.remove("is-dragging");
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  };
  handle.addEventListener("pointerup", stopDragging);
  handle.addEventListener("pointercancel", stopDragging);
  window.addEventListener("resize", () => movePaper(x, y));
}

// Hidden notes move independently from the letter in front of them.
document.querySelectorAll('.secret-note').forEach(note => {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'note-drag-handle';
  handle.textContent = '♡';
  handle.setAttribute('aria-label', 'Жазбаны жылжыту: ұстап тартыңыз немесе бағыт пернелерін қолданыңыз. Home — бастапқы орны.');
  note.append(handle);
  note.classList.add('movable-note');
  let x = matchMedia('(max-width: 600px)').matches ? 8 : 18, y = 10, press = null;

  function moveNote(nextX, nextY) {
    const maxX = Math.max(18, Math.min(520, (window.innerWidth - note.offsetWidth) / 2 - 12));
    const maxY = Math.max(10, Math.min(360, (window.innerHeight - note.offsetHeight) / 2 - 12));
    x = Math.max(-maxX, Math.min(maxX, nextX));
    y = Math.max(-maxY, Math.min(maxY, nextY));
    note.style.setProperty('--note-x', `${x}px`);
    note.style.setProperty('--note-y', `${y}px`);
  }
  note.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || press) return;
    if (event.target.closest('a,input,textarea,select,button') && event.target !== handle) return;
    event.preventDefault();
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: x, originY: y };
    note.classList.add('is-note-dragging');
    note.setPointerCapture(event.pointerId);
  });
  note.addEventListener('pointermove', event => {
    if (!press || press.id !== event.pointerId) return;
    moveNote(press.originX + event.clientX - press.x, press.originY + event.clientY - press.y);
  });
  function endDrag(event) {
    if (!press || press.id !== event.pointerId) return;
    press = null;
    note.classList.remove('is-note-dragging');
    if (note.hasPointerCapture(event.pointerId)) note.releasePointerCapture(event.pointerId);
  }
  note.addEventListener('pointerup', endDrag);
  note.addEventListener('pointercancel', endDrag);
  note.addEventListener('lostpointercapture', endDrag);
  handle.addEventListener('keydown', event => {
    const step = event.shiftKey ? 30 : 10;
    const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === 'Home') { event.preventDefault(); moveNote(matchMedia('(max-width: 600px)').matches ? 8 : 18, 10); }
    else if (directions[event.key]) {
      event.preventDefault();
      const [dx, dy] = directions[event.key]; moveNote(x + dx, y + dy);
    }
  });
  window.addEventListener('resize', () => moveNote(x, y));
});

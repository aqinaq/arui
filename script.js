const noButton = document.querySelector("#noButton");
const playground = document.querySelector("#buttonPlayground");
const hint = document.querySelector("#hint");
const seal = document.querySelector("#heartSeal");
const toast = document.querySelector("#toast");
const apologyCard = document.querySelector("#apologyCard");
const dragHandle = document.querySelector("#dragHandle");
const noReplies = ["жожожоқ", "жоқ дегенде жоқ", "шынымен жоқ па?", "жоқ.", "жоқ кет"];

let lastMove = 0;
let noMoves = 0;
let cardX = 0;
let cardY = 0;
let dragStartX = 0;
let dragStartY = 0;
let startCardX = 0;
let startCardY = 0;
let isDraggingCard = false;

function updateCardPosition(x, y) {
  const maxX = Math.min(window.innerWidth * 0.42, 520);
  const maxY = Math.min(window.innerHeight * 0.42, 360);
  cardX = Math.max(-maxX, Math.min(maxX, x));
  cardY = Math.max(-maxY, Math.min(maxY, y));
  apologyCard.style.setProperty("--card-x", `${cardX}px`);
  apologyCard.style.setProperty("--card-y", `${cardY}px`);
  apologyCard.style.setProperty("--card-tilt", `${Math.max(-3, Math.min(3, cardX / 100))}deg`);
}

dragHandle.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  isDraggingCard = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  startCardX = cardX;
  startCardY = cardY;
  apologyCard.classList.add("is-dragging", "has-moved");
  dragHandle.setPointerCapture(event.pointerId);
});

dragHandle.addEventListener("pointermove", (event) => {
  if (!isDraggingCard) return;
  updateCardPosition(startCardX + event.clientX - dragStartX, startCardY + event.clientY - dragStartY);
});

function finishCardDrag(event) {
  if (!isDraggingCard) return;
  isDraggingCard = false;
  apologyCard.classList.remove("is-dragging");
  if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
}

dragHandle.addEventListener("pointerup", finishCardDrag);
dragHandle.addEventListener("pointercancel", finishCardDrag);

window.addEventListener("resize", () => updateCardPosition(cardX, cardY));

function moveNoButton() {
  const now = Date.now();
  if (now - lastMove < 450) return;
  lastMove = now;

  const previousPosition = noButton.getBoundingClientRect();
  noButton.textContent = noReplies[noMoves % noReplies.length];
  noMoves += 1;
  const button = noButton.getBoundingClientRect();
  const padding = Math.min(64, Math.max(28, window.innerWidth * 0.035));
  const maxX = Math.max(padding, window.innerWidth - button.width - padding);
  const maxY = Math.max(padding, window.innerHeight - button.height - padding);
  let x = padding;
  let y = padding;

  const yes = document.querySelector("#yesButton").getBoundingClientRect();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    x = padding + Math.random() * Math.max(0, maxX - padding);
    y = padding + Math.random() * Math.max(0, maxY - padding);
    const overlapsYes = !(
      x + button.width < yes.left - 18 ||
      x > yes.right + 18 ||
      y + button.height < yes.top - 18 ||
      y > yes.bottom + 18
    );
    if (!overlapsYes) break;
  }

  if (!noButton.classList.contains("is-escaped")) {
    document.body.appendChild(noButton);
    noButton.classList.add("is-escaped", "is-placing");
    noButton.style.left = `${previousPosition.left}px`;
    noButton.style.top = `${previousPosition.top}px`;
    noButton.style.right = "auto";
    void noButton.offsetWidth;
    noButton.classList.remove("is-placing");
  }
  noButton.style.left = `${x}px`;
  noButton.style.top = `${y}px`;
  noButton.style.setProperty("--tilt", `${Math.random() * 10 - 5}deg`);
  noButton.classList.add("is-running");
}

noButton.addEventListener("pointerenter", moveNoButton);
noButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  moveNoButton();
});
noButton.addEventListener("focus", moveNoButton);
noButton.addEventListener("click", moveNoButton);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

seal.addEventListener("click", (event) => {
  showToast("мені кешіріңізші.");
  for (let i = 0; i < 9; i += 1) {
    const heart = document.createElement("span");
    heart.className = "pop-heart";
    heart.textContent = i % 3 === 0 ? "✦" : "♥";
    heart.style.left = `${event.clientX + (Math.random() * 90 - 45)}px`;
    heart.style.top = `${event.clientY + (Math.random() * 35 - 17)}px`;
    heart.style.animationDelay = `${i * 35}ms`;
    document.body.appendChild(heart);
    window.setTimeout(() => heart.remove(), 1400);
  }
});

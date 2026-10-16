const form = document.querySelector("#replyForm");
const reply = document.querySelector("#reply");
const savedNote = document.querySelector("#savedNote");
const followup = document.querySelector("#replyFollowup");
const continueLink = document.querySelector("#replyContinue");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = form.dataset.recipient?.trim().replace(/^@/, "");
  const message = reply.value.trim();

  if (!message) {
    savedNote.textContent = "Алдымен жауабыңызды жазыңыз ♡";
    reply.focus();
    return;
  }
  if (!/^[A-Za-z0-9_]{5,32}$/.test(username || "")) {
    savedNote.textContent = "Жауапты ашу мүмкін болмады. Кейінірек қайталап көріңіз.";
    return;
  }

  const messageUrl = new URL(`https://t.me/${username}`);
  messageUrl.searchParams.set("text", message);
  // Keep this page available for the next chapter; delivery is completed separately.
  const messageWindow = window.open("", "_blank");
  if (!messageWindow) {
    savedNote.textContent = "Терезе ашылмады. Қалқымалы терезеге рұқсат беріп, қайта басыңыз.";
    return;
  }
  messageWindow.opener = null;
  messageWindow.location.replace(messageUrl.toString());
  form.hidden = true;
  followup.hidden = false;
  savedNote.textContent = "Жауап мәтіні дайын. Ашылған терезеде жіберуді аяқтаңыз ♡";
  continueLink.focus({ preventScroll: true });
});

document.querySelector("#editReply").addEventListener("click", () => {
  followup.hidden = true;
  form.hidden = false;
  savedNote.textContent = "";
  reply.focus();
});

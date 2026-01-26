/* ==========================
   ELEMENTS
========================== */
const sendBtn = document.getElementById("sendBtn");
const msgInput = document.getElementById("msgInput");
const messagesBox = document.getElementById("messages");
const chatUser = document.getElementById("chatUser");
const chatItems = document.querySelectorAll(".chat-item");

/* ==========================
   STATE
========================== */
let currentChat = "Ansh Raj";
let selectedMessages = new Set();

/* ==========================
   INIT
========================== */
loadMessages();

/* ==========================
   SEND MESSAGE
========================== */
sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  const msg = {
    text,
    type: "sent",
    time: Date.now()
  };

  saveMessage(currentChat, msg);
  addMessageToUI(msg);

  msgInput.value = "";
  scrollBottom();
}

/* ==========================
   UI MESSAGE
========================== */
function addMessageToUI(msg, index = null) {
  const div = document.createElement("div");
  div.className = `msg ${msg.type}`;
  div.textContent = msg.text;

  div.onclick = () => toggleSelect(div, index);
  messagesBox.appendChild(div);
}

/* ==========================
   SELECT / DELETE
========================== */
function toggleSelect(el, index) {
  el.classList.toggle("selected");

  if (el.classList.contains("selected")) {
    selectedMessages.add(el);
  } else {
    selectedMessages.delete(el);
  }
}

document.addEventListener("keydown", e => {
  if (e.key === "Delete") deleteSelected();
});

function deleteSelected() {
  if (selectedMessages.size === 0) return;

  const msgs = getMessages(currentChat);
  const remaining = [];

  [...messagesBox.children].forEach((el, i) => {
    if (!selectedMessages.has(el)) {
      remaining.push(msgs[i]);
    }
  });

  localStorage.setItem(currentChat, JSON.stringify(remaining));
  selectedMessages.clear();
  loadMessages();
}

/* ==========================
   CHAT SWITCH
========================== */
chatItems.forEach(item => {
  item.addEventListener("click", () => {
    chatItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    currentChat = item.textContent;
    chatUser.textContent = currentChat;
    selectedMessages.clear();
    loadMessages();
  });
});

/* ==========================
   STORAGE
========================== */
function saveMessage(chat, msg) {
  const msgs = getMessages(chat);
  msgs.push(msg);
  localStorage.setItem(chat, JSON.stringify(msgs));
}

function getMessages(chat) {
  return JSON.parse(localStorage.getItem(chat)) || [];
}

function loadMessages() {
  messagesBox.innerHTML = "";
  const msgs = getMessages(currentChat);

  msgs.forEach((msg, i) => addMessageToUI(msg, i));
  scrollBottom();
}

/* ==========================
   UTILS
========================== */
function scrollBottom() {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

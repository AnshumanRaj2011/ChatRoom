const sendBtn = document.getElementById("sendBtn");
const msgInput = document.getElementById("msgInput");
const messagesBox = document.getElementById("messages");
const chatUser = document.getElementById("chatUser");
const chatItems = document.querySelectorAll(".chat-item");

let currentChat = "Ansh Raj";
let selectedMessages = new Set();

loadMessages();

/* SEND MESSAGE */
sendBtn.onclick = sendMessage;
msgInput.onkeypress = e => {
  if (e.key === "Enter") sendMessage();
};

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  const msg = { text, time: Date.now() };
  const msgs = getMessages(currentChat);
  msgs.push(msg);
  localStorage.setItem(currentChat, JSON.stringify(msgs));

  addMessage(msg);
  msgInput.value = "";
  scrollBottom();
}

/* LOAD MESSAGES */
function loadMessages() {
  messagesBox.innerHTML = "";
  selectedMessages.clear();

  const msgs = getMessages(currentChat);
  msgs.forEach((msg, index) => addMessage(msg, index));
  scrollBottom();
}

function addMessage(msg, index) {
  const div = document.createElement("div");
  div.className = "msg sent";
  div.textContent = msg.text;

  div.onclick = () => toggleSelect(div);
  messagesBox.appendChild(div);
}

/* SELECT / DELETE */
function toggleSelect(el) {
  el.classList.toggle("selected");
  el.classList.contains("selected")
    ? selectedMessages.add(el)
    : selectedMessages.delete(el);
}

document.addEventListener("keydown", e => {
  if (e.key === "Delete") deleteSelected();
});

function deleteSelected() {
  if (selectedMessages.size === 0) return;

  const msgs = getMessages(currentChat);
  const remaining = [];

  [...messagesBox.children].forEach((el, i) => {
    if (!selectedMessages.has(el)) remaining.push(msgs[i]);
  });

  localStorage.setItem(currentChat, JSON.stringify(remaining));
  loadMessages();
}

/* CHAT SWITCH */
chatItems.forEach(item => {
  item.onclick = () => {
    chatItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    currentChat = item.textContent;
    chatUser.textContent = currentChat;
    loadMessages();
  };
});

/* STORAGE */
function getMessages(chat) {
  return JSON.parse(localStorage.getItem(chat)) || [];
}

function scrollBottom() {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

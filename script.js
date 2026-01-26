import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase, ref, set, get, push, onChildAdded
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentUser = localStorage.getItem("user");
let currentChatUser = null;

/* DOM */
const auth = document.getElementById("auth");
const appDiv = document.getElementById("app");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

const search = document.getElementById("search");
const usersDiv = document.getElementById("users");

const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const messagesDiv = document.getElementById("messages");

/* AUTO LOGIN */
if (currentUser) {
  auth.style.display = "none";
  appDiv.style.display = "block";
}

/* REGISTER */
registerBtn.onclick = async () => {
  const u = usernameInput.value;
  const p = passwordInput.value;

  const snap = await get(ref(db, "users/" + u));
  if (snap.exists()) return alert("Username already exists");

  await set(ref(db, "users/" + u), { password: p });
  localStorage.setItem("user", u);
  location.reload();
};

/* LOGIN */
loginBtn.onclick = async () => {
  const u = usernameInput.value;
  const p = passwordInput.value;

  const snap = await get(ref(db, "users/" + u));
  if (!snap.exists()) return alert("User not found");

  if (snap.val().password !== p) return alert("Wrong password");

  localStorage.setItem("user", u);
  location.reload();
};

/* SEARCH USERS */
search.oninput = async () => {
  usersDiv.innerHTML = "";
  const snap = await get(ref(db, "users"));
  snap.forEach(child => {
    if (child.key.includes(search.value) && child.key !== currentUser) {
      const div = document.createElement("div");
      div.className = "user";
      div.textContent = child.key;
      div.onclick = () => openChat(child.key);
      usersDiv.appendChild(div);
    }
  });
};

/* CHAT */
function openChat(otherUser) {
  currentChatUser = otherUser;
  messagesDiv.innerHTML = "";

  const chatId = [currentUser, otherUser].sort().join("_");
  const chatRef = ref(db, "chats/" + chatId);

  onChildAdded(chatRef, snap => {
    const m = snap.val();
    const div = document.createElement("div");
    div.className = "message";
    div.textContent = `${m.from}: ${m.text}`;
    messagesDiv.appendChild(div);
  });
}

sendBtn.onclick = () => {
  if (!currentChatUser) return;

  const chatId = [currentUser, currentChatUser].sort().join("_");
  push(ref(db, "chats/" + chatId), {
    from: currentUser,
    text: msgInput.value,
    time: Date.now()
  });
  msgInput.value = "";
};

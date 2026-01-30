import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/* Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

/* Init Firebase */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const messagesRef = ref(db, "messages");

/* DOM */
const loginModal = document.getElementById("login-modal");
const chatContainer = document.getElementById("chat-container");
const usernameInput = document.getElementById("username-input");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const editBtn = document.getElementById("edit-btn");
const deleteBtn = document.getElementById("delete-btn");

/* State */
let username = localStorage.getItem("chat_username");
let currentUID = null;
const selectedKeys = new Set();

/* UI helpers */
function showLogin() {
  loginModal.style.display = "flex";
  chatContainer.classList.add("hidden");
}
function showChat() {
  loginModal.style.display = "none";
  chatContainer.classList.remove("hidden");
}

/* Anonymous Auth */
signInAnonymously(auth);

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUID = user.uid;
    username ? showChat() : showLogin();
  }
});

/* Username */
loginBtn.onclick = () => {
  const u = usernameInput.value.trim();
  if (u.length < 3) {
    alert("Username must be at least 3 characters");
    return;
  }
  localStorage.setItem("chat_username", u);
  username = u;
  showChat();
};

/* Logout */
logoutBtn.onclick = () => {
  localStorage.removeItem("chat_username");
  location.reload();
};

/* Load messages */
onChildAdded(messagesRef, (snapshot) => {
  const msg = snapshot.val();
  const key = snapshot.key;

  const div = document.createElement("div");
  div.className = "message";
  div.dataset.key = key;

  div.innerHTML = `
    <div class="message-user">
      ${msg.username}${msg.uid === currentUID ? " (You)" : ""}
    </div>
    <div>${msg.text}${msg.edited ? " (edited)" : ""}</div>
    <div class="message-time">${new Date(msg.time).toLocaleString()}</div>
  `;

  /* Owner-only select */
  div.onclick = () => {
    if (msg.uid !== currentUID) return;
    div.classList.toggle("selected");
    selectedKeys.has(key) ? selectedKeys.delete(key) : selectedKeys.add(key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* Remove message */
onChildRemoved(messagesRef, (snapshot) => {
  const el = document.querySelector(`[data-key="${snapshot.key}"]`);
  if (el) el.remove();
  selectedKeys.delete(snapshot.key);
});

/* Send message */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  push(messagesRef, {
    uid: currentUID,
    username: username,
    text: text,
    time: Date.now()
  });

  input.value = "";
});

/* Edit message */
editBtn.onclick = () => {
  if (selectedKeys.size !== 1) {
    alert("Select one of your messages");
    return;
  }

  const key = [...selectedKeys][0];
  const msgDiv = document.querySelector(`[data-key="${key}"]`);
  const oldText = msgDiv.children[1].textContent.replace(" (edited)", "");
  const newText = prompt("Edit message:", oldText);

  if (!newText || newText.trim() === oldText) return;

  update(ref(db, "messages/" + key), {
    text: newText.trim(),
    edited: true
  });

  selectedKeys.clear();
};

/* Delete message */
deleteBtn.onclick = () => {
  selectedKeys.forEach(key => {
    remove(ref(db, "messages/" + key));
  });
  selectedKeys.clear();
};

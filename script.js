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
const messagesRef = ref(db, "messages");

/* DOM */
const loginModal = document.getElementById("login-modal");
const chatContainer = document.getElementById("chat-container");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");

const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const editBtn = document.getElementById("edit-btn");
const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");

/* Login logic */
let username = localStorage.getItem("chat_user");
let password = localStorage.getItem("chat_pass");

function showLogin() {
  loginModal.style.display = "flex";
  chatContainer.classList.add("hidden");
}

function showChat() {
  loginModal.style.display = "none";
  chatContainer.classList.remove("hidden");
}

if (username && password && username.length > 0 && password.length > 0) {
  showChat();
} else {
  showLogin();
}

loginBtn.onclick = () => {
  const u = usernameInput.value.trim();
  const p = passwordInput.value.trim();

  if (u.length < 3 || p.length < 3) {
    alert("Username and password must be at least 3 characters");
    return;
  }

  localStorage.setItem("chat_user", u);
  localStorage.setItem("chat_pass", p);

  username = u;
  password = p;

  showChat();
};

/* Multi select */
const selectedKeys = new Set();

/* Load messages */
onChildAdded(messagesRef, (snapshot) => {
  const msg = snapshot.val();
  const key = snapshot.key;

  const div = document.createElement("div");
  div.className = "message";
  div.dataset.key = key;

  const userDiv = document.createElement("div");
  userDiv.className = "message-user";
  userDiv.textContent = msg.user;

  const textDiv = document.createElement("div");
  textDiv.textContent = msg.text + (msg.edited ? " (edited)" : "");

  const timeDiv = document.createElement("div");
  timeDiv.className = "message-time";
  timeDiv.textContent = new Date(msg.time).toLocaleString();

  div.appendChild(userDiv);
  div.appendChild(textDiv);
  div.appendChild(timeDiv);

  div.onclick = () => {
    div.classList.toggle("selected");
    selectedKeys.has(key) ? selectedKeys.delete(key) : selectedKeys.add(key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* Remove UI message */
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
    user: username,
    text: text,
    time: Date.now()
  });

  input.value = "";
});

/* Edit message */
editBtn.onclick = () => {
  if (selectedKeys.size !== 1) {
    alert("Select ONE message to edit");
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

/* Delete selected messages */
deleteBtn.onclick = () => {
  if (selectedKeys.size === 0) {
    alert("Select messages to delete");
    return;
  }

  selectedKeys.forEach(key => {
    remove(ref(db, "messages/" + key));
  });

  selectedKeys.clear();
};

/* Clear all messages */
clearBtn.onclick = () => {
  if (confirm("Delete ALL messages?")) {
    remove(messagesRef);
    messagesDiv.innerHTML = "";
    selectedKeys.clear();
  }
};

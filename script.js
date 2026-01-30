import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove,
  update,
  get,
  set
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/* Firebase */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const messagesRef = ref(db, "messages");

/* DOM */
const loginModal = document.getElementById("login-modal");
const usernameModal = document.getElementById("username-modal");
const chatContainer = document.getElementById("chat-container");

const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");
const logoutBtn = document.getElementById("logout-btn");

const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const editBtn = document.getElementById("edit-btn");
const deleteBtn = document.getElementById("delete-btn");

let currentUID = null;
let username = null;
const selectedKeys = new Set();

/* helpers */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* start clean */
hide(loginModal);
hide(usernameModal);
hide(chatContainer);

/* Google login */
googleLoginBtn.onclick = () => {
  signInWithRedirect(auth, provider);
};

getRedirectResult(auth).catch(() => {});

/* auth state */
onAuthStateChanged(auth, async (user) => {
  hide(loginModal);
  hide(usernameModal);
  hide(chatContainer);

  if (!user) {
    show(loginModal);
    return;
  }

  currentUID = user.uid;
  const snap = await get(ref(db, "users/" + currentUID + "/username"));

  if (snap.exists()) {
    username = snap.val();
    show(chatContainer);
  } else {
    show(usernameModal);
  }
});

/* save username */
saveUsernameBtn.onclick = async () => {
  const u = usernameInput.value.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,}$/.test(u)) {
    alert("Invalid username");
    return;
  }

  const lock = ref(db, "usernames/" + u);
  if ((await get(lock)).exists()) {
    alert("Username already taken");
    return;
  }

  await set(lock, currentUID);
  await set(ref(db, "users/" + currentUID), { username: u });

  username = u;
  hide(usernameModal);
  show(chatContainer);
};

/* logout */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

/* messages */
onChildAdded(messagesRef, snap => {
  const msg = snap.val();
  const key = snap.key;

  const div = document.createElement("div");
  div.className = "message";
  div.dataset.key = key;

  div.innerHTML = `
    <div class="message-user">${msg.username}${msg.uid === currentUID ? " (You)" : ""}</div>
    <div>${msg.text}${msg.edited ? " (edited)" : ""}</div>
    <div class="message-time">${new Date(msg.time).toLocaleString()}</div>
  `;

  div.onclick = () => {
    if (msg.uid !== currentUID) return;
    div.classList.toggle("selected");
    selectedKeys.has(key) ? selectedKeys.delete(key) : selectedKeys.add(key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

onChildRemoved(messagesRef, snap => {
  const el = document.querySelector(`[data-key="${snap.key}"]`);
  if (el) el.remove();
});

/* send */
form.addEventListener("submit", e => {
  e.preventDefault();
  if (!input.value.trim()) return;

  push(messagesRef, {
    uid: currentUID,
    username,
    text: input.value.trim(),
    time: Date.now()
  });

  input.value = "";
});

/* edit */
editBtn.onclick = () => {
  if (selectedKeys.size !== 1) return;
  const key = [...selectedKeys][0];
  const msg = document.querySelector(`[data-key="${key}"]`);
  const oldText = msg.children[1].textContent.replace(" (edited)", "");
  const newText = prompt("Edit message", oldText);
  if (!newText) return;

  update(ref(db, "messages/" + key), { text: newText, edited: true });
  selectedKeys.clear();
};

/* delete */
deleteBtn.onclick = () => {
  selectedKeys.forEach(key => remove(ref(db, "messages/" + key)));
  selectedKeys.clear();
};

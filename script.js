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

/* 🔥 Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

/* Init */
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

/* State */
let currentUID = null;
let username = null;
const selectedKeys = new Set();

/* Helpers */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* Google Login (REDIRECT – required for GitHub Pages) */
googleLoginBtn.onclick = () => {
  signInWithRedirect(auth, provider);
};

/* Handle redirect result (important) */
getRedirectResult(auth).catch((error) => {
  console.error("Google login redirect error:", error);
});

/* Auth state */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUID = user.uid;

  const usernameRef = ref(db, "users/" + currentUID + "/username");
  const snap = await get(usernameRef);

  if (snap.exists()) {
    username = snap.val();
    hide(loginModal);
    hide(usernameModal);
    show(chatContainer);
  } else {
    hide(loginModal);
    show(usernameModal);
  }
});

/* Save username (NO SPACES + UNIQUE) */
saveUsernameBtn.onclick = async () => {
  let u = usernameInput.value.trim().toLowerCase();

  // only letters, numbers, underscore
  if (!/^[a-z0-9_]{3,}$/.test(u)) {
    alert(
      "Username must be at least 3 characters.\n" +
      "Only letters, numbers, and underscore (_).\n" +
      "No spaces allowed."
    );
    return;
  }

  const lockRef = ref(db, "usernames/" + u);
  const snap = await get(lockRef);

  if (snap.exists()) {
    alert("Username already taken. Choose another.");
    return;
  }

  // lock username globally
  await set(lockRef, currentUID);

  // save user profile
  await set(ref(db, "users/" + currentUID), {
    username: u
  });

  username = u;
  hide(usernameModal);
  show(chatContainer);
};

/* Logout */
logoutBtn.onclick = async () => {
  await signOut(auth);
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
  if (selectedKeys.size !== 1) return;

  const key = [...selectedKeys][0];
  const msgDiv = document.querySelector(`[data-key="${key}"]`);
  const oldText = msgDiv.children[1].textContent.replace(" (edited)", "");

  const newText = prompt("Edit message:", oldText);
  if (!newText || newText === oldText) return;

  update(ref(db, "messages/" + key), {
    text: newText,
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

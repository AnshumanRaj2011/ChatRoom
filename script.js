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

/* ===============================
   FIREBASE CONFIG
   =============================== */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

/* ===============================
   INIT
   =============================== */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const messagesRef = ref(db, "messages");

/* ===============================
   DOM
   =============================== */
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

/* ===============================
   STATE
   =============================== */
let currentUID = null;
let currentUsername = null;
const selectedKeys = new Set();

/* ===============================
   HELPERS
   =============================== */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* ===============================
   INITIAL UI
   =============================== */
show(loginModal);
hide(usernameModal);
hide(chatContainer);

/* ===============================
   GOOGLE LOGIN
   =============================== */
googleLoginBtn.onclick = () => {
  signInWithRedirect(auth, provider);
};

/* Needed for redirect flow */
getRedirectResult(auth).catch(() => {});

/* ===============================
   AUTH STATE
   =============================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    show(loginModal);
    hide(usernameModal);
    hide(chatContainer);
    return;
  }

  currentUID = user.uid;
  hide(loginModal);

  const userSnap = await get(ref(db, "users/" + currentUID));

  if (userSnap.exists()) {
    currentUsername = userSnap.val().username;
    hide(usernameModal);
    show(chatContainer);
  } else {
    show(usernameModal);
    hide(chatContainer);
  }
});

/* ===============================
   SAVE USERNAME (NEW USER)
   =============================== */
saveUsernameBtn.onclick = async () => {
  const u = usernameInput.value.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,}$/.test(u)) {
    alert("Username must be at least 3 characters and contain no spaces.");
    return;
  }

  const lockRef = ref(db, "usernames/" + u);
  if ((await get(lockRef)).exists()) {
    alert("Username already taken");
    return;
  }

  await set(lockRef, currentUID);
  await set(ref(db, "users/" + currentUID), { username: u });

  currentUsername = u;
  hide(usernameModal);
  show(chatContainer);
};

/* ===============================
   LOGOUT
   =============================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

/* ===============================
   LOAD MESSAGES
   =============================== */
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
    selectedKeys.has(key)
      ? selectedKeys.delete(key)
      : selectedKeys.add(key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* ===============================
   REMOVE MESSAGE FROM UI
   =============================== */
onChildRemoved(messagesRef, (snapshot) => {
  const el = document.querySelector(`[data-key="${snapshot.key}"]`);
  if (el) el.remove();
  selectedKeys.delete(snapshot.key);
});

/* ===============================
   SEND MESSAGE
   =============================== */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  push(messagesRef, {
    uid: currentUID,
    username: currentUsername,
    text: text,
    time: Date.now()
  });

  input.value = "";
});

/* ===============================
   EDIT MESSAGE (OWN ONLY)
   =============================== */
editBtn.onclick = () => {
  if (selectedKeys.size !== 1) {
    alert("Select exactly one of your messages to edit");
    return;
  }

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

/* ===============================
   DELETE MESSAGE (OWN ONLY)
   =============================== */
deleteBtn.onclick = () => {
  if (selectedKeys.size === 0) {
    alert("Select your messages to delete");
    return;
  }

  selectedKeys.forEach(key => {
    remove(ref(db, "messages/" + key));
  });

  selectedKeys.clear();
};

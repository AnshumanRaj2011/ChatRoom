import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* 🔥 CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

/* INIT */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const provider = new GoogleAuthProvider();
const messagesRef = ref(db, "messages");

const adminEmail = "nibha120416@gmail.com"; // 👑 CHANGE THIS

/* UI */
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const messagesDiv = document.getElementById("messages");
const userName = document.getElementById("user-name");

const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");

let currentUser = null;
const selected = new Set();

/* LOGIN */
document.getElementById("google-login").onclick = () =>
  signInWithPopup(auth, provider);

document.getElementById("logout").onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    userName.textContent =
      user.displayName +
      (user.email === adminEmail ? " 👑" : "");

    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
  } else {
    loginScreen.classList.remove("hidden");
    chatScreen.classList.add("hidden");
  }
});

/* LOAD MESSAGES */
onChildAdded(messagesRef, snap => {
  const m = snap.val();
  const div = document.createElement("div");
  div.className =
    "message " + (m.uid === currentUser?.uid ? "mine" : "other");
  div.dataset.key = snap.key;

  div.innerHTML = `
    <div>${m.text}</div>
    <div class="time">${new Date(m.time).toLocaleString()}</div>
  `;

  div.onclick = () => {
    if (m.uid !== currentUser.uid && currentUser.email !== adminEmail)
      return;

    div.classList.toggle("selected");
    div.classList.contains("selected")
      ? selected.add(snap.key)
      : selected.delete(snap.key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* REMOVE UI */
onChildRemoved(messagesRef, snap => {
  document.querySelector(`[data-key="${snap.key}"]`)?.remove();
});

/* SEND */
document.getElementById("message-form").onsubmit = e => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  if (!input.value) return;

  push(messagesRef, {
    text: input.value,
    uid: currentUser.uid,
    name: currentUser.displayName,
    time: Date.now()
  });

  input.value = "";
};

/* DELETE SELECTED */
deleteBtn.onclick = () => {
  selected.forEach(k => remove(ref(db, "messages/" + k)));
  selected.clear();
};

/* ADMIN CLEAR */
clearBtn.onclick = () => {
  if (currentUser.email === adminEmail && confirm("Clear all?")) {
    remove(messagesRef);
  }
};  }
};

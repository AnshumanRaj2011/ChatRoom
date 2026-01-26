import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

/* INIT */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();
const messagesRef = ref(db, "messages");

/* DOM */
const loginScreen = document.getElementById("login-screen");
const chatContainer = document.getElementById("chat-container");
const googleLoginBtn = document.getElementById("google-login");
const logoutBtn = document.getElementById("logout");

const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userUid = document.getElementById("user-uid");
const userPhoto = document.getElementById("user-photo");

const newNameInput = document.getElementById("new-name");
const updateNameBtn = document.getElementById("update-name");

const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");

let selectedKeys = new Set();

/* LOGIN */
googleLoginBtn.onclick = () => signInWithPopup(auth, provider);

/* LOGOUT */
logoutBtn.onclick = () => signOut(auth);

/* AUTH STATE */
onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = "none";
    chatContainer.style.display = "block";

    userName.textContent = user.displayName || "User";
    userEmail.textContent = user.email;
    userUid.textContent = "UID: " + user.uid;

    // FREE profile photo (Google or fallback)
    userPhoto.src =
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${user.displayName}`;

  } else {
    loginScreen.style.display = "block";
    chatContainer.style.display = "none";
  }
});

/* UPDATE DISPLAY NAME */
updateNameBtn.onclick = async () => {
  const newName = newNameInput.value.trim();
  if (!newName) return alert("Enter a name");

  await updateProfile(auth.currentUser, { displayName: newName });
  userName.textContent = newName;
  newNameInput.value = "";
};

/* LOAD MESSAGES */
onChildAdded(messagesRef, snap => {
  const m = snap.val();
  const div = document.createElement("div");
  div.className = "message";
  div.dataset.key = snap.key;

  div.innerHTML = `
    <b>${m.user}</b>: ${m.text}
    <div class="time">${new Date(m.time).toLocaleString()}</div>
  `;

  div.onclick = () => {
    div.classList.toggle("selected");
    div.classList.contains("selected")
      ? selectedKeys.add(snap.key)
      : selectedKeys.delete(snap.key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* REMOVE MESSAGE FROM UI */
onChildRemoved(messagesRef, snap => {
  document.querySelector(`[data-key="${snap.key}"]`)?.remove();
});

/* SEND MESSAGE */
form.onsubmit = e => {
  e.preventDefault();
  if (!input.value.trim()) return;

  push(messagesRef, {
    text: input.value,
    user: auth.currentUser.displayName,
    time: Date.now()
  });

  input.value = "";
};

/* DELETE SELECTED */
deleteBtn.onclick = () => {
  selectedKeys.forEach(k => remove(ref(db, "messages/" + k)));
  selectedKeys.clear();
};

/* CLEAR ALL */
clearBtn.onclick = () => {
  if (confirm("Delete all messages?")) remove(messagesRef);
};

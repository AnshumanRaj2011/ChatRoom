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
  remove,
  set,
  get
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* CONFIG */
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
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();
const messagesRef = ref(db, "messages");

/* DOM */
const loginScreen = document.getElementById("login-screen");
const chatContainer = document.getElementById("chat-container");
const profilePage = document.getElementById("profile-page");

const profileIcon = document.getElementById("profile-icon");
const googleLoginBtn = document.getElementById("google-login");
const logoutBtn = document.getElementById("logout");

const messagesDiv = document.getElementById("messages");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");

const nameInput = document.getElementById("display-name-input");
const birthdayInput = document.getElementById("birthday-input");
const saveProfileBtn = document.getElementById("save-profile");
const closeProfileBtn = document.getElementById("close-profile");

let selected = new Set();

/* LOGIN */
googleLoginBtn.onclick = () => signInWithPopup(auth, provider);

/* AUTH */
onAuthStateChanged(auth, async user => {
  if (user) {
    loginScreen.style.display = "none";
    chatContainer.style.display = "flex";

    profileIcon.src =
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${user.displayName}`;

    nameInput.value = user.displayName || "";

    const snap = await get(ref(db, "users/" + user.uid));
    if (snap.exists()) birthdayInput.value = snap.val().birthday || "";
  } else {
    loginScreen.style.display = "flex";
    chatContainer.style.display = "none";
  }
});

/* PROFILE */
profileIcon.onclick = () => profilePage.style.display = "flex";
closeProfileBtn.onclick = () => profilePage.style.display = "none";

saveProfileBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  await updateProfile(user, { displayName: nameInput.value });
  await set(ref(db, "users/" + user.uid), { birthday: birthdayInput.value });

  alert("Updated");
};

logoutBtn.onclick = () => signOut(auth);

/* CHAT */
onChildAdded(messagesRef, snap => {
  const m = snap.val();
  const div = document.createElement("div");
  div.className = "message" + (m.user === auth.currentUser.displayName ? " me" : "");
  div.textContent = `${m.user}: ${m.text}`;
  div.dataset.key = snap.key;

  div.onclick = () => {
    div.classList.toggle("selected");
    div.classList.contains("selected")
      ? selected.add(snap.key)
      : selected.delete(snap.key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

onChildRemoved(messagesRef, snap => {
  document.querySelector(`[data-key="${snap.key}"]`)?.remove();
});

/* SEND */
sendBtn.onclick = () => {
  if (!input.value.trim()) return;

  push(messagesRef, {
    text: input.value,
    user: auth.currentUser.displayName,
    time: Date.now()
  });

  input.value = "";
};

/* DELETE */
deleteBtn.onclick = () => {
  selected.forEach(k => remove(ref(db, "messages/" + k)));
  selected.clear();
};

/* CLEAR */
clearBtn.onclick = () => {
  if (confirm("Clear chat?")) remove(messagesRef);
};

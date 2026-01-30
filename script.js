import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase, ref, push, onChildAdded,
  remove, update, get, set
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithRedirect, getRedirectResult,
  onAuthStateChanged, signOut
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

/* State */
let currentUID = null;
let username = null;

/* helpers */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* INITIAL STATE — ALWAYS SHOW LOGIN */
show(loginModal);
hide(usernameModal);
hide(chatContainer);

/* Google login */
googleLoginBtn.onclick = () => {
  signInWithRedirect(auth, provider);
};

/* Required for redirect */
getRedirectResult(auth).catch(() => {});

/* AUTH STATE */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    show(loginModal);
    hide(usernameModal);
    hide(chatContainer);
    return;
  }

  // Logged in
  currentUID = user.uid;
  hide(loginModal);

  const snap = await get(ref(db, "users/" + currentUID));

  if (snap.exists()) {
    username = snap.val().username;
    hide(usernameModal);
    show(chatContainer);
  } else {
    show(usernameModal);
  }
});

/* SAVE USERNAME */
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

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

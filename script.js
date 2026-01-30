import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase, ref, get, set
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/* Firebase config */
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

/* DOM */
const loginModal = document.getElementById("login-modal");
const usernameModal = document.getElementById("username-modal");
const chatContainer = document.getElementById("chat-container");

const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");
const logoutBtn = document.getElementById("logout-btn");

/* helpers */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* INITIAL STATE */
show(loginModal);
hide(usernameModal);
hide(chatContainer);

/* Login button */
googleLoginBtn.onclick = () => {
  signInWithRedirect(auth, provider);
};

/* 🔥 IMPORTANT: wait for redirect result FIRST */
getRedirectResult(auth)
  .then(() => {
    // After redirect result, auth state will be correct
  })
  .catch(err => {
    console.error("Redirect error:", err);
  });

/* Auth state listener */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Not logged in
    show(loginModal);
    hide(usernameModal);
    hide(chatContainer);
    return;
  }

  // Logged in
  hide(loginModal);

  const uid = user.uid;
  const snap = await get(ref(db, "users/" + uid));

  if (snap.exists()) {
    // Old user → chat
    hide(usernameModal);
    show(chatContainer);
  } else {
    // New user → ask username
    show(usernameModal);
    hide(chatContainer);
  }
});

/* Save username */
saveUsernameBtn.onclick = async () => {
  const u = usernameInput.value.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,}$/.test(u)) {
    alert("Invalid username");
    return;
  }

  const lockRef = ref(db, "usernames/" + u);
  const lockSnap = await get(lockRef);
  if (lockSnap.exists()) {
    alert("Username already taken");
    return;
  }

  const uid = auth.currentUser.uid;

  await set(lockRef, uid);
  await set(ref(db, "users/" + uid), { username: u });

  hide(usernameModal);
  show(chatContainer);
};

/* Logout */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

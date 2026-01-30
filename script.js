import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
   INIT APP
   =============================== */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ===============================
   SCREENS
   =============================== */
const screens = {
  login: document.getElementById("screen-login"),
  username: document.getElementById("screen-username"),
  home: document.getElementById("screen-home")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ===============================
   DOM
   =============================== */
const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");
const logoutBtn = document.getElementById("btn-logout");

/* ===============================
   STATE
   =============================== */
let currentUID = null;

/* ===============================
   INITIAL UI
   =============================== */
showScreen("login");

/* ===============================
   GOOGLE LOGIN (POPUP – STABLE)
   =============================== */
googleLoginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert(err.message);
  }
};

/* ===============================
   AUTH STATE
   =============================== */
onAuthStateChanged(auth, async user => {
  if (!user) {
    showScreen("login");
    return;
  }

  currentUID = user.uid;
  const userRef = ref(db, "users/" + currentUID);
  const snap = await get(userRef);

  if (snap.exists()) {
    // Existing user
    showScreen("home");
  } else {
    // New user
    showScreen("username");
  }
});

/* ===============================
   SAVE USERNAME (UNIQUE)
   =============================== */
saveUsernameBtn.onclick = async () => {
  const username = usernameInput.value.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,}$/.test(username)) {
    alert("Username must be at least 3 characters and contain no spaces");
    return;
  }

  const lockRef = ref(db, "usernames/" + username);
  if ((await get(lockRef)).exists()) {
    alert("Username already taken");
    return;
  }

  await set(lockRef, currentUID);
  await set(ref(db, "users/" + currentUID), {
    username
  });

  showScreen("home");
};

/* ===============================
   LOGOUT
   =============================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  showScreen("login");
};

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

/* ===============================
   SCREENS
   =============================== */
const screens = {
  login: document.getElementById("screen-login"),
  username: document.getElementById("screen-username"),
  home: document.getElementById("screen-home"),
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
let currentUsername = null;

/* ===============================
   INITIAL STATE
   =============================== */
showScreen("login");

/* ===============================
   GOOGLE LOGIN
   =============================== */
googleLoginBtn.onclick = () => {
  signInWithRedirect(auth, provider);
};

/* Required for redirect flow */
getRedirectResult(auth).catch(() => {});

/* ===============================
   AUTH STATE HANDLER
   =============================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showScreen("login");
    return;
  }

  // Logged in
  currentUID = user.uid;

  const userRef = ref(db, "users/" + currentUID);
  const snap = await get(userRef);

  if (snap.exists()) {
    // Existing user
    currentUsername = snap.val().username;
    showScreen("home");
  } else {
    // New user
    showScreen("username");
  }
});

/* ===============================
   SAVE USERNAME (NEW USER)
   =============================== */
saveUsernameBtn.onclick = async () => {
  const username = usernameInput.value.trim().toLowerCase();

  // validation
  if (!/^[a-z0-9_]{3,}$/.test(username)) {
    alert(
      "Username must be at least 3 characters\n" +
      "Only letters, numbers, underscore (_)\n" +
      "No spaces allowed"
    );
    return;
  }

  const usernameLockRef = ref(db, "usernames/" + username);
  const lockSnap = await get(usernameLockRef);

  if (lockSnap.exists()) {
    alert("Username already taken");
    return;
  }

  // Save username
  await set(usernameLockRef, currentUID);
  await set(ref(db, "users/" + currentUID), {
    username: username
  });

  currentUsername = username;
  showScreen("home");
};

/* ===============================
   LOGOUT
   =============================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

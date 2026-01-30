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
  home: document.getElementById("screen-home"),
  search: document.getElementById("screen-search")
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

const btnSearch = document.getElementById("btn-search");
const btnBackSearch = document.getElementById("btn-back-search");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

/* ===============================
   STATE
   =============================== */
let currentUID = null;

/* ===============================
   INITIAL UI
   =============================== */
showScreen("login");

/* ===============================
   GOOGLE LOGIN (POPUP)
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
    showScreen("home");
  } else {
    showScreen("username");
  }
});

/* ===============================
   SAVE USERNAME (NEW USER)
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
  await set(ref(db, "users/" + currentUID), { username });

  showScreen("home");
};

/* ===============================
   LOGOUT
   =============================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  showScreen("login");
};

/* ===============================
   NAVIGATION: HOME ↔ SEARCH
   =============================== */
btnSearch.onclick = () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
  showScreen("search");
};

btnBackSearch.onclick = () => {
  showScreen("home");
};

/* ===============================
   SEARCH USERS BY USERNAME
   =============================== */
searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (query.length < 2) return;

  const snap = await get(ref(db, "usernames"));

  if (!snap.exists()) {
    searchResults.innerHTML = `<p class="empty-text">No users found</p>`;
    return;
  }

  let found = false;

  snap.forEach(child => {
    const username = child.key;
    const uid = child.val();

    if (!username.includes(query)) return;

    found = true;

    if (uid === currentUID) {
      const selfDiv = document.createElement("div");
      selfDiv.className = "list-item";
      selfDiv.innerHTML = `<span>@${username}</span><span>That’s you 🙂</span>`;
      searchResults.appendChild(selfDiv);
      return;
    }

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <span>@${username}</span>
      <button class="primary-btn" disabled>Add</button>
    `;

    searchResults.appendChild(div);
  });

  if (!found) {
    searchResults.innerHTML = `
      <p class="empty-text">No matching users found</p>
    `;
  }
});

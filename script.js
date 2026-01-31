import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  onValue,
  remove,
  off
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
  search: document.getElementById("screen-search"),
  requests: document.getElementById("screen-requests")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ===============================
   DOM
   =============================== */
const friendsList = document.getElementById("friends-list");
const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");
const logoutBtn = document.getElementById("btn-logout");

const btnSearch = document.getElementById("btn-search");
const btnBackSearch = document.getElementById("btn-back-search");

const btnRequests = document.getElementById("btn-requests");
const btnBackRequests = document.getElementById("btn-back-requests");

const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const requestList = document.getElementById("request-list");

/* ===============================
   STATE
   =============================== */
let currentUID = null;
let requestsListenerRef = null;
let friendsListenerRef = null;

/* ===============================
   START
   =============================== */
showScreen("login");

/* ===============================
   GOOGLE LOGIN
   =============================== */
googleLoginBtn.onclick = async () => {
  await signInWithPopup(auth, provider);
};

/* ===============================
   AUTH STATE
   =============================== */
onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUID = null;
    showScreen("login");
    return;
  }

  currentUID = user.uid;
  const snap = await get(ref(db, "users/" + currentUID));

  if (snap.exists()) {
    showScreen("home");
    loadFriends();
  } else {
    showScreen("username");
  }
});

/* ===============================
   SAVE USERNAME
   =============================== */
saveUsernameBtn.onclick = async () => {
  const username = usernameInput.value.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,}$/.test(username)) {
    alert("Invalid username");
    return;
  }

  const nameRef = ref(db, "usernames/" + username);
  if ((await get(nameRef)).exists()) {
    alert("Username already taken");
    return;
  }

  await set(nameRef, currentUID);
  await set(ref(db, "users/" + currentUID), { username });

  showScreen("home");
  loadFriends();
};

/* ===============================
   LOGOUT
   =============================== */
logoutBtn.onclick = async () => {
  if (requestsListenerRef) off(requestsListenerRef);
  if (friendsListenerRef) off(friendsListenerRef);
  await signOut(auth);
  showScreen("login");
};

/* ===============================
   NAVIGATION
   =============================== */
btnSearch.onclick = () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
  showScreen("search");
};

btnBackSearch.onclick = () => showScreen("home");

btnRequests.onclick = () => {
  showScreen("requests");
  loadRequests();
};

btnBackRequests.onclick = () => showScreen("home");

/* ===============================
   SEARCH USERS (FIXED)
   =============================== */

    searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (query.length < 2) {
    searchResults.innerHTML = `<p class="empty-text">Type at least 2 letters</p>`;
    return;
  }

  const usernamesSnap = await get(ref(db, "usernames"));
  if (!usernamesSnap.exists()) {
    searchResults.innerHTML = `<p class="empty-text">No users found</p>`;
    return;
  }

  let friends = {};
try {
  const friendsSnap = await get(ref(db, `friends/${currentUID}`));
  friends = friendsSnap.exists() ? friendsSnap.val() : {};
} catch (e) {
  friends = {}; // no friends yet OR no permission
}
  let found = false;

  for (const username of Object.keys(usernamesSnap.val())) {
    if (!username.includes(query)) continue;

    const uid = usernamesSnap.val()[username];

    // 🔒 SAFE blocked check (NEVER break search)
    let isBlocked = false;
    try {
      const blockedSnap = await get(ref(db, `blocked/${uid}/${currentUID}`));
      isBlocked = blockedSnap.exists();
    } catch (e) {
      isBlocked = false; // no permission → treat as not blocked
    }
    if (isBlocked) continue;

    found = true;

    const div = document.createElement("div");
    div.className = "list-item";

    // 👤 yourself
    if (uid === currentUID) {
      div.innerHTML = `<span>@${username}</span><span>That’s you 🙂</span>`;
      searchResults.appendChild(div);
      continue;
    }

    // 👥 already friend
    if (friends && friends[uid]) {
      div.innerHTML = `<span>@${username}</span><span>Friends ✓</span>`;
      searchResults.appendChild(div);
      continue;
    }

    // ➕ add friend
    const addBtn = document.createElement("button");
    addBtn.className = "primary-btn";
    addBtn.textContent = "Add";

    addBtn.onclick = async () => {
      await set(ref(db, `friend_requests/${uid}/${currentUID}`), {
        time: Date.now()
      });
      addBtn.textContent = "Sent";
      addBtn.disabled = true;
    };

    div.innerHTML = `<span>@${username}</span>`;
    div.appendChild(addBtn);
    searchResults.appendChild(div);
  }

  if (!found) {
    searchResults.innerHTML = `<p class="empty-text">No matching users</p>`;
  }
});

/* ===============================
   LOAD REQUESTS
   =============================== */
function loadRequests() {
  requestList.innerHTML = "";
  if (!currentUID) return;

  if (requestsListenerRef) off(requestsListenerRef);
  requestsListenerRef = ref(db, "friend_requests/" + currentUID);

  onValue(requestsListenerRef, async snap => {
    requestList.innerHTML = "";
    if (!snap.exists()) {
      requestList.innerHTML = `<p class="empty-text">No requests</p>`;
      return;
    }

    for (const fromUID of Object.keys(snap.val())) {
      const userSnap = await get(ref(db, "users/" + fromUID));
      if (!userSnap.exists()) continue;

      const username = userSnap.val().username;
      const div = document.createElement("div");
      div.className = "list-item";

      const acceptBtn = document.createElement("button");
      acceptBtn.className = "primary-btn";
      acceptBtn.textContent = "Accept";

      acceptBtn.onclick = async () => {
        await set(ref(db, `friends/${currentUID}/${fromUID}`), true);
        await set(ref(db, `friends/${fromUID}/${currentUID}`), true);
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
        await remove(ref(db, `friend_requests/${fromUID}/${currentUID}`));
        loadFriends();
      };

      div.innerHTML = `<span>@${username}</span>`;
      div.appendChild(acceptBtn);
      requestList.appendChild(div);
    }
  });
}

/* ===============================
   LOAD FRIENDS
   =============================== */
function loadFriends() {
  friendsList.innerHTML = "";
  if (!currentUID) return;

  if (friendsListenerRef) off(friendsListenerRef);
  friendsListenerRef = ref(db, "friends/" + currentUID);

  onValue(friendsListenerRef, async snap => {
    friendsList.innerHTML = "";
    if (!snap.exists()) {
      friendsList.innerHTML = `<p class="empty-text">No friends yet</p>`;
      return;
    }

    for (const friendUID of Object.keys(snap.val())) {
      const userSnap = await get(ref(db, "users/" + friendUID));
      if (!userSnap.exists()) continue;

      const username = userSnap.val().username;
      const div = document.createElement("div");
      div.className = "list-item";

      const removeBtn = document.createElement("button");
      removeBtn.className = "primary-btn";
      removeBtn.textContent = "Remove";

      removeBtn.onclick = async () => {
        await remove(ref(db, `friends/${currentUID}/${friendUID}`));
        await remove(ref(db, `friends/${friendUID}/${currentUID}`));
        await remove(ref(db, `friend_requests/${currentUID}/${friendUID}`));
        await remove(ref(db, `friend_requests/${friendUID}/${currentUID}`));
      };

      div.innerHTML = `<span>@${username}</span>`;
      div.appendChild(removeBtn);
      friendsList.appendChild(div);
    }
  });
}

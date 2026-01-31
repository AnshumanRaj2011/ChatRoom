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
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert(e.message);
  }
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
    alert("Username must be at least 3 characters");
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
   SEARCH USERS (BLOCK SAFE)
   =============================== */
searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";
  if (query.length < 2) return;

  const snap = await get(ref(db, "usernames"));
  if (!snap.exists()) return;

  snap.forEach(async child => {
    const username = child.key;
    const uid = child.val();

    if (!username.includes(query)) return;

    // block check
    if ((await get(ref(db, `blocked/${uid}/${currentUID}`))).exists()) return;

    const div = document.createElement("div");
    div.className = "list-item";

    if (uid === currentUID) {
      div.innerHTML = `<span>@${username}</span><span>You</span>`;
      searchResults.appendChild(div);
      return;
    }

    const addBtn = document.createElement("button");
    addBtn.className = "primary-btn";
    addBtn.textContent = "Add";

    addBtn.onclick = async () => {
      if ((await get(ref(db, `blocked/${uid}/${currentUID}`))).exists()) {
        alert("You cannot send request");
        return;
      }
      await set(ref(db, `friend_requests/${uid}/${currentUID}`), {
        time: Date.now()
      });
      addBtn.textContent = "Sent";
      addBtn.disabled = true;
    };

    div.innerHTML = `<span>@${username}</span>`;
    div.appendChild(addBtn);
    searchResults.appendChild(div);
  });
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
    if (!snap.exists()) return;

    snap.forEach(async child => {
      const fromUID = child.key;
      const userSnap = await get(ref(db, "users/" + fromUID));
      if (!userSnap.exists()) return;

      const username = userSnap.val().username;
      const div = document.createElement("div");
      div.className = "list-item";

      const acceptBtn = document.createElement("button");
      acceptBtn.className = "primary-btn";
      acceptBtn.textContent = "Accept";

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "primary-btn";
      rejectBtn.textContent = "Reject";

      acceptBtn.onclick = async () => {
        await set(ref(db, `friends/${currentUID}/${fromUID}`), true);
        await set(ref(db, `friends/${fromUID}/${currentUID}`), true);
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
        loadFriends();
      };

      rejectBtn.onclick = async () => {
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
      };

      div.innerHTML = `<span>@${username}</span>`;
      div.appendChild(acceptBtn);
      div.appendChild(rejectBtn);
      requestList.appendChild(div);
    });
  });
}

/* ===============================
   LOAD FRIENDS + REMOVE / BLOCK
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

      const blockBtn = document.createElement("button");
      blockBtn.className = "primary-btn";
      blockBtn.textContent = "Block";

      removeBtn.onclick = async () => {
        await remove(ref(db, `friends/${currentUID}/${friendUID}`));
        await remove(ref(db, `friends/${friendUID}/${currentUID}`));
      };

      blockBtn.onclick = async () => {
        await remove(ref(db, `friends/${currentUID}/${friendUID}`));
        await remove(ref(db, `friends/${friendUID}/${currentUID}`));
        await set(ref(db, `blocked/${currentUID}/${friendUID}`), true);
      };

      div.innerHTML = `<span>@${username}</span>`;
      div.appendChild(removeBtn);
      div.appendChild(blockBtn);
      friendsList.appendChild(div);
    }
  });
}

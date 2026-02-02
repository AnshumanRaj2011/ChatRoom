import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  set,
  push,
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

/* ================= FIREBASE ================= */
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

/* ================= SCREENS ================= */
const screens = {
  login: document.getElementById("screen-login"),
  username: document.getElementById("screen-username"),
  home: document.getElementById("screen-home"),
  search: document.getElementById("screen-search"),
  requests: document.getElementById("screen-requests"),
  chat: document.getElementById("screen-chat")
};
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ================= DOM ================= */
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

/* CHAT DOM */
const chatUsername = document.getElementById("chat-username");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const btnBackChat = document.getElementById("btn-back-chat");

/* BADGE DOM */
const requestsBadge = document.getElementById("requests-badge");

/* ================= STATE ================= */
let currentUID = null;
let friendsListenerRef = null;
let requestsListenerRef = null;
let requestsCountListenerRef = null;

/* CHAT STATE */
let currentChatUID = null;
let chatListenerRef = null;

/* ================= START ================= */
showScreen("login");

/* ================= LOGIN ================= */
googleLoginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Sign in failed", err);
  }
});

/* ================= AUTH ================= */
onAuthStateChanged(auth, async user => {
  // cleanup first on sign-out
  if (!user) {
    currentUID = null;
    if (friendsListenerRef) off(friendsListenerRef);
    if (requestsListenerRef) off(requestsListenerRef);
    if (requestsCountListenerRef) off(requestsCountListenerRef);
    updateRequestsBadge(0);
    showScreen("login");
    return;
  }

  currentUID = user.uid;

  try {
    const snap = await get(ref(db, "users/" + currentUID));
    if (snap.exists()) {
      showScreen("home");
      loadFriends();
      watchRequestCount();
    } else {
      showScreen("username");
    }
  } catch (err) {
    console.error("Auth state handling failed", err);
  }
});

/* ================= USERNAME ================= */
saveUsernameBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,}$/.test(username)) {
    alert("Invalid username");
    return;
  }

  try {
    const nameRef = ref(db, "usernames/" + username);
    if ((await get(nameRef)).exists()) {
      alert("Username already taken");
      return;
    }

    await set(nameRef, currentUID);
    await set(ref(db, "users/" + currentUID), { username });

    showScreen("home");
    loadFriends();
    watchRequestCount();
  } catch (err) {
    console.error("Saving username failed", err);
  }
});

/* ================= LOGOUT ================= */
logoutBtn.addEventListener("click", async () => {
  try {
    if (friendsListenerRef) off(friendsListenerRef);
    if (requestsListenerRef) off(requestsListenerRef);
    if (requestsCountListenerRef) off(requestsCountListenerRef);
    await signOut(auth);
    updateRequestsBadge(0);
    showScreen("login");
  } catch (err) {
    console.error("Logout failed", err);
  }
});

/* ================= NAV ================= */
btnSearch.addEventListener("click", () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
  showScreen("search");
});
btnBackSearch.addEventListener("click", () => showScreen("home"));

btnRequests.addEventListener("click", () => {
  showScreen("requests");
  loadRequests();
});
btnBackRequests.addEventListener("click", () => showScreen("home"));

btnBackChat.addEventListener("click", () => {
  if (chatListenerRef) off(chatListenerRef);
  currentChatUID = null;
  showScreen("home");
});

/* ================= SEARCH (debounced) ================= */
function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

searchInput.addEventListener(
  "input",
  debounce(async () => {
    const query = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = "";

    if (!query) {
      searchResults.innerHTML = `<p class="empty-text">Type a username</p>`;
      return;
    }

    try {
      const usernamesSnap = await get(ref(db, "usernames"));
      if (!usernamesSnap.exists()) {
        searchResults.innerHTML = `<p class="empty-text">No users yet</p>`;
        return;
      }

      let found = false;
      usernamesSnap.forEach(child => {
        const username = child.key;
        const uid = child.val();
        if (!username.startsWith(query)) return;
        found = true;

        const row = document.createElement("div");
        row.className = "list-item";

        if (uid === currentUID) {
          row.innerHTML = `<span>@${username}</span><span>You</span>`;
          searchResults.appendChild(row);
          return;
        }

        const addBtn = document.createElement("button");
        addBtn.className = "primary-btn";
        addBtn.textContent = "Add";

        addBtn.addEventListener("click", async () => {
          await set(ref(db, `friend_requests/${uid}/${currentUID}`), {
            time: Date.now()
          });
          addBtn.textContent = "Sent";
          addBtn.disabled = true;
        });

        row.innerHTML = `<span>@${username}</span>`;
        row.appendChild(addBtn);
        searchResults.appendChild(row);
      });

      if (!found) {
        searchResults.innerHTML = `<p class="empty-text">No match found</p>`;
      }
    } catch (err) {
      console.error("Search failed", err);
    }
  }, 300)
);

/* ================= REQUESTS ================= */
function loadRequests() {
  requestList.innerHTML = "";

  if (requestsListenerRef) off(requestsListenerRef);
  requestsListenerRef = ref(db, "friend_requests/" + currentUID);

  onValue(requestsListenerRef, async snap => {
    requestList.innerHTML = "";

    if (!snap.exists()) {
      requestList.innerHTML = `<p class="empty-text">No requests</p>`;
      return;
    }

    const requestsObj = snap.val();
    for (const fromUID of Object.keys(requestsObj)) {
      try {
        const uSnap = await get(ref(db, "users/" + fromUID));
        if (!uSnap.exists()) continue;

        const row = document.createElement("div");
        row.className = "list-item";

        const name = document.createElement("span");
        name.textContent = "@" + uSnap.val().username;

        const accept = document.createElement("button");
        accept.className = "primary-btn";
        accept.textContent = "Accept";

        const reject = document.createElement("button");
        reject.className = "danger-btn";
        reject.textContent = "Reject";

        accept.addEventListener("click", async () => {
          // 1️⃣ Add friends on BOTH sides
          await set(ref(db, `friends/${currentUID}/${fromUID}`), true);
          await set(ref(db, `friends/${fromUID}/${currentUID}`), true);

          // 2️⃣ Remove requests on BOTH sides
          await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
          await remove(ref(db, `friend_requests/${fromUID}/${currentUID}`));

          // 3️⃣ Switch screen & refresh
          showScreen("home");
          loadFriends();
        });

        reject.addEventListener("click", async () => {
          await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
        });

        row.appendChild(name);
        row.appendChild(accept);
        row.appendChild(reject);
        requestList.appendChild(row);
      } catch (err) {
        console.error("Processing request failed", err);
      }
    }
  });
}

/* ================= FRIENDS ================= */
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

    const friendsObj = snap.val();
    for (const friendUID of Object.keys(friendsObj)) {
      try {
        const userSnap = await get(ref(db, "users/" + friendUID));
        if (!userSnap.exists()) continue;

        const row = document.createElement("div");
        row.className = "list-item";

        const name = document.createElement("span");
        name.textContent = "@" + userSnap.val().username;

        const removeBtn = document.createElement("button");
        removeBtn.className = "primary-btn";
        removeBtn.textContent = "Remove";

        removeBtn.addEventListener("click", async e => {
          e.stopPropagation();
          await remove(ref(db, `friends/${currentUID}/${friendUID}`));
          await remove(ref(db, `friends/${friendUID}/${currentUID}`));
        });

        row.addEventListener("click", () => openChat(friendUID, userSnap.val().username));

        row.appendChild(name);
        row.appendChild(removeBtn);
        friendsList.appendChild(row);
      } catch (err) {
        console.error("Loading friend failed", err);
      }
    }
  });
}

/* ================= CHAT ================= */
function openChat(friendUID, username) {
  currentChatUID = friendUID;
  chatUsername.textContent = "@" + username;
  chatMessages.innerHTML = "";

  showScreen("chat");

  const chatId = currentUID < friendUID ? currentUID + "_" + friendUID : friendUID + "_" + currentUID;

  // ensure members exist
  set(ref(db, "chats/" + chatId + "/members/" + currentUID), true);
  set(ref(db, "chats/" + chatId + "/members/" + friendUID), true);

  if (chatListenerRef) off(chatListenerRef);
  chatListenerRef = ref(db, "chats/" + chatId + "/messages");

  onValue(chatListenerRef, snap => {
    chatMessages.innerHTML = "";
    if (!snap.exists()) return;

    snap.forEach(msg => {
      const data = msg.val();
      const div = document.createElement("div");
      div.className = "chat-message "

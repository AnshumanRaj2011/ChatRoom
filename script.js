import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
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
const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");
const logoutBtn = document.getElementById("btn-logout");

const friendsList = document.getElementById("friends-list");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const requestList = document.getElementById("request-list");

const chatUsername = document.getElementById("chat-username");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function loadRequests() {
  requestList.innerHTML = "";

  // Remove old listener if any
  if (requestsListenerRef) off(requestsListenerRef);

  // Listen to incoming requests
  requestsListenerRef = ref(db, "friend_requests/" + currentUID);

  onValue(requestsListenerRef, async snap => {
    requestList.innerHTML = "";

    if (!snap.exists()) {
      requestList.innerHTML = "<p class='empty-text'>No requests</p>";
      return;
    }

    for (const fromUID of Object.keys(snap.val())) {
      const userSnap = await get(ref(db, "users/" + fromUID));
      if (!userSnap.exists()) continue;

      const user = userSnap.val();

      const row = document.createElement("div");
      row.className = "list-item";

      const name = document.createElement("span");
      name.textContent = "@" + user.username;

      // Badge (optional)
      if (user.badge) {
        const badge = document.createElement("span");
        badge.className = "badge " + user.badge;
        badge.textContent = user.badge.toUpperCase();
        name.appendChild(badge);
      }

      const accept = document.createElement("button");
accept.className = "primary-btn";
accept.textContent = "Accept";

const reject = document.createElement("button");
reject.className = "danger-btn";
reject.textContent = "Reject";

      accept.onclick = async () => {
  // Add friends BOTH sides
  await set(ref(db, `friends/${currentUID}/${fromUID}`), true);
  await set(ref(db, `friends/${fromUID}/${currentUID}`), true);

  // 🔥 REMOVE REQUEST BOTH SIDES
  await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
  await remove(ref(db, `friend_requests/${fromUID}/${currentUID}`));

  showScreen("home");
  loadFriends();
};

      reject.onclick = async () => {
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
      };

      row.appendChild(name);
      row.appendChild(accept);
      row.appendChild(reject);
      requestList.appendChild(row);
    }
  });
}
// ================= NAVIGATION =================
// OPEN SEARCH
document.getElementById("btn-search").onclick = () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
  showScreen("search");
};

// BACK FROM SEARCH
document.getElementById("btn-back-search").onclick = () => {
  showScreen("home");
};

// OPEN REQUESTS ✅
document.getElementById("btn-requests").onclick = () => {
  showScreen("requests");
  loadRequests(); // 👈 ONLY HERE
};

// BACK FROM REQUESTS ✅
document.getElementById("btn-back-requests").onclick = () => {
  if (requestsListenerRef) off(requestsListenerRef);
  showScreen("home");
};


document.getElementById("btn-back-chat").onclick = () => {
  if (chatListenerRef) off(chatListenerRef);
  currentChatUID = null;
  showScreen("home");
};

/* ================= STATE ================= */
let currentUID = null;
let currentUserRole = "user";
let currentChatUID = null;
let chatListenerRef = null;
let friendsListenerRef = null;
let requestsListenerRef = null;

/* ================= LOGIN ================= */
googleLoginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert(e.message);
  }
};

/* ================= AUTH ================= */
onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUID = null;
    showScreen("login");
    return;
  }

  currentUID = user.uid;
  const snap = await get(ref(db, "users/" + currentUID));

  if (snap.exists()) {
    currentUserRole = snap.val().role || "user";
    showScreen("home");
    loadFriends();
  } else {
    showScreen("username");
  }
});

/* ================= USERNAME ================= */
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

  await set(ref(db, "usernames/" + username), currentUID);
  await update(ref(db, "users/" + currentUID), { username });

  showScreen("home");
  loadFriends();
};

/* ================= LOGOUT ================= */
logoutBtn.onclick = async () => {
  if (friendsListenerRef) off(friendsListenerRef);
  if (requestsListenerRef) off(requestsListenerRef);
  await signOut(auth);
  showScreen("login");
};

/* ================= SEARCH ================= */
searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!query) return;

  const usernamesSnap = await get(ref(db, "usernames"));
  if (!usernamesSnap.exists()) return;

  for (const [username, uid] of Object.entries(usernamesSnap.val())) {
    if (!username.startsWith(query)) continue;

    const userSnap = await get(ref(db, "users/" + uid));
    const user = userSnap.val() || {};

    const row = document.createElement("div");
    row.className = "list-item";

    const name = document.createElement("span");
    name.textContent = "@" + username;

    if (user.badge) {
      const badge = document.createElement("span");
      badge.className = "badge " + user.badge;
      badge.textContent = user.badge.toUpperCase();
      name.appendChild(badge);
    }

    row.appendChild(name);

    if (uid !== currentUID) {
  const add = document.createElement("button");
  add.className = "primary-btn";

  // 🔍 CHECK: already friends?
const friendSnap = await get(
  ref(db, `friends/${currentUID}/${uid}`)
);

// 🔍 CHECK: request already sent (BOTH directions)
const reqSnap1 = await get(
  ref(db, `friend_requests/${uid}/${currentUID}`)
);

const reqSnap2 = await get(
  ref(db, `friend_requests/${currentUID}/${uid}`)
);

// ✅ DEFINE requestExists (THIS WAS MISSING)
const requestExists = reqSnap1.exists() || reqSnap2.exists();

if (friendSnap.exists()) {
  // ✅ ALREADY FRIENDS
  add.textContent = "Friends";
  add.disabled = true;
}
else if (requestExists) {
  // ⏳ REQUEST SENT OR RECEIVED
  add.textContent = "Sent";
  add.disabled = true;
}
else {
  // ➕ CAN SEND REQUEST
  add.textContent = "Add";
  add.onclick = async () => {
    await set(ref(db, `friend_requests/${uid}/${currentUID}`), true);
    add.textContent = "Sent";
    add.disabled = true;
  };
}

row.appendChild(add);
    }

    searchResults.appendChild(row);
  }
});

/* ================= FRIENDS ================= */
function loadFriends() {
  friendsList.innerHTML = "";
  friendsListenerRef = ref(db, "friends/" + currentUID);

  onValue(friendsListenerRef, async snap => {
    friendsList.innerHTML = "";
    if (!snap.exists()) return;

    for (const friendUID of Object.keys(snap.val())) {
      const userSnap = await get(ref(db, "users/" + friendUID));
      const user = userSnap.val();

      const row = document.createElement("div");
      row.className = "list-item";

      const name = document.createElement("span");
      name.textContent = "@" + user.username;

      if (user.badge) {
        const badge = document.createElement("span");
        badge.className = "badge " + user.badge;
        badge.textContent = user.badge.toUpperCase();
        name.appendChild(badge);
      }

      row.onclick = () => openChat(friendUID, user.username);
      row.appendChild(name);
      friendsList.appendChild(row);
    }
  });
}

/* ================= CHAT ================= */
async function openChat(friendUID, username) {
  currentChatUID = friendUID;
  chatMessages.innerHTML = "";
  chatUsername.textContent = "@" + username;
  showScreen("chat");

  const chatId =
    currentUID < friendUID
      ? currentUID + "_" + friendUID
      : friendUID + "_" + currentUID;

  set(ref(db, `chats/${chatId}/members/${currentUID}`), true);
  set(ref(db, `chats/${chatId}/members/${friendUID}`), true);

  chatListenerRef = ref(db, `chats/${chatId}/messages`);
  onValue(chatListenerRef, snap => {
    chatMessages.innerHTML = "";
    if (!snap.exists()) return;

    snap.forEach(msg => {
      const data = msg.val();
      const div = document.createElement("div");
      div.textContent = data.text;

      if (currentUserRole === "god") {
        const del = document.createElement("span");
        del.textContent = " ❌";
        del.onclick = () => remove(msg.ref);
        div.appendChild(del);
      }

      chatMessages.appendChild(div);
    });
  });
}

/* ================= SEND MESSAGE ================= */
chatForm.onsubmit = async e => {
  e.preventDefault();
  if (!chatInput.value.trim()) return;

  const chatId =
    currentUID < currentChatUID
      ? currentUID + "_" + currentChatUID
      : currentChatUID + "_" + currentUID;

  await push(ref(db, `chats/${chatId}/messages`), {
    from: currentUID,
    text: chatInput.value.trim(),
    time: Date.now()
  });

  chatInput.value = "";
};

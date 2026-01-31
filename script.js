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
  chat: document.getElementById("screen-chat") // ✅ REQUIRED
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
/* ================= CHAT DOM ================= */
const chatUsername = document.getElementById("chat-username");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const btnBackChat = document.getElementById("btn-back-chat");

/* ================= STATE ================= */
let currentUID = null;
let friendsListenerRef = null;
let requestsListenerRef = null;

/* 🔥 CHAT STATE (ADD, DO NOT REPLACE) */
let currentChatUID = null;
let chatListenerRef = null;

/* ================= START ================= */
showScreen("login");

/* ================= LOGIN ================= */
googleLoginBtn.onclick = async () => {
  await signInWithPopup(auth, provider);
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

  await set(nameRef, currentUID);
  await set(ref(db, "users/" + currentUID), { username });

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

/* ================= NAV ================= */
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

btnBackChat.onclick = () => {
  if (chatListenerRef) off(chatListenerRef);
  currentChatUID = null;
  showScreen("home");
};

/* ================= SEARCH ================= */

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!query) {
    searchResults.innerHTML = `<p class="empty-text">Type a username</p>`;
    return;
  }

  // 🔥 FETCH DATA ONCE
  const [usernamesSnap, friendsSnap, requestsSnap] = await Promise.all([
    get(ref(db, "usernames")),
    get(ref(db, `friends/${currentUID}`)),
    get(ref(db, `friend_requests/${currentUID}`))
  ]);

  if (!usernamesSnap.exists()) {
    searchResults.innerHTML = `<p class="empty-text">No users yet</p>`;
    return;
  }

  const myFriends = friendsSnap.exists() ? friendsSnap.val() : {};
const myRequests = requestsSnap.exists() ? requestsSnap.val() : {};

  let hasMatch = false;

  usernamesSnap.forEach(child => {
    const username = child.key;
    const uid = child.val();

    if (!username.startsWith(query)) return;

    hasMatch = true;

    const row = document.createElement("div");
    row.className = "list-item";

    // 👤 YOU
    if (uid === currentUID) {
      row.innerHTML = `<span>@${username}</span><span>You</span>`;
      searchResults.appendChild(row);
      return;
    }

    // 🤝 FRIEND
    if (myFriends[uid]) {
      row.innerHTML = `<span>@${username}</span><span>Friend</span>`;
      searchResults.appendChild(row);
      return;
    }

    // 📩 SENT REQUEST
if (myRequests[uid]) {
  row.innerHTML = `<span>@${username}</span><span>Sent</span>`;
  searchResults.appendChild(row);
  return;
}

    // ➕ ADD FRIEND
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

    row.innerHTML = `<span>@${username}</span>`;
    row.appendChild(addBtn);
    searchResults.appendChild(row);
  });

  if (!hasMatch) {
    searchResults.innerHTML = `<p class="empty-text">No match found</p>`;
  }
});
        

  
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

    for (const fromUID of Object.keys(snap.val())) {
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

      accept.onclick = async () => {
  // 1️⃣ Add friends on BOTH sides
  await set(ref(db, `friends/${currentUID}/${fromUID}`), true);
  await set(ref(db, `friends/${fromUID}/${currentUID}`), true);

  // 2️⃣ Remove requests on BOTH sides (🔥 THIS WAS MISSING)
  await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
  await remove(ref(db, `friend_requests/${fromUID}/${currentUID}`));

  // 3️⃣ Switch screen & refresh
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

    for (const friendUID of Object.keys(snap.val())) {
      const userSnap = await get(ref(db, "users/" + friendUID));
      if (!userSnap.exists()) continue;

      const row = document.createElement("div");
      row.className = "list-item";

      const name = document.createElement("span");
      name.textContent = "@" + userSnap.val().username;

      name.onclick = () => openChat(friendUID, userSnap.val().username);

      const removeBtn = document.createElement("button");
      removeBtn.className = "primary-btn";
      removeBtn.textContent = "Remove";

      removeBtn.onclick = async () => {
  await remove(ref(db, `friends/${currentUID}/${friendUID}`));
  await remove(ref(db, `friends/${friendUID}/${currentUID}`));

  // 🔥 ALSO CLEAR REQUESTS
  await remove(ref(db, `friend_requests/${currentUID}/${friendUID}`));
  await remove(ref(db, `friend_requests/${friendUID}/${currentUID}`));
};

      
      row.appendChild(name);
      row.appendChild(removeBtn);
      friendsList.appendChild(row);
    }
  });
}

function openChat(friendUID, username) {
  currentChatUID = friendUID;
  chatUsername.textContent = "@" + username;
  chatMessages.innerHTML = "";

  showScreen("chat");

  const chatId =
    currentUID < friendUID
      ? currentUID + "_" + friendUID
      : friendUID + "_" + currentUID;

  // ✅ CREATE CHAT MEMBERS (REQUIRED FOR FIREBASE RULES)
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
      div.className =
        "chat-message " + (data.from === currentUID ? "me" : "other");
      div.textContent = data.text;
      chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ================= SEND MESSAGE =================
chatForm.onsubmit = async e => {
  e.preventDefault();

  if (!chatInput.value.trim() || !currentChatUID) return;

  const chatId =
    currentUID < currentChatUID
      ? currentUID + "_" + currentChatUID
      : currentChatUID + "_" + currentUID;

  await push(ref(db, "chats/" + chatId + "/messages"), {
    from: currentUID,
    text: chatInput.value.trim(),
    time: Date.now()
  });

  chatInput.value = "";
};

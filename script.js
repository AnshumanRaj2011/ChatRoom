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

/* ================= FIREBASE CONFIG ================= */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

/* ================= INIT ================= */
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

/* ================= STATE ================= */
let currentUID = null;
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
  if (!/^[a-z0-9_]{3,}$/.test(username)) return alert("Invalid username");

  const nameRef = ref(db, "usernames/" + username);
  if ((await get(nameRef)).exists()) return alert("Username taken");

  await set(nameRef, currentUID);
  await set(ref(db, "users/" + currentUID), { username });

  showScreen("home");
  loadFriends();
};

/* ================= LOGOUT ================= */
logoutBtn.onclick = async () => {
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
  showScreen("home");
};

/* ================= SEARCH ================= */
searchInput.addEventListener("input", async () => {
  const q = searchInput.value.toLowerCase();
  searchResults.innerHTML = "";
  if (q.length < 2) return;

  const usersSnap = await get(ref(db, "usernames"));
  const friendsSnap = await get(ref(db, `friends/${currentUID}`));
  const friends = friendsSnap.exists() ? friendsSnap.val() : {};

  usersSnap.forEach(child => {
    if (!child.key.includes(q)) return;

    const uid = child.val();
    const div = document.createElement("div");
    div.className = "list-item";

    if (uid === currentUID) {
      div.innerHTML = `<span>@${child.key}</span><span>You</span>`;
    } else if (friends[uid]) {
      div.innerHTML = `<span>@${child.key}</span><span>Friends ✓</span>`;
    } else {
      const btn = document.createElement("button");
      btn.className = "primary-btn";
      btn.textContent = "Add";
      btn.onclick = async () => {
        await set(ref(db, `friend_requests/${uid}/${currentUID}`), true);
        btn.textContent = "Sent";
        btn.disabled = true;
      };
      div.innerHTML = `<span>@${child.key}</span>`;
      div.appendChild(btn);
    }
    searchResults.appendChild(div);
  });
});

/* ================= REQUESTS ================= */
function loadRequests() {
  requestList.innerHTML = "";
  const reqRef = ref(db, "friend_requests/" + currentUID);

  onValue(reqRef, async snap => {
    requestList.innerHTML = "";
    if (!snap.exists()) {
      requestList.innerHTML = "<p>No requests</p>";
      return;
    }

    for (const fromUID of Object.keys(snap.val())) {
      const uSnap = await get(ref(db, "users/" + fromUID));
      if (!uSnap.exists()) continue;

      const div = document.createElement("div");
      div.className = "list-item request-item";

      const accept = document.createElement("button");
      accept.className = "primary-btn";
      accept.textContent = "Accept";

      const reject = document.createElement("button");
      reject.className = "danger-btn";
      reject.textContent = "Reject";

      accept.onclick = async () => {
        await set(ref(db, `friends/${currentUID}/${fromUID}`), true);
        await set(ref(db, `friends/${fromUID}/${currentUID}`), true);
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
        loadFriends();
      };

      reject.onclick = async () => {
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
      };

      div.innerHTML = `<span>@${uSnap.val().username}</span>`;
      div.appendChild(accept);
      div.appendChild(reject);
      requestList.appendChild(div);
    }
  });
}

/* ================= FRIENDS ================= */
function loadFriends() {
  friendsList.innerHTML = "";
  const fRef = ref(db, "friends/" + currentUID);

  onValue(fRef, async snap => {
    friendsList.innerHTML = "";
    if (!snap.exists()) {
      friendsList.innerHTML = "<p>No friends</p>";
      return;
    }

    for (const uid of Object.keys(snap.val())) {
      const uSnap = await get(ref(db, "users/" + uid));
      if (!uSnap.exists()) continue;

      const div = document.createElement("div");
      div.className = "list-item";

      div.innerHTML = `<span>@${uSnap.val().username}</span>`;

      div.onclick = () => openChat(uid, uSnap.val().username);
      friendsList.appendChild(div);
    }
  });
}

/* ================= CHAT ================= */
function chatId(a, b) {
  return [a, b].sort().join("_");
}

function openChat(uid, username) {
  currentChatUID = uid;
  chatUsername.textContent = username;
  chatMessages.innerHTML = "";
  showScreen("chat");

  const cid = chatId(currentUID, uid);
  const cRef = ref(db, "chats/" + cid);

  chatListenerRef = onValue(cRef, snap => {
    chatMessages.innerHTML = "";
    if (!snap.exists()) return;

    snap.forEach(m => {
      const div = document.createElement("div");
      div.textContent = m.val().text;
      div.style.textAlign = m.val().from === currentUID ? "right" : "left";
      chatMessages.appendChild(div);
    });
  });
}

chatForm.onsubmit = async e => {
  e.preventDefault();
  if (!chatInput.value.trim()) return;

  const cid = chatId(currentUID, currentChatUID);
  await push(ref(db, "chats/" + cid), {
    from: currentUID,
    text: chatInput.value,
    time: Date.now()
  });
  chatInput.value = "";
};

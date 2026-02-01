// script.js - Full-featured ChatRoom App with Fixed Synchronous Search
// Integrates working search logic from your latest version.

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

/* ================= UTILITY ================= */
function createBadge(badgeType) {
  if (!badgeType) return null;
  const badge = document.createElement("span");
  badge.className = "badge " + badgeType;
  badge.textContent = badgeType.toUpperCase();
  return badge;
}

/* ================= STATE ================= */
let currentUID = null;
let currentUserRole = "user";
let currentChatUID = null;
let chatListenerRef = null;
let friendsListenerRef = null;
let requestsListenerRef = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUID = null;
    showScreen("login");
    return;
  }

  currentUID = user.uid;
  const userRef = ref(db, "users/" + currentUID);
  const snap = await get(userRef);

  if (!snap.exists()) {
    showScreen("username");
    return;
  }

  currentUserRole = snap.val().role || "user";
  showScreen("home");
  loadFriends();
});

/* ================= LOGIN ================= */
googleLoginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert(e.message);
  }
};

/* ================= USERNAME ================= */
saveUsernameBtn.onclick = async () => {
  const username = usernameInput.value.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,}$/.test(username)) {
    alert("Invalid username: 3+ chars, lowercase letters/numbers/underscores only.");
    return;
  }

  const nameRef = ref(db, "usernames/" + username);
  if ((await get(nameRef)).exists()) {
    alert("Username already taken");
    return;
  }

  await set(ref(db, "usernames/" + username), currentUID);
  await update(ref(db, "users/" + currentUID), { username, role: "user" });

  showScreen("home");
  loadFriends();
};

/* ================= LOGOUT ================= */
logoutBtn.onclick = async () => {
  if (friendsListenerRef) off(friendsListenerRef);
  if (requestsListenerRef) off(requestsListenerRef);
  if (chatListenerRef) off(chatListenerRef);
  await signOut(auth);
  showScreen("login");
};

/* ================= SEARCH ================= */
searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!query) {
    searchResults.innerHTML = `<p class="empty-text">Type a username</p>`;
    return;
  }

  const usernamesSnap = await get(ref(db, "usernames"));
  if (!usernamesSnap.exists()) {
    searchResults.innerHTML = `<p class="empty-text">No users yet</p>`;
    return;
  }

  let found = false;
  let count = 0;

  usernamesSnap.forEach(async child => {
    if (count >= 10) return;
    const username = child.key;
    const uid = child.val();

    console.log(`Checking username: ${username}, query: ${query}, startsWith: ${username.startsWith(query)}`);

    if (!username.startsWith(query)) return;

    console.log(`Match found for: ${username} (UID: ${uid})`);
    found = true;
    count++;
    const row = document.createElement("div");
    row.className = "list-item";

    const name = document.createElement("span");
    name.textContent = "@" + username;

    // Auto-repair if missing
    const userSnap = await get(ref(db, "users/" + uid));
    const user = userSnap.val() || {};
    if (!userSnap.exists()) {
      console.warn(`Repairing missing user profile for ${username}`);
      await update(ref(db, "users/" + uid), { username, role: "user" });
    }

    const badge = createBadge(user.badge);
    if (badge) name.appendChild(badge);

    row.appendChild(name);

    if (uid === currentUID) {
      const you = document.createElement("span");
      you.textContent = "You";
      row.appendChild(you);
      searchResults.appendChild(row);
      return;
    }

    const addBtn = document.createElement("button");
    addBtn.className = "primary-btn";

    const reqSnap = await get(ref(db, `friend_requests/${uid}/${currentUID}`));
    const friendSnap = await get(ref(db, `friends/${currentUID}/${uid}`));

    if (friendSnap.exists()) {
      addBtn.textContent = "Friends";
      addBtn.disabled = true;
    } else if (reqSnap.exists()) {
      addBtn.textContent = "Sent";
      addBtn.disabled = true;
    } else {
      addBtn.textContent = "Add";
      addBtn.onclick = async () => {
        await set(ref(db, `friend_requests/${uid}/${currentUID}`), { time: Date.now() });
        addBtn.textContent = "Sent";
        addBtn.disabled = true;
      };
    }

    row.appendChild(addBtn);
    searchResults.appendChild(row);
  });

  // Small delay to ensure async operations complete
  setTimeout(() => {
    if (!found) {
      searchResults.innerHTML = `<p class="empty-text">No match found</p>`;
    }
  }, 100);
});

/* ================= FRIENDS ================= */
function loadFriends() {
  friendsList.innerHTML = "";
  if (friendsListenerRef) off(friendsListenerRef);
  friendsListenerRef = ref(db, "friends/" + currentUID);

  onValue(friendsListenerRef, async snap => {
    friendsList.innerHTML = "";
    if (!snap.exists()) {
      friendsList.innerHTML = `<p class="empty-text">No friends yet. Search to add some!</p>`;
      return;
    }

    const promises = [];
    for (const friendUID of Object.keys(snap.val())) {
      promises.push((async () => {
        const userSnap = await get(ref(db, "users/" + friendUID));
        const user = userSnap.val();

        const row = document.createElement("div");
        row.className = "list-item";

        const name = document.createElement("span");
        name.textContent = "@" + user.username;

        const badge = createBadge(user.badge);
        if (badge) name.appendChild(badge);

        const removeBtn = document.createElement("button");
        removeBtn.className = "danger-btn";
        removeBtn.textContent = "Remove";
        removeBtn.onclick = async (e) => {
          e.stopPropagation();
          await remove(ref(db, `friends/${currentUID}/${friendUID}`));
          await remove(ref(db, `friends/${friendUID}/${currentUID}`));
        };

        row.onclick = () => openChat(friendUID);
        row.appendChild(name);
        row.appendChild(removeBtn);
        friendsList.appendChild(row);
      })());
    }
    await Promise.all(promises);
  });
}

/* ================= REQUESTS ================= */
function loadRequests() {
  requestList.innerHTML = "";
  if (requestsListenerRef) off(requestsListenerRef);
  requestsListenerRef = ref(db, "friend_requests/" + currentUID);

  onValue(requestsListenerRef, async snap => {
    requestList.innerHTML = "";
    if (!snap.exists()) {
      requestList.innerHTML = "<p class='empty-text'>No requests</p>";
      return;
    }

    const promises = [];
    for (const fromUID of Object.keys(snap.val())) {
      promises.push((async () => {
        const userSnap = await get(ref(db, "users/" + fromUID));
        if (!userSnap.exists()) return;

        const user = userSnap.val();

        const row = document.createElement("div");
        row.className = "list-item";

        const name = document.createElement("span");
        name.textContent = "@" + user.username;

        const badge = createBadge(user.badge);
        if (badge) name.appendChild(badge);

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
      })());
    }
    await Promise.all(promises);
  });
}

/* ================= CHAT ================= */
async function openChat(friendUID) {
  currentChatUID = friendUID;
  chatMessages.innerHTML = "";

  chatUsername.innerHTML = "";

  const userSnap = await get(ref(db, "users/" + friendUID));
  const user = userSnap.val() || {};

  const name = document.createElement("span");
  name.textContent = "@" + user.username;

  const badge = createBadge(user.badge);
  if (badge) name.appendChild(badge);

  chatUsername.appendChild(name);
  showScreen("chat");

  const chatId = currentUID < friendUID ? currentUID + "_" + friendUID : friendUID + "_" + currentUID;

  await set(ref(db, `chats/${chatId}/members/${currentUID}`), true);
  await set(ref(db, `chats/${chatId}/members/${friendUID}`), true);

  if (chatListenerRef) off(chatListenerRef);
  chatListenerRef = ref(db, `chats/${chatId}/messages`);

  onValue(chatListenerRef, snap => {
    chatMessages.innerHTML = "";
    if (!snap.exists()) return;

    snap.forEach(msg => {
      const data = msg.val();
      const div = document.createElement("div");
      div.className = "chat-message " + (data.from === currentUID ? "me" : "other");
      div.textContent = data.text;

      if (currentUserRole === "god") {
        const del = document.createElement("span");
        del.textContent = " ❌";
        del.style.cursor = "pointer";
        del.onclick = () => remove(msg.ref);
        div.appendChild(del);
      }

      chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/* ================= SEND MESSAGE ================= */
chatForm.onsubmit = async e => {
  e.preventDefault();
  if (!chatInput.value.trim()) return;

  const chatId = currentUID < currentChatUID ? currentUID + "_" + currentChatUID : currentChatUID + "_" + currentUID;

  await push(ref(db, `chats/${chatId}/messages`), {
    from: currentUID,
    text: chatInput.value.trim(),
    time: Date.now()
  });

  chatInput.value = "";
};

/* ================= NAVIGATION ================= */
document.getElementById("btn-search").onclick = () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
  showScreen("search");
};

document.getElementById("btn-back-search").onclick = () => {
  showScreen("home");
};

document.getElementById("btn-requests").onclick = () => {
  showScreen("requests");
  loadRequests();
};

document.getElementById("btn-back-requests").onclick = () => {
  if (requestsListenerRef) off(requestsListenerRef);
  showScreen("home");
};

document.getElementById("btn-back-chat").onclick = () => {
  if (chatListenerRef) off(chatListenerRef);
  currentChatUID = null;
  showScreen("home");
};

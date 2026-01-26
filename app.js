import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73",
  measurementId: "G-VDBR1MFW33"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.getElementById("registerBtn").onclick = async () => {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;

  console.log("Register clicked", u, p);

  if (!u || !p) return alert("Fill all fields");

  const snap = await get(ref(db, "users/" + u));
  if (snap.exists()) return alert("User exists");

  await set(ref(db, "users/" + u), { password: p });
  alert("REGISTER SUCCESS");
};

document.getElementById("loginBtn").onclick = async () => {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;

  const snap = await get(ref(db, "users/" + u));
  if (!snap.exists()) return alert("No user");
  if (snap.val().password !== p) return alert("Wrong password");

  alert("LOGIN SUCCESS");
};

/* DOM */
const auth = document.getElementById("auth");
const appDiv = document.getElementById("app");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logout");

const search = document.getElementById("search");
const usersDiv = document.getElementById("users");
const chatWith = document.getElementById("chatWith");

const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const messagesDiv = document.getElementById("messages");
const deleteBtn = document.getElementById("delete");

/* STATE */
let me = localStorage.getItem("user");
let currentChat = null;
let selected = new Set();

/* AUTO LOGIN */
if (me) {
  auth.style.display = "none";
  appDiv.style.display = "block";
}

/* REGISTER */
registerBtn.onclick = async () => {
  const u = usernameInput.value;
  const p = passwordInput.value;

  console.log("Registering:", u, p);

  if (!u || !p) {
    alert("Fill all fields");
    return;
  }

  try {
    const snap = await get(ref(db, "users/" + u));
    console.log("User exists?", snap.exists());

    if (snap.exists()) {
      alert("Username exists");
      return;
    }

    await set(ref(db, "users/" + u), { password: p });
    console.log("User saved");

    localStorage.setItem("user", u);
    location.reload();
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    alert("Register failed — check console");
  }
};

/* LOGIN */
loginBtn.onclick = async () => {
  const u = usernameInput.value;
  const p = passwordInput.value;

  const snap = await get(ref(db, "users/" + u));
  if (!snap.exists()) return alert("User not found");
  if (snap.val().password !== p) return alert("Wrong password");

  localStorage.setItem("user", u);
  location.reload();
};

/* LOGOUT */
logoutBtn.onclick = () => {
  localStorage.removeItem("user");
  location.reload();
};

/* SEARCH USERS */
search.oninput = async () => {
  usersDiv.innerHTML = "";
  const snap = await get(ref(db, "users"));

  snap.forEach(c => {
    if (c.key !== me && c.key.includes(search.value)) {
      const d = document.createElement("div");
      d.textContent = c.key;
      d.onclick = () => openChat(c.key);
      usersDiv.appendChild(d);
    }
  });
};

/* OPEN CHAT */
function openChat(user) {
  currentChat = user;
  chatWith.textContent = "Chat with " + user;
  messagesDiv.innerHTML = "";
  selected.clear();

  const id = [me, user].sort().join("_");
  onChildAdded(ref(db, "chats/" + id), snap => {
    const m = snap.val();
    const div = document.createElement("div");
    div.className = "msg" + (m.from !== me ? " other" : "");
    div.textContent = m.from + ": " + m.text;
    div.dataset.key = snap.key;

    div.onclick = () => {
      div.classList.toggle("selected");
      div.classList.contains("selected")
        ? selected.add(snap.key)
        : selected.delete(snap.key);
    };

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

/* SEND MESSAGE */
sendBtn.onclick = () => {
  if (!currentChat || !msgInput.value) return;
  const id = [me, currentChat].sort().join("_");

  push(ref(db, "chats/" + id), {
    from: me,
    text: msgInput.value,
    time: Date.now()
  });

  msgInput.value = "";
};

/* DELETE SELECTED */
deleteBtn.onclick = () => {
  if (!currentChat) return;
  const id = [me, currentChat].sort().join("_");

  selected.forEach(k => remove(ref(db, "chats/" + id + "/" + k)));
  selected.clear();
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* 🔥 Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

/* Init Firebase */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");

/* DOM */
const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");

/* Multi-select storage */
const selectedKeys = new Set();

/* Load messages */
onChildAdded(messagesRef, (snapshot) => {
  const msg = snapshot.val();
  const key = snapshot.key;

  const div = document.createElement("div");
  div.className = "message";
  div.dataset.key = key;

  const textDiv = document.createElement("div");
  textDiv.textContent = msg.text;

  const timeDiv = document.createElement("div");
  timeDiv.className = "message-time";
  timeDiv.textContent = new Date(msg.time).toLocaleString();

  div.appendChild(textDiv);
  div.appendChild(timeDiv);

  div.onclick = () => {
    if (selectedKeys.has(key)) {
      selectedKeys.delete(key);
      div.classList.remove("selected");
    } else {
      selectedKeys.add(key);
      div.classList.add("selected");
    }
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* Remove message from UI */
onChildRemoved(messagesRef, (snapshot) => {
  const el = document.querySelector(`[data-key="${snapshot.key}"]`);
  if (el) el.remove();
  selectedKeys.delete(snapshot.key);
});

/* Send message */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  push(messagesRef, {
    text: text,
    time: Date.now()
  });

  input.value = "";
});

/* Delete selected messages */
deleteBtn.onclick = () => {
  if (selectedKeys.size === 0) {
    alert("Select messages to delete");
    return;
  }

  selectedKeys.forEach(key => {
    remove(ref(db, "messages/" + key));
  });

  selectedKeys.clear();
};

/* Clear all messages */
clearBtn.onclick = () => {
  if (confirm("Delete ALL messages?")) {
    remove(messagesRef);
    messagesDiv.innerHTML = "";
    selectedKeys.clear();
  }
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  remove
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* 🔥 Firebase Config (YOUR PROJECT) */
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

/* Initialize Firebase */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");

/* DOM Elements */
const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");

let selectedKey = null;

/* 🔁 Load messages */
onChildAdded(messagesRef, (snapshot) => {
  const msg = snapshot.val();

  const div = document.createElement("div");
  div.className = "message";
  div.textContent = msg.text;
  div.dataset.key = snapshot.key;

  /* Select message */
  div.onclick = () => {
    document
      .querySelectorAll(".message")
      .forEach(m => m.classList.remove("selected"));
    div.classList.add("selected");
    selectedKey = snapshot.key;
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* ➤ Send message */
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

/* ❌ Delete selected message */
function deleteMessage() {
  if (!selectedKey) {
    alert("Select a message first");
    return;
  }
  remove(ref(db, "messages/" + selectedKey));
  location.reload();
}

/* 🧹 Clear all messages */
function clearChat() {
  if (confirm("Delete all messages?")) {
    remove(messagesRef);
    location.reload();
  }
}

/* Button bindings */
deleteBtn.onclick = deleteMessage;
clearBtn.onclick = clearChat;

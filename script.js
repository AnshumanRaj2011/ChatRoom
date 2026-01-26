import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, push, onChildAdded, remove } 
from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

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
const messagesRef = ref(db, "messages");

const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");

let selectedKey = null;

// Load messages
onChildAdded(messagesRef, (snapshot) => {
  const msg = snapshot.val();
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = msg.text;
  div.dataset.key = snapshot.key;

  div.onclick = () => {
    document.querySelectorAll(".message").forEach(m => m.classList.remove("selected"));
    div.classList.add("selected");
    selectedKey = snapshot.key;
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    push(messagesRef, { text: input.value, time: Date.now() });
    input.value = "";
  }
});

// Delete selected message
window.deleteMessage = () => {
  if (selectedKey) {
    remove(ref(db, "messages/" + selectedKey));
    location.reload();
  } else {
    alert("Select a message first");
  }
};

// Clear all messages
window.clearChat = () => {
  if (confirm("Delete all messages?")) {
    remove(messagesRef);
    location.reload();
  }
};

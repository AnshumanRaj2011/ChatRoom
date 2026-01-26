import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, push, onChildAdded, remove } 
from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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

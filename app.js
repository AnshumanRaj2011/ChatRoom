import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

document.getElementById("registerBtn").onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert("Fill all fields");
    return;
  }

  const userRef = ref(db, "users/" + username);

  const snap = await get(userRef);
  if (snap.exists()) {
    alert("User already exists");
    return;
  }

  await set(userRef, { password });
  alert("REGISTER SUCCESS");
};

document.getElementById("loginBtn").onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert("Fill all fields");
    return;
  }

  const snap = await get(ref(db, "users/" + username));

  if (!snap.exists()) {
    alert("User not found");
    return;
  }

  if (snap.val().password !== password) {
    alert("Wrong password");
    return;
  }

  alert("LOGIN SUCCESS");
};

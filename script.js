import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  remove
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

/* Init */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();
const messagesRef = ref(db, "messages");

/* DOM */
const loginScreen = document.getElementById("login-screen");
const chatContainer = document.getElementById("chat-container");
const googleLoginBtn = document.getElementById("google-login");

const profileIcon = document.getElementById("profile-icon");
const profilePage = document.getElementById("profile-page");
const closeProfile = document.getElementById("close-profile");

const profilePhotoLarge = document.getElementById("profile-photo-large");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileUid = document.getElementById("profile-uid");

const newNameInput = document.getElementById("new-name");
const updateNameBtn = document.getElementById("update-name");
const logoutBtn = document.getElementById("logout");

const messagesDiv = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");

let selectedKeys = new Set();

/* LOGIN */
googleLoginBtn.onclick = () => signInWithPopup(auth, provider);

/* AUTH STATE */
onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = "none";
    chatContainer.style.display = "flex";

    const photo =
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${user.displayName}`;

    profileIcon.src = photo;
    profilePhotoLarge.src = photo;
    profileName.textContent = user.displayName;
    profileEmail.textContent = user.email;
    profileUid.textContent = user.uid;
  } else {
    loginScreen.style.display = "block";
    chatContainer.style.display = "none";
  }
});

/* PROFILE PAGE */
profileIcon.onclick = () => profilePage.style.display = "flex";
closeProfile.onclick = () => profilePage.style.display = "none";

/* UPDATE NAME */
updateNameBtn.onclick = async () => {
  const name = newNameInput.value.trim();
  if (!name) return;

  await updateProfile(auth.currentUser, { displayName: name });
  profileName.textContent = name;
  newNameInput.value = "";
};

/* LOGOUT */
logoutBtn.onclick = () => signOut(auth);

/* LOAD MESSAGES */
onChildAdded(messagesRef, snap => {
  const m = snap.val();
  const div = document.createElement("div");
  div.className = "message";
  div.dataset.key = snap.key;

  div.innerHTML = `
    <b>${m.user}</b>: ${m.text}
    <div class="time">${new Date(m.time).toLocaleString()}</div>
  `;

  div.onclick = () => {
    div.classList.toggle("selected");
    div.classList.contains("selected")
      ? selectedKeys.add(snap.key)
      : selectedKeys.delete(snap.key);
  };

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

/* REMOVE */
onChildRemoved(messagesRef, snap => {
  document.querySelector(`[data-key="${snap.key}"]`)?.remove();
});

/* SEND */
form.onsubmit = e => {
  e.preventDefault();
  if (!input.value.trim()) return;

  push(messagesRef, {
    text: input.value,
    user: auth.currentUser.displayName,
    time: Date.now()
  });

  input.value = "";
};

/* DELETE SELECTED */
deleteBtn.onclick = () => {
  selectedKeys.forEach(k => remove(ref(db, "messages/" + k)));
  selectedKeys.clear();
};

/* CLEAR ALL */
clearBtn.onclick = () => {
  if (confirm("Delete all messages?")) remove(messagesRef);
};

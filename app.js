let currentUser = localStorage.getItem("user");
let chattingWith = null;

const usersKey = "all_users";

if (currentUser) showApp();

function login() {
  const u = document.getElementById("usernameInput").value.trim();
  if (!u) return alert("Enter username");

  currentUser = u;
  localStorage.setItem("user", u);

  let users = JSON.parse(localStorage.getItem(usersKey)) || [];
  if (!users.includes(u)) {
    users.push(u);
    localStorage.setItem(usersKey, JSON.stringify(users));
  }

  showApp();
}

function logout() {
  localStorage.removeItem("user");
  location.reload();
}

function showApp() {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("me").innerText = "You: " + currentUser;
}

function searchUser() {
  const q = document.getElementById("search").value.toLowerCase();
  const list = document.getElementById("userList");
  list.innerHTML = "";

  let users = JSON.parse(localStorage.getItem(usersKey)) || [];
  users
    .filter(u => u !== currentUser && u.toLowerCase().includes(q))
    .forEach(u => {
      const d = document.createElement("div");
      d.innerText = u;
      d.onclick = () => openChat(u);
      list.appendChild(d);
    });
}

function openChat(user) {
  chattingWith = user;
  document.getElementById("chatBox").classList.remove("hidden");
  document.getElementById("chatWith").innerText = "Chat with " + user;
  loadMessages();
}

function chatKey() {
  return [currentUser, chattingWith].sort().join("_");
}

function sendMessage() {
  const input = document.getElementById("msgInput");
  if (!input.value) return;

  const key = chatKey();
  let msgs = JSON.parse(localStorage.getItem(key)) || [];
  msgs.push({ from: currentUser, text: input.value });
  localStorage.setItem(key, JSON.stringify(msgs));

  input.value = "";
  loadMessages();
}

function loadMessages() {
  const box = document.getElementById("messages");
  box.innerHTML = "";

  const msgs = JSON.parse(localStorage.getItem(chatKey())) || [];
  msgs.forEach(m => {
    const d = document.createElement("div");
    d.className = "msg";
    d.innerText = m.from + ": " + m.text;
    box.appendChild(d);
  });
}

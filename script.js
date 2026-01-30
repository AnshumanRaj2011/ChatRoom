const screens = {
  login: document.getElementById("screen-login"),
  username: document.getElementById("screen-username"),
  home: document.getElementById("screen-home"),
  search: document.getElementById("screen-search"),
  requests: document.getElementById("screen-requests"),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* TEMP BUTTON NAV (for testing UI) */
document.getElementById("google-login-btn").onclick = () => {
  showScreen("username"); // later replaced by Firebase logic
};

document.getElementById("save-username-btn").onclick = () => {
  showScreen("home");
};

document.getElementById("btn-search").onclick = () => {
  showScreen("search");
};

document.getElementById("btn-back-search").onclick = () => {
  showScreen("home");
};

document.getElementById("btn-requests").onclick = () => {
  showScreen("requests");
};

document.getElementById("btn-back-requests").onclick = () => {
  showScreen("home");
};

document.getElementById("btn-logout").onclick = () => {
  showScreen("login");
};

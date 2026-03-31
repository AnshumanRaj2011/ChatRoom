import { initializeApp }      from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, get, set, push, onValue, remove, off, serverTimestamp }
                               from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
         createUserWithEmailAndPassword, signInWithEmailAndPassword }
                               from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/* ══════════════════════════════════════════════
   FIREBASE CONFIG
══════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey:            "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain:        "chatroom-37278.firebaseapp.com",
  databaseURL:       "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId:         "chatroom-37278",
  storageBucket:     "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId:             "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};
const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const auth = getAuth(app);

/* ══════════════════════════════════════════════
   CRYPTO
══════════════════════════════════════════════ */
function deriveChatKey(a, b) {
  return CryptoJS.SHA256([a, b].sort().join("||chatroom||")).toString();
}
function encMsg(t, k) { return CryptoJS.AES.encrypt(t, k).toString(); }
function decMsg(c, k) {
  try { const b = CryptoJS.AES.decrypt(c, k); return b.toString(CryptoJS.enc.Utf8) || "[encrypted]"; }
  catch { return "[encrypted]"; }
}

/* ══════════════════════════════════════════════
   SCREENS
══════════════════════════════════════════════ */
const SCREENS = ["login","pick-username","home","search","requests","chat","call","profile"];
function showScreen(name) {
  SCREENS.forEach(n => {
    const el = document.getElementById("screen-" + n);
    if (el) el.classList.toggle("active", n === name);
  });
}

/* ══════════════════════════════════════════════
   DOM REFS
══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

// Auth
const loginErr          = $("login-error");
const loginEmailIn      = $("login-email");
const loginPassIn       = $("login-password");
const signupEmailIn     = $("signup-email");
const signupPassIn      = $("signup-password");
const signupConfIn      = $("signup-confirm");
const btnEmailLogin     = $("btn-email-login");
const btnEmailSignup    = $("btn-email-signup");
const btnGoogleSignin   = $("btn-google-signin");

// Auth tabs
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    tab.classList.add("active");
    const target = $("tab-" + tab.dataset.tab);
    if (target) target.classList.add("active");
    loginErr.textContent = "";
  });
});

// Pick username
const pickUsernameInput = $("pick-username-input");
const btnPickUsername   = $("btn-pick-username");
const pickError         = $("pick-error");
const pickAvatar        = $("pick-avatar");

// Home
const homeAvatar        = $("home-avatar");
const friendsList       = $("friends-list");
const pinnedList        = $("pinned-list");
const archivedList      = $("archived-list");
const logoutBtn         = $("btn-logout");
const reqBadge          = $("req-badge");
const btnSearchNav      = $("btn-search");
const btnReqNav         = $("btn-requests");
const btnThemeToggle    = $("btn-theme-toggle");

// Home tabs
document.querySelectorAll(".home-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".home-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".home-tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    const target = $("tab-" + tab.dataset.tab);
    if (target) target.classList.add("active");
    if (tab.dataset.tab === "pinned") renderPinnedList();
    if (tab.dataset.tab === "archived") renderArchivedList();
  });
});

// Search
const searchInput       = $("search-input");
const searchResults     = $("search-results");
const btnBackSearch     = $("btn-back-search");

// Requests
const requestList       = $("request-list");
const btnBackReq        = $("btn-back-requests");

// Chat
const chatUsernameEl    = $("chat-username");
const chatAvatarTop     = $("chat-avatar-top");
const chatLastSeen      = $("chat-last-seen");
const chatMessages      = $("chat-messages");
const chatForm          = $("chat-form");
const chatInput         = $("chat-input");
const btnBackChat       = $("btn-back-chat");
const btnStartCall      = $("btn-start-call");
const btnChatSearch     = $("btn-chat-search");
const chatSearchBar     = $("chat-search-bar");
const chatSearchInput   = $("chat-search-input");
const btnChatSearchClose= $("btn-chat-search-close");
const btnPinChat        = $("btn-pin-chat");
const btnMuteChat       = $("btn-mute-chat");
const btnArchiveChat    = $("btn-archive-chat");
const btnBlockUser      = $("btn-block-user");
const chatNormal        = $("chat-normal-actions");
const chatSelectBar     = $("chat-select-actions");
const selectCountEl     = $("select-count");
const btnCopySel        = $("btn-copy-selected");
const btnDeleteMe       = $("btn-delete-me");
const btnDeleteAll      = $("btn-delete-all");
const btnCancelSel      = $("btn-cancel-select");
const typingIndicator   = $("typing-indicator");
const typingText        = $("typing-text");
const emojiPanel        = $("emoji-panel");
const btnEmojiToggle    = $("btn-emoji");
const emojiGrid         = $("emoji-grid");
const incomingBanner    = $("incoming-banner");
const bannerLabel       = $("incoming-banner-label");
const btnBannerAns      = $("btn-banner-answer");
const btnBannerDec      = $("btn-banner-decline");

// Profile
const btnBackProfile    = $("btn-back-profile");
const profileAvatarBig  = $("profile-avatar-big");
const profileUsernameD  = $("profile-username-display");
const profileEmailD     = $("profile-email-display");
const prefLastSeen      = $("pref-last-seen");
const prefPublicProfile = $("pref-public-profile");
const prefDarkMode      = $("pref-dark-mode");
const bgPicker          = $("bg-picker");
const btnSignoutProfile = $("btn-signout-profile");

// Call
const localVideoEl      = $("localVideo");
const remoteVideoEl     = $("remoteVideo");
const callPeerNameEl    = $("call-peer-name");
const callStatusDot     = $("call-status-dot");
const callTimerEl       = $("call-timer");
const callInOverlay     = $("call-incoming-overlay");
const incomingRingNm    = $("incoming-ring-name");
const btnAnswer         = $("btn-answer");
const btnDecline        = $("btn-decline");
const btnHangup         = $("btn-hangup");
const btnToggleMic      = $("btn-toggle-mic");
const btnToggleCam      = $("btn-toggle-cam");
const btnToggleSpk      = $("btn-toggle-speaker");
const btnFlipCam        = $("btn-flip-cam");
const btnCallChat       = $("btn-call-chat");

// Context menu
const ctxMenu           = $("msg-context-menu");
const ctxCopyBtn        = $("ctx-copy");
const ctxSelectBtn      = $("ctx-select");
const ctxDelMeBtn       = $("ctx-delete-me");
const ctxDelAllBtn      = $("ctx-delete-all");

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let me = null;
let friendsRef = null, reqRef = null, badgeRef = null, chatRef = null, callDetach = null, typingRef = null;
let chatUID = null, chatId = null, chatKey = null;
let activeCallId = null, pendingCall = null;
let micOn = true, camOn = true, spkOn = true, facing = "user";
let timerIv = null, timerStart = null;
const localDeleted = new Set();
let selMode = false;
const selMap = new Map();
let ctxTarget = null;
let typingTimeout = null;
let darkMode = true;
let userPrefs = { lastSeen: true, publicProfile: true, darkMode: true, chatBg: "none", muted: {}, pinned: {}, archived: {}, blocked: {} };

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, duration = 2500) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), duration);
}

/* ══════════════════════════════════════════════
   THEME / PREFERENCES
══════════════════════════════════════════════ */
function applyDarkMode(dark) {
  darkMode = dark;
  document.body.classList.toggle("light-mode", !dark);
  btnThemeToggle.textContent = dark ? "🌙" : "☀️";
  if (prefDarkMode) prefDarkMode.checked = dark;
}

function applyChatBg(bg) {
  userPrefs.chatBg = bg;
  document.body.dataset.chatBg = bg === "none" ? "" : bg;
  document.querySelectorAll(".bg-swatch").forEach(s => {
    s.classList.toggle("active", s.dataset.bg === bg);
  });
}

function buildBgPicker() {
  const bgs = [
    { bg: "none",   label: "Default", style: "background:var(--bg)" },
    { bg: "dots",   label: "Dots",    style: "background:radial-gradient(circle,#333 1px,#0d0d0f 1px) 0 0/20px 20px" },
    { bg: "grid",   label: "Grid",    style: "background:linear-gradient(#2a2a35 1px,transparent 1px),linear-gradient(90deg,#2a2a35 1px,transparent 1px) #0d0d0f;background-size:24px 24px" },
    { bg: "waves",  label: "Lines",   style: "background:repeating-linear-gradient(45deg,transparent,transparent 10px,#2a2a35 10px,#2a2a35 11px);background-color:#0d0d0f" },
    { bg: "dark",   label: "Black",   style: "background:#060608" },
    { bg: "green",  label: "Forest",  style: "background:#0a1a12" },
    { bg: "purple", label: "Night",   style: "background:#12101f" },
  ];
  bgPicker.innerHTML = "";
  bgs.forEach(({ bg, label, style }) => {
    const s = document.createElement("div");
    s.className = "bg-swatch" + (userPrefs.chatBg === bg ? " active" : "");
    s.dataset.bg = bg;
    s.title = label;
    s.setAttribute("style", style + ";border:2px solid var(--border)");
    s.onclick = () => {
      applyChatBg(bg);
      savePrefs();
    };
    bgPicker.appendChild(s);
  });
}

/* ══════════════════════════════════════════════
   EMOJI
══════════════════════════════════════════════ */
const EMOJIS = ["😀","😂","😍","🥰","😎","🤔","😢","😡","👍","👎","❤️","🔥","✨","🎉","💯","🙏","👀","😭","🤣","🥺","😏","😊","🤗","😴","🤩","🥳","💪","🤝","👋","✌️","🎮","🏆","🌟","💡","📱","🎵","🍕","☕","🌸","🦋"];
function buildEmojiGrid() {
  emojiGrid.innerHTML = "";
  EMOJIS.forEach(e => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-btn-item";
    btn.textContent = e;
    btn.onclick = () => {
      chatInput.value += e;
      chatInput.focus();
      sendTypingSignal();
    };
    emojiGrid.appendChild(btn);
  });
}
btnEmojiToggle.onclick = () => emojiPanel.classList.toggle("hidden");
document.addEventListener("click", e => {
  if (!emojiPanel.contains(e.target) && e.target !== btnEmojiToggle) {
    emojiPanel.classList.add("hidden");
  }
});

/* ══════════════════════════════════════════════
   EMAIL AUTH
══════════════════════════════════════════════ */
btnEmailLogin.addEventListener("click", async () => {
  const email = loginEmailIn.value.trim();
  const pass  = loginPassIn.value;
  loginErr.textContent = "";
  if (!email || !pass) { loginErr.textContent = "Enter email and password."; return; }
  btnEmailLogin.disabled = true;
  btnEmailLogin.innerHTML = '<span class="loading-spinner"></span>Logging in…';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    loginErr.textContent = friendlyAuthError(e.code);
  } finally {
    btnEmailLogin.disabled = false;
    btnEmailLogin.textContent = "Login →";
  }
});

btnEmailSignup.addEventListener("click", async () => {
  const email = signupEmailIn.value.trim();
  const pass  = signupPassIn.value;
  const conf  = signupConfIn.value;
  loginErr.textContent = "";
  if (!email || !pass) { loginErr.textContent = "Fill in all fields."; return; }
  if (pass !== conf)   { loginErr.textContent = "Passwords don't match."; return; }
  if (pass.length < 6) { loginErr.textContent = "Password must be at least 6 characters."; return; }
  btnEmailSignup.disabled = true;
  btnEmailSignup.innerHTML = '<span class="loading-spinner"></span>Creating account…';
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    loginErr.textContent = friendlyAuthError(e.code);
  } finally {
    btnEmailSignup.disabled = false;
    btnEmailSignup.textContent = "Create Account →";
  }
});

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email":           "Invalid email address.",
    "auth/user-not-found":          "No account found with this email.",
    "auth/wrong-password":          "Incorrect password.",
    "auth/email-already-in-use":    "This email is already registered.",
    "auth/weak-password":           "Password too weak (min 6 chars).",
    "auth/popup-closed-by-user":    "Sign-in cancelled.",
    "auth/popup-blocked":           "Popup was blocked. Please allow popups for this site.",
    "auth/network-request-failed":  "Network error. Check your connection.",
    "auth/too-many-requests":       "Too many attempts. Try again later.",
    "auth/invalid-credential":      "Wrong email or password.",
  };
  return map[code] || ("Error: " + code);
}

/* ══════════════════════════════════════════════
   GOOGLE AUTH
══════════════════════════════════════════════ */
btnGoogleSignin.addEventListener("click", async () => {
  btnGoogleSignin.disabled = true;
  loginErr.textContent = "";
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  } catch(e) {
    loginErr.textContent = friendlyAuthError(e.code);
  } finally {
    btnGoogleSignin.disabled = false;
  }
});

/* ══════════════════════════════════════════════
   AUTH STATE WATCHER
══════════════════════════════════════════════ */
onAuthStateChanged(auth, async firebaseUser => {
  if (!firebaseUser) {
    teardown();
    showScreen("login");
    return;
  }
  const uid  = firebaseUser.uid;
  const snap = await get(ref(db, "users/" + uid));
  const data = snap.val() || {};

  if (!data.username) {
    setAvatarEl(pickAvatar, firebaseUser.photoURL, firebaseUser.displayName);
    showScreen("pick-username");
    pickUsernameInput.value = "";
    pickError.textContent = "";
    pickUsernameInput.focus();
    return;
  }

  me = {
    uid,
    username:  data.username,
    badge:     data.badge || null,
    photoURL:  firebaseUser.photoURL || data.photoURL || null,
    email:     firebaseUser.email || ""
  };
  // load preferences
  userPrefs = Object.assign({ lastSeen: true, publicProfile: true, darkMode: true, chatBg: "none", muted: {}, pinned: {}, archived: {}, blocked: {} }, data.prefs || {});
  applyDarkMode(userPrefs.darkMode !== false);
  applyChatBg(userPrefs.chatBg || "none");
  updateLastSeen();
  bootApp();
});

/* ══════════════════════════════════════════════
   PICK USERNAME
══════════════════════════════════════════════ */
btnPickUsername.addEventListener("click", saveUsername);
pickUsernameInput.addEventListener("keydown", e => { if (e.key === "Enter") saveUsername(); });

async function saveUsername() {
  const raw = pickUsernameInput.value.trim().toLowerCase();
  pickError.textContent = "";
  if (!/^[a-z0-9_]{3,20}$/.test(raw)) {
    pickError.textContent = "3–20 chars: a–z, 0–9, underscore only"; return;
  }
  btnPickUsername.disabled = true;
  btnPickUsername.innerHTML = '<span class="loading-spinner"></span>Saving…';
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Not signed in");
    const uid = firebaseUser.uid;
    const allSnap = await get(ref(db, "users"));
    if (allSnap.exists()) {
      for (const [, d] of Object.entries(allSnap.val())) {
        if (d.username === raw) {
          pickError.textContent = "Username already taken, try another.";
          return;
        }
      }
    }
    await set(ref(db, "users/" + uid + "/username"), raw);
    me = {
      uid, username: raw, badge: null,
      photoURL: firebaseUser.photoURL || null,
      email:    firebaseUser.email || ""
    };
    bootApp();
  } catch(e) {
    pickError.textContent = "Error: " + e.message;
  } finally {
    btnPickUsername.disabled = false;
    btnPickUsername.textContent = "Let's go →";
  }
}

/* ══════════════════════════════════════════════
   BOOT / TEARDOWN
══════════════════════════════════════════════ */
function bootApp() {
  setAvatarEl(homeAvatar, me.photoURL, me.username);
  buildEmojiGrid();
  buildBgPicker();
  showScreen("home");
  loadFriends();
  watchBadge();
  watchRequests();
}

function teardown() {
  [friendsRef, reqRef, badgeRef, chatRef].forEach(r => { if (r) try { off(r); } catch(e){} });
  if (callDetach) { callDetach(); callDetach = null; }
  if (typingRef)  { off(typingRef); typingRef = null; }
  friendsRef = reqRef = badgeRef = chatRef = null;
  me = null; chatUID = chatId = chatKey = null;
  activeCallId = null; pendingCall = null;
  localDeleted.clear(); selMap.clear(); selMode = false;
  if (friendsList) friendsList.innerHTML = "";
}

/* ══════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════ */
logoutBtn.addEventListener("click", () => signOut(auth));
btnSignoutProfile.addEventListener("click", () => signOut(auth));

/* ══════════════════════════════════════════════
   LAST SEEN
══════════════════════════════════════════════ */
function updateLastSeen() {
  if (!me) return;
  if (userPrefs.lastSeen !== false) {
    set(ref(db, "users/" + me.uid + "/lastSeen"), Date.now()).catch(() => {});
  }
}
setInterval(() => { if (me) updateLastSeen(); }, 60000);

/* ══════════════════════════════════════════════
   PREFERENCES
══════════════════════════════════════════════ */
async function savePrefs() {
  if (!me) return;
  await set(ref(db, "users/" + me.uid + "/prefs"), userPrefs).catch(() => {});
}

// Theme toggle
btnThemeToggle.onclick = () => {
  applyDarkMode(!darkMode);
  userPrefs.darkMode = darkMode;
  savePrefs();
};

// Profile pref bindings
if (prefDarkMode) prefDarkMode.addEventListener("change", () => {
  applyDarkMode(prefDarkMode.checked);
  userPrefs.darkMode = prefDarkMode.checked;
  savePrefs();
});
if (prefLastSeen) prefLastSeen.addEventListener("change", () => {
  userPrefs.lastSeen = prefLastSeen.checked;
  savePrefs();
});
if (prefPublicProfile) prefPublicProfile.addEventListener("change", () => {
  userPrefs.publicProfile = prefPublicProfile.checked;
  savePrefs();
});

/* ══════════════════════════════════════════════
   PROFILE SCREEN
══════════════════════════════════════════════ */
homeAvatar.addEventListener("click", () => openProfileScreen());
btnBackProfile.onclick = () => showScreen("home");

function openProfileScreen() {
  if (!me) return;
  setAvatarEl(profileAvatarBig, me.photoURL, me.username);
  profileUsernameD.textContent = "@" + me.username;
  profileEmailD.textContent    = me.email || "(no email)";
  prefLastSeen.checked      = userPrefs.lastSeen !== false;
  prefPublicProfile.checked = userPrefs.publicProfile !== false;
  prefDarkMode.checked      = darkMode;
  buildBgPicker();
  showScreen("profile");
}

/* ══════════════════════════════════════════════
   BADGE WATCHER
══════════════════════════════════════════════ */
function watchBadge() {
  if (!me) return;
  badgeRef = ref(db, "users/" + me.uid + "/badge");
  onValue(badgeRef, s => { if (me) me.badge = s.val() || null; });
}

/* ══════════════════════════════════════════════
   AVATAR HELPER
══════════════════════════════════════════════ */
function setAvatarEl(el, photoURL, fallbackName) {
  if (!el) return;
  if (photoURL) {
    el.innerHTML = `<img src="${photoURL}" alt="avatar" referrerpolicy="no-referrer" />`;
  } else {
    el.textContent = (fallbackName || "?")[0].toUpperCase();
  }
}

/* ══════════════════════════════════════════════
   FRIENDS
══════════════════════════════════════════════ */
function loadFriends() {
  if (friendsRef) off(friendsRef);
  friendsRef = ref(db, "users/" + me.uid + "/friends");
  onValue(friendsRef, async snap => {
    friendsList.innerHTML = "";
    const uids = Object.keys(snap.val() || {});
    const notArchivedFriends = uids.filter(u => !userPrefs.archived?.[u]);
    if (!notArchivedFriends.length) {
      friendsList.innerHTML = '<div class="empty-text">No friends yet — search to add someone!</div>'; return;
    }
    for (const uid of notArchivedFriends) {
      if (userPrefs.blocked?.[uid]) continue;
      const data = await getUserData(uid);
      friendsList.appendChild(buildFriendItem(uid, data));
    }
  });
}

function buildFriendItem(uid, data) {
  const item = document.createElement("div"); item.className = "list-item";
  const av   = document.createElement("div"); av.className = "avatar-sm";
  setAvatarEl(av, data.photoURL, data.username);
  const node = makeUsernameNodeFromData(data, uid); node.style.flex = "1";
  const meta = document.createElement("div"); meta.className = "list-item-meta";
  if (userPrefs.pinned?.[uid])  meta.innerHTML += '<span class="pin-badge">📌</span>';
  if (userPrefs.muted?.[uid])   meta.innerHTML += '<span class="muted-badge">🔕</span>';
  item.appendChild(av); item.appendChild(node); item.appendChild(meta);
  item.onclick = () => openChat(uid, data.username || uid, data);
  return item;
}

/* ══════════════════════════════════════════════
   PINNED / ARCHIVED LISTS
══════════════════════════════════════════════ */
async function renderPinnedList() {
  pinnedList.innerHTML = "";
  const pinned = Object.keys(userPrefs.pinned || {});
  if (!pinned.length) { pinnedList.innerHTML = '<div class="empty-text">No pinned chats</div>'; return; }
  for (const uid of pinned) {
    const data = await getUserData(uid);
    pinnedList.appendChild(buildFriendItem(uid, data));
  }
}

async function renderArchivedList() {
  archivedList.innerHTML = "";
  const archived = Object.keys(userPrefs.archived || {});
  if (!archived.length) { archivedList.innerHTML = '<div class="empty-text">No archived chats</div>'; return; }
  for (const uid of archived) {
    const data = await getUserData(uid);
    archivedList.appendChild(buildFriendItem(uid, data));
  }
}

/* ══════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════ */
btnSearchNav.onclick = () => { searchInput.value = ""; searchResults.innerHTML = ""; showScreen("search"); };
btnBackSearch.onclick = () => showScreen("home");

searchInput.oninput = async () => {
  const q = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";
  if (q.length < 1) return;
  try {
    const snap = await get(ref(db, "users"));
    if (!snap.exists()) { searchResults.innerHTML = '<div class="empty-text">No users yet</div>'; return; }
    let found = 0;
    for (const [uid, data] of Object.entries(snap.val())) {
      if (!data.username || !data.username.toLowerCase().includes(q) || uid === me.uid) continue;
      if (data.prefs?.publicProfile === false) continue; // respect privacy
      if (userPrefs.blocked?.[uid]) continue;
      found++;
      const item = document.createElement("div"); item.className = "list-item";
      const av   = document.createElement("div"); av.className = "avatar-sm";
      setAvatarEl(av, data.photoURL, data.username);
      const node = makeUsernameNodeFromData(data, uid); node.style.flex = "1";
      item.appendChild(av); item.appendChild(node);
      const [frSnap, rqSnap] = await Promise.all([
        get(ref(db, "users/" + uid + "/friends/" + me.uid)),
        get(ref(db, "users/" + uid + "/requests/" + me.uid))
      ]);
      const btn = document.createElement("button"); btn.className = "primary-btn";
      if (frSnap.exists())      { btn.textContent = "Friends ✓"; btn.disabled = true; }
      else if (rqSnap.exists()) { btn.textContent = "Sent ✓";    btn.disabled = true; }
      else {
        btn.textContent = "Add";
        btn.onclick = async e => {
          e.stopPropagation(); btn.disabled = true;
          await set(ref(db, "users/" + uid + "/requests/" + me.uid), { from: me.uid, time: Date.now() });
          btn.textContent = "Sent ✓";
        };
      }
      item.appendChild(btn);
      searchResults.appendChild(item);
    }
    if (!found) searchResults.innerHTML = `<div class="empty-text">No users match "${q}"</div>`;
  } catch(e) { searchResults.innerHTML = `<div class="empty-text">Error: ${e.message}</div>`; }
};

/* ══════════════════════════════════════════════
   FRIEND REQUESTS
══════════════════════════════════════════════ */
function watchRequests() {
  if (reqRef) off(reqRef);
  reqRef = ref(db, "users/" + me.uid + "/requests");
  onValue(reqRef, snap => {
    const cnt = Object.keys(snap.val() || {}).length;
    reqBadge.textContent = cnt;
    reqBadge.classList.toggle("hidden", cnt === 0);
  });
}
btnReqNav.onclick  = () => { loadRequestList(); showScreen("requests"); };
btnBackReq.onclick = () => showScreen("home");

function loadRequestList() {
  requestList.innerHTML = "";
  get(ref(db, "users/" + me.uid + "/requests")).then(async snap => {
    const entries = Object.entries(snap.val() || {});
    if (!entries.length) { requestList.innerHTML = '<div class="empty-text">No pending requests</div>'; return; }
    for (const [fromUID] of entries) {
      const data   = await getUserData(fromUID);
      const item   = document.createElement("div"); item.className = "list-item";
      const av     = document.createElement("div"); av.className = "avatar-sm";
      setAvatarEl(av, data.photoURL, data.username);
      const node   = makeUsernameNodeFromData(data, fromUID); node.style.flex = "1";
      item.appendChild(av); item.appendChild(node);
      const accept = document.createElement("button"); accept.className = "primary-btn"; accept.textContent = "Accept";
      const reject = document.createElement("button"); reject.className = "danger-btn";  reject.textContent = "Reject";
      accept.onclick = async e => {
        e.stopPropagation(); accept.disabled = reject.disabled = true;
        await set(ref(db, "users/" + me.uid   + "/friends/" + fromUID), true);
        await set(ref(db, "users/" + fromUID  + "/friends/" + me.uid),  true);
        await remove(ref(db, "users/" + me.uid + "/requests/" + fromUID));
        item.remove();
      };
      reject.onclick = async e => {
        e.stopPropagation(); accept.disabled = reject.disabled = true;
        await remove(ref(db, "users/" + me.uid + "/requests/" + fromUID));
        item.remove();
      };
      item.appendChild(accept); item.appendChild(reject);
      requestList.appendChild(item);
    }
  });
}

/* ══════════════════════════════════════════════
   USER DATA HELPERS
══════════════════════════════════════════════ */
const userCache = new Map();
async function getUserData(uid) {
  if (userCache.has(uid)) return userCache.get(uid);
  try {
    const snap = await get(ref(db, "users/" + uid));
    const data = snap.val() || {};
    userCache.set(uid, data);
    return data;
  } catch { return {}; }
}

function makeUsernameNodeFromData(data, uid) {
  const wrap = document.createElement("div"); wrap.className = "username-node";
  const span = document.createElement("span"); span.className = "username-text";
  span.textContent = "@" + (data.username || uid);
  wrap.appendChild(span);
  if (data.badge) {
    const b = document.createElement("span");
    b.className = "badge " + data.badge;
    b.textContent = { verified:"✓", vip:"VIP", god:"GOD" }[data.badge] || data.badge.toUpperCase();
    wrap.appendChild(b);
  }
  return wrap;
}

/* ══════════════════════════════════════════════
   CHAT OPEN + ACTIONS
══════════════════════════════════════════════ */
function openChat(uid, displayName, data) {
  exitSelMode(); hideCtx();
  chatUID = uid;
  chatId  = [me.uid, uid].sort().join("_");
  chatKey = deriveChatKey(me.uid, uid);
  chatUsernameEl.textContent = "@" + displayName;
  setAvatarEl(chatAvatarTop, data?.photoURL, displayName);
  chatMessages.innerHTML = "";
  localDeleted.clear();
  emojiPanel.classList.add("hidden");
  chatSearchBar.classList.add("hidden");

  // Pin & mute button state
  btnPinChat.classList.toggle("active-state", !!userPrefs.pinned?.[uid]);
  btnMuteChat.classList.toggle("active-state", !!userPrefs.muted?.[uid]);
  btnArchiveChat.classList.toggle("active-state", !!userPrefs.archived?.[uid]);

  // Show last seen
  if (data?.lastSeen && data?.prefs?.lastSeen !== false) {
    const d = new Date(data.lastSeen);
    const now = Date.now();
    const diff = now - data.lastSeen;
    if (diff < 60000) chatLastSeen.textContent = "Online";
    else if (diff < 3600000) chatLastSeen.textContent = `${Math.floor(diff/60000)}m ago`;
    else chatLastSeen.textContent = "Last seen " + d.toLocaleDateString();
  } else {
    chatLastSeen.textContent = "";
  }

  showScreen("chat");
  if (chatRef)    { off(chatRef); chatRef = null; }
  if (callDetach) { callDetach(); callDetach = null; }
  if (typingRef)  { off(typingRef); typingRef = null; }
  chatRef = ref(db, "chats/" + chatId + "/messages");
  onValue(chatRef, snap => renderChat(snap));
  listenIncomingCall();
  watchTyping();
  updateLastSeen();
}

/* Chat actions */
btnPinChat.onclick = () => {
  if (!chatUID) return;
  userPrefs.pinned = userPrefs.pinned || {};
  if (userPrefs.pinned[chatUID]) {
    delete userPrefs.pinned[chatUID];
    btnPinChat.classList.remove("active-state");
    showToast("Chat unpinned");
  } else {
    userPrefs.pinned[chatUID] = true;
    btnPinChat.classList.add("active-state");
    showToast("Chat pinned 📌");
  }
  savePrefs();
};

btnMuteChat.onclick = () => {
  if (!chatUID) return;
  userPrefs.muted = userPrefs.muted || {};
  if (userPrefs.muted[chatUID]) {
    delete userPrefs.muted[chatUID];
    btnMuteChat.classList.remove("active-state");
    showToast("Chat unmuted 🔔");
  } else {
    userPrefs.muted[chatUID] = true;
    btnMuteChat.classList.add("active-state");
    showToast("Chat muted 🔕");
  }
  savePrefs();
};

btnArchiveChat.onclick = () => {
  if (!chatUID) return;
  userPrefs.archived = userPrefs.archived || {};
  if (userPrefs.archived[chatUID]) {
    delete userPrefs.archived[chatUID];
    showToast("Chat unarchived");
  } else {
    userPrefs.archived[chatUID] = true;
    showToast("Chat archived 📦");
  }
  savePrefs();
  loadFriends();
};

btnBlockUser.onclick = () => {
  if (!chatUID) return;
  userPrefs.blocked = userPrefs.blocked || {};
  if (userPrefs.blocked[chatUID]) {
    delete userPrefs.blocked[chatUID];
    showToast("User unblocked");
  } else {
    if (!confirm("Block this user? They won't appear in your chats.")) return;
    userPrefs.blocked[chatUID] = true;
    showToast("User blocked 🚫");
    savePrefs();
    showScreen("home");
    loadFriends();
    return;
  }
  savePrefs();
};

/* In-chat search */
btnChatSearch.onclick = () => {
  chatSearchBar.classList.toggle("hidden");
  if (!chatSearchBar.classList.contains("hidden")) chatSearchInput.focus();
  else { chatSearchInput.value = ""; clearSearchHighlights(); }
};
btnChatSearchClose.onclick = () => {
  chatSearchBar.classList.add("hidden");
  chatSearchInput.value = "";
  clearSearchHighlights();
};
chatSearchInput.oninput = () => {
  clearSearchHighlights();
  const q = chatSearchInput.value.trim().toLowerCase();
  if (!q) return;
  chatMessages.querySelectorAll(".chat-message").forEach(el => {
    const content = el.querySelector(".message-content")?.textContent.toLowerCase() || "";
    if (content.includes(q)) el.classList.add("search-highlight");
  });
  const first = chatMessages.querySelector(".search-highlight");
  if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
};
function clearSearchHighlights() {
  chatMessages.querySelectorAll(".search-highlight").forEach(el => el.classList.remove("search-highlight"));
}

/* ══════════════════════════════════════════════
   TYPING INDICATOR
══════════════════════════════════════════════ */
function watchTyping() {
  if (!chatId || !chatUID) return;
  typingRef = ref(db, "chats/" + chatId + "/typing/" + chatUID);
  onValue(typingRef, snap => {
    const val = snap.val();
    const now  = Date.now();
    if (val && val.time && (now - val.time) < 4000) {
      typingText.textContent = "@" + (val.username || "someone") + " is typing";
      typingIndicator.classList.remove("hidden");
    } else {
      typingIndicator.classList.add("hidden");
    }
  });
}

function sendTypingSignal() {
  if (!chatId || !me) return;
  set(ref(db, "chats/" + chatId + "/typing/" + me.uid), {
    time: Date.now(), username: me.username
  }).catch(() => {});
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    remove(ref(db, "chats/" + chatId + "/typing/" + me.uid)).catch(() => {});
  }, 3000);
}

chatInput.addEventListener("input", sendTypingSignal);

/* ══════════════════════════════════════════════
   CHAT RENDER
══════════════════════════════════════════════ */
function renderChat(snap) {
  chatMessages.innerHTML = "";
  if (!snap.exists()) return;
  const msgs = [];
  snap.forEach(child => { if (!localDeleted.has(child.key)) msgs.push(child); });
  msgs.sort((a, b) => (a.val().time || 0) - (b.val().time || 0));

  let lastDate = null;
  msgs.forEach(child => {
    const msgTime = child.val().time;
    if (msgTime) {
      const dateStr = new Date(msgTime).toLocaleDateString([], { weekday:"long", month:"short", day:"numeric" });
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        const sep = document.createElement("div"); sep.className = "date-separator";
        sep.textContent = dateStr;
        chatMessages.appendChild(sep);
      }
    }
    chatMessages.appendChild(buildMsgEl(child));
  });

  // Mark messages as read
  if (msgs.length && chatUID) {
    const last = msgs[msgs.length - 1];
    if (last.val().from === chatUID) {
      set(ref(db, "chats/" + chatId + "/read/" + me.uid), Date.now()).catch(() => {});
    }
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function buildMsgEl(childSnap) {
  const data    = childSnap.val() || {};
  const fromUid = data.from || null;
  const time    = data.time || null;
  const text    = chatKey ? decMsg(data.text || "", chatKey) : "[encrypted]";
  const key     = childSnap.key;
  const snapRef = childSnap.ref;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message " + (fromUid === me?.uid ? "me" : "other");
  wrapper.dataset.key = key;

  const chk = document.createElement("div"); chk.className = "msg-checkbox"; chk.textContent = "✓";
  wrapper.appendChild(chk);

  const authorEl = document.createElement("div"); authorEl.className = "message-author";
  getUserData(fromUid).then(d => { authorEl.textContent = "@" + (d.username || fromUid); }).catch(() => {});
  wrapper.appendChild(authorEl);

  const contentEl = document.createElement("div"); contentEl.className = "message-content";
  contentEl.textContent = text;
  wrapper.appendChild(contentEl);

  const footerEl = document.createElement("div"); footerEl.className = "message-footer";
  const timeEl   = document.createElement("div"); timeEl.className = "message-time";
  timeEl.textContent = time ? new Date(time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "";
  footerEl.appendChild(timeEl);

  // Read receipt for own messages
  if (fromUid === me?.uid) {
    const rr = document.createElement("span"); rr.className = "read-receipt"; rr.textContent = "✓";
    footerEl.appendChild(rr);
    // Check if read
    get(ref(db, "chats/" + chatId + "/read/" + chatUID)).then(s => {
      if (s.exists() && s.val() >= (time || 0)) rr.textContent = "✓✓";
    }).catch(() => {});
  }

  wrapper.appendChild(footerEl);

  let pressT = null;
  wrapper.addEventListener("pointerdown", e => {
    pressT = setTimeout(() => showCtx(wrapper, snapRef, fromUid, text, e.clientX, e.clientY), 500);
  });
  wrapper.addEventListener("pointerup",    () => clearTimeout(pressT));
  wrapper.addEventListener("pointerleave", () => clearTimeout(pressT));
  wrapper.addEventListener("contextmenu",  e => { e.preventDefault(); if (!selMode) showCtx(wrapper, snapRef, fromUid, text, e.clientX, e.clientY); });
  wrapper.addEventListener("click",        e => { if (selMode) { e.stopPropagation(); toggleSel(wrapper, key, snapRef, fromUid, text); } });

  if (selMap.has(key)) wrapper.classList.add("selected");
  return wrapper;
}

/* SEND */
chatForm.onsubmit = async e => {
  e.preventDefault();
  if (!chatInput.value.trim() || !chatUID || !chatKey) return;

  // Check blocked
  if (userPrefs.blocked?.[chatUID]) { showToast("You have blocked this user."); return; }

  const txt = chatInput.value.trim(); chatInput.value = "";
  emojiPanel.classList.add("hidden");
  clearTimeout(typingTimeout);
  remove(ref(db, "chats/" + chatId + "/typing/" + me.uid)).catch(() => {});
  await push(ref(db, "chats/" + chatId + "/messages"), {
    from: me.uid, text: encMsg(txt, chatKey), time: Date.now()
  });
};
btnBackChat.onclick = () => { exitSelMode(); hideCtx(); typingIndicator.classList.add("hidden"); showScreen("home"); };

/* ══════════════════════════════════════════════
   CONTEXT MENU
══════════════════════════════════════════════ */
function showCtx(el, snapRef, fromUid, text, x, y) {
  ctxTarget = { el, snapRef, fromUid, text };
  ctxDelAllBtn.classList.toggle("hidden", fromUid !== me?.uid && me?.badge !== "god");
  ctxMenu.classList.remove("hidden");
  ctxMenu.style.left = Math.min(x, window.innerWidth  - 210) + "px";
  ctxMenu.style.top  = Math.min(y, window.innerHeight - 190) + "px";
}
function hideCtx() { ctxMenu.classList.add("hidden"); ctxTarget = null; }
document.addEventListener("click", e => { if (!ctxMenu.classList.contains("hidden") && !ctxMenu.contains(e.target)) hideCtx(); });

ctxCopyBtn.onclick   = () => { if (!ctxTarget) return; navigator.clipboard.writeText(ctxTarget.text).catch(() => {}); showToast("Copied!"); hideCtx(); };
ctxSelectBtn.onclick = () => { if (!ctxTarget) return; enterSelMode(); toggleSel(ctxTarget.el, ctxTarget.el.dataset.key, ctxTarget.snapRef, ctxTarget.fromUid, ctxTarget.text); hideCtx(); };
ctxDelMeBtn.onclick  = () => { if (!ctxTarget) return; localDeleted.add(ctxTarget.el.dataset.key); ctxTarget.el?.remove(); hideCtx(); };
ctxDelAllBtn.onclick = async () => {
  if (!ctxTarget) return;
  const { el, snapRef, fromUid } = ctxTarget;
  if (fromUid !== me?.uid && me?.badge !== "god") { hideCtx(); return; }
  hideCtx();
  try { await remove(snapRef); } catch(e) {}
};

/* ══════════════════════════════════════════════
   SELECT MODE
══════════════════════════════════════════════ */
function enterSelMode() {
  if (selMode) return; selMode = true;
  chatMessages.classList.add("select-mode");
  chatNormal.classList.add("hidden"); chatSelectBar.classList.remove("hidden");
  updateSelCount();
}
function exitSelMode() {
  selMode = false; selMap.clear();
  chatMessages.classList.remove("select-mode");
  chatNormal.classList.remove("hidden"); chatSelectBar.classList.add("hidden");
  chatMessages.querySelectorAll(".chat-message.selected").forEach(el => el.classList.remove("selected"));
}
function toggleSel(el, key, snapRef, fromUid, text) {
  if (selMap.has(key)) { selMap.delete(key); el.classList.remove("selected"); }
  else                 { selMap.set(key, { el, snapRef, fromUid, text }); el.classList.add("selected"); }
  if (selMap.size === 0) exitSelMode(); else updateSelCount();
}
function updateSelCount() { selectCountEl.textContent = selMap.size + " selected"; }

btnCancelSel.onclick = () => exitSelMode();
btnCopySel.onclick   = () => { navigator.clipboard.writeText([...selMap.values()].map(m => m.text).join("\n")).catch(() => {}); showToast("Copied!"); exitSelMode(); };
btnDeleteMe.onclick  = () => { selMap.forEach(({ el }, key) => { localDeleted.add(key); el?.remove(); }); exitSelMode(); };
btnDeleteAll.onclick = async () => {
  const items = [...selMap.values()].filter(({ fromUid }) => fromUid === me?.uid || me?.badge === "god");
  exitSelMode();
  await Promise.all(items.map(({ snapRef }) => remove(snapRef).catch(() => {})));
};

/* ══════════════════════════════════════════════
   WebRTC CALL
══════════════════════════════════════════════ */
const ICE = { iceServers:[
  { urls:"stun:stun.l.google.com:19302" },
  { urls:"turn:openrelay.metered.ca:443", username:"openrelayproject", credential:"openrelayproject" }
]};
const pcs = new Map(), streams = new Map(), dbl = new Map();
const callsRef  = cid       => ref(db, `chats/${cid}/calls`);
const callRef   = (cid, id) => ref(db, `chats/${cid}/calls/${id}`);
const offerRef  = (cid, id) => ref(db, `chats/${cid}/calls/${id}/offer`);
const answerRef = (cid, id) => ref(db, `chats/${cid}/calls/${id}/answer`);
const candRef   = (cid, id, side) => ref(db, `chats/${cid}/calls/${id}/candidates/${side}`);

function listenIncomingCall() {
  if (callDetach) { callDetach(); callDetach = null; }
  if (!chatId || !me) return;
  const root = callsRef(chatId), seen = new Set();
  const fn = snap => {
    snap.forEach(child => {
      const id = child.key, call = child.val();
      if (call?.offer && !call?.answer && call.offer.uid !== me.uid && !seen.has(id)) {
        seen.add(id); pendingCall = { callId: id };
        bannerLabel.textContent = "📞 Incoming call from " + chatUsernameEl.textContent;
        incomingBanner.classList.remove("hidden");
        callPeerNameEl.textContent = chatUsernameEl.textContent;
        callStatusDot.className    = "call-status-dot ringing";
        incomingRingNm.textContent = "📞 Incoming call from " + chatUsernameEl.textContent;
        callInOverlay.classList.remove("hidden");
      }
    });
  };
  onValue(root, fn);
  callDetach = () => off(root, "value", fn);
}

async function startCallRTC(cid, callerId, calleeId, callId) {
  const ls = await navigator.mediaDevices.getUserMedia({ audio:true, video:{ facingMode:facing } });
  localVideoEl.srcObject = ls; localVideoEl.muted = true; localVideoEl.play().catch(() => {});
  const pc = new RTCPeerConnection(ICE);
  pcs.set(callId,pc); streams.set(callId,ls); dbl.set(callId,[]);
  ls.getTracks().forEach(t => pc.addTrack(t, ls));
  const rs = new MediaStream();
  remoteVideoEl.srcObject = rs; remoteVideoEl.play().catch(() => {});
  pc.ontrack = e => e.streams.forEach(s => s.getTracks().forEach(t => rs.addTrack(t)));
  pc.onicecandidate = e => { if(!e.candidate)return; push(candRef(cid,callId,"caller")).then(p=>set(p,e.candidate.toJSON())).catch(console.error); };
  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
  await set(offerRef(cid,callId),{sdp:offer.sdp,type:offer.type,uid:callerId,calleeUid:calleeId,timestamp:Date.now()});
  const aRef = answerRef(cid,callId);
  const aFn  = async snap => {
    if(!snap.exists())return; const a=snap.val();
    if(a?.sdp && pc.signalingState!=="stable"){
      await pc.setRemoteDescription(new RTCSessionDescription({type:a.type||"answer",sdp:a.sdp}));
      callStatusDot.className="call-status-dot connected"; startTimer();
    }
  };
  onValue(aRef,aFn); dbl.get(callId).push({ref:aRef,fn:aFn});
  const ccRef=candRef(cid,callId,"callee");
  const ccFn=snap=>{if(!snap.exists())return;snap.forEach(c=>{const d=c.val();if(d)pc.addIceCandidate(new RTCIceCandidate(d)).catch(console.error);});};
  onValue(ccRef,ccFn); dbl.get(callId).push({ref:ccRef,fn:ccFn});
}

async function answerCallRTC(cid, callId, calleeId) {
  const ls = await navigator.mediaDevices.getUserMedia({ audio:true, video:{ facingMode:facing } });
  localVideoEl.srcObject = ls; localVideoEl.muted = true; localVideoEl.play().catch(() => {});
  const pc = new RTCPeerConnection(ICE);
  pcs.set(callId,pc); streams.set(callId,ls); dbl.set(callId,[]);
  ls.getTracks().forEach(t => pc.addTrack(t, ls));
  const rs = new MediaStream();
  remoteVideoEl.srcObject = rs; remoteVideoEl.play().catch(() => {});
  pc.ontrack = e => e.streams.forEach(s => s.getTracks().forEach(t => rs.addTrack(t)));
  pc.onicecandidate = e => { if(!e.candidate)return; push(candRef(cid,callId,"callee")).then(p=>set(p,e.candidate.toJSON())).catch(console.error); };
  const offerSnap = await get(offerRef(cid,callId));
  if(!offerSnap.exists())throw new Error("Offer missing");
  const o=offerSnap.val();
  await pc.setRemoteDescription(new RTCSessionDescription({type:o.type||"offer",sdp:o.sdp}));
  const ans=await pc.createAnswer(); await pc.setLocalDescription(ans);
  await set(answerRef(cid,callId),{sdp:ans.sdp,type:ans.type,uid:calleeId,timestamp:Date.now()});
  const crRef=candRef(cid,callId,"caller");
  const crFn=snap=>{if(!snap.exists())return;snap.forEach(c=>{const d=c.val();if(d)pc.addIceCandidate(new RTCIceCandidate(d)).catch(console.error);});};
  onValue(crRef,crFn); dbl.get(callId).push({ref:crRef,fn:crFn});
  callStatusDot.className="call-status-dot connected"; startTimer();
}

async function doHangup() {
  stopTimer();
  const id = activeCallId || pendingCall?.callId;
  if (id) {
    const pc=pcs.get(id); if(pc){try{pc.close();}catch(e){} pcs.delete(id);}
    const s=streams.get(id); if(s){s.getTracks().forEach(t=>t.stop());streams.delete(id);}
    (dbl.get(id)||[]).forEach(({ref:r,fn:f})=>{try{off(r,"value",f);}catch(e){}});
    dbl.delete(id);
    if(chatId)try{await remove(callRef(chatId,id));}catch(e){}
  }
  activeCallId=null; pendingCall=null;
  incomingBanner.classList.add("hidden"); callInOverlay.classList.add("hidden");
  callStatusDot.className="call-status-dot";
  try{if(localVideoEl.srcObject){localVideoEl.srcObject.getTracks().forEach(t=>t.stop());localVideoEl.srcObject=null;}}catch(e){}
  try{if(remoteVideoEl.srcObject){remoteVideoEl.srcObject.getTracks().forEach(t=>t.stop());remoteVideoEl.srcObject=null;}}catch(e){}
}

function startTimer(){stopTimer();timerStart=Date.now();timerIv=setInterval(()=>{const s=Math.floor((Date.now()-timerStart)/1000);callTimerEl.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");},1000);}
function stopTimer(){clearInterval(timerIv);timerIv=null;callTimerEl.textContent="00:00";}

btnStartCall.addEventListener("click", async () => {
  if(!me||!chatUID||!chatId)return; btnStartCall.disabled=true;
  callPeerNameEl.textContent=chatUsernameEl.textContent; callStatusDot.className="call-status-dot ringing";
  callInOverlay.classList.add("hidden"); incomingBanner.classList.add("hidden");
  resetCallControls(); showScreen("call");
  try{ const id=push(callsRef(chatId)).key; await startCallRTC(chatId,me.uid,chatUID,id); activeCallId=id; }
  catch(err){ console.error(err); btnStartCall.disabled=false; await doHangup(); showScreen("chat"); showToast("Could not start call: "+err.message); }
});
btnBannerAns.addEventListener("click", async () => {
  if(!pendingCall||!chatId||!me)return; incomingBanner.classList.add("hidden");
  callPeerNameEl.textContent=chatUsernameEl.textContent; callStatusDot.className="call-status-dot ringing";
  callInOverlay.classList.add("hidden"); resetCallControls(); showScreen("call");
  try{ await answerCallRTC(chatId,pendingCall.callId,me.uid); activeCallId=pendingCall.callId; pendingCall=null; }
  catch(err){ console.error(err); await doHangup(); showScreen("chat"); showToast("Could not answer: "+err.message); }
});
btnBannerDec.addEventListener("click", async () => {
  incomingBanner.classList.add("hidden");
  if(pendingCall&&chatId)try{await remove(callRef(chatId,pendingCall.callId));}catch(e){}
  pendingCall=null;
});
btnAnswer.addEventListener("click", async () => {
  if(!pendingCall||!chatId||!me)return; callInOverlay.classList.add("hidden");
  callStatusDot.className="call-status-dot ringing"; resetCallControls();
  try{ await answerCallRTC(chatId,pendingCall.callId,me.uid); activeCallId=pendingCall.callId; pendingCall=null; }
  catch(err){ console.error(err); await doHangup(); showScreen("chat"); showToast("Could not answer: "+err.message); }
});
btnDecline.addEventListener("click", async () => {
  if(pendingCall&&chatId)try{await remove(callRef(chatId,pendingCall.callId));}catch(e){}
  pendingCall=null; await doHangup(); showScreen("chat");
});
btnHangup.addEventListener("click", async () => { await doHangup(); btnStartCall.disabled=false; showScreen("chat"); });
btnCallChat.addEventListener("click", () => showScreen("chat"));

btnToggleMic.addEventListener("click",()=>{micOn=!micOn;const s=activeCallId?streams.get(activeCallId):null;if(s)s.getAudioTracks().forEach(t=>{t.enabled=micOn;});btnToggleMic.querySelector(".ctrl-icon").textContent=micOn?"🎤":"🔇";btnToggleMic.querySelector(".ctrl-label").textContent=micOn?"Mute":"Unmute";btnToggleMic.classList.toggle("muted",!micOn);});
btnToggleCam.addEventListener("click",()=>{camOn=!camOn;const s=activeCallId?streams.get(activeCallId):null;if(s)s.getVideoTracks().forEach(t=>{t.enabled=camOn;});localVideoEl.style.visibility=camOn?"visible":"hidden";btnToggleCam.querySelector(".ctrl-icon").textContent=camOn?"📷":"📷";btnToggleCam.querySelector(".ctrl-label").textContent=camOn?"Camera":"Cam Off";btnToggleCam.classList.toggle("cam-off",!camOn);});
btnToggleSpk.addEventListener("click",()=>{spkOn=!spkOn;remoteVideoEl.muted=!spkOn;btnToggleSpk.querySelector(".ctrl-icon").textContent=spkOn?"🔊":"🔈";btnToggleSpk.querySelector(".ctrl-label").textContent=spkOn?"Speaker":"Spkr Off";btnToggleSpk.classList.toggle("speaker-off",!spkOn);});

btnFlipCam.addEventListener("click", async () => {
  if(!activeCallId)return; btnFlipCam.disabled=true;
  const newFacing=facing==="user"?"environment":"user";
  try{
    const ns=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:newFacing}});
    const nvt=ns.getVideoTracks()[0];
    const pc=pcs.get(activeCallId);
    const sender=pc?.getSenders().find(s=>s.track?.kind==="video");
    if(sender)await sender.replaceTrack(nvt);
    const old=streams.get(activeCallId); old?.getVideoTracks().forEach(t=>t.stop());
    const combined=new MediaStream([...(old?.getAudioTracks()||[]),nvt]);
    streams.set(activeCallId,combined); localVideoEl.srcObject=combined; localVideoEl.muted=true; localVideoEl.play().catch(()=>{});
    combined.getAudioTracks().forEach(t=>{t.enabled=micOn;}); combined.getVideoTracks().forEach(t=>{t.enabled=camOn;});
    facing=newFacing; localVideoEl.style.transform=facing==="user"?"scaleX(-1)":"scaleX(1)";
  }catch(err){console.warn("Flip failed:",err.message);}
  btnFlipCam.disabled=false;
});

function resetCallControls(){
  micOn=camOn=spkOn=true;
  btnToggleMic.querySelector(".ctrl-icon").textContent="🎤"; btnToggleMic.querySelector(".ctrl-label").textContent="Mute"; btnToggleMic.className="call-ctrl-btn active";
  btnToggleCam.querySelector(".ctrl-icon").textContent="📷"; btnToggleCam.querySelector(".ctrl-label").textContent="Camera"; btnToggleCam.className="call-ctrl-btn active";
  localVideoEl.style.visibility="visible";
  btnToggleSpk.querySelector(".ctrl-icon").textContent="🔊"; btnToggleSpk.querySelector(".ctrl-label").textContent="Speaker"; btnToggleSpk.className="call-ctrl-btn active";
  remoteVideoEl.muted=false; stopTimer();
}

/* DRAGGABLE PiP */
(function(){
  const pip=$("local-pip"); if(!pip)return;
  let ox=0,oy=0;
  pip.addEventListener("pointerdown",e=>{
    if(e.target.closest(".pip-flip-btn"))return;
    e.preventDefault(); const r=pip.getBoundingClientRect();
    ox=e.clientX-r.left; oy=e.clientY-r.top; pip.setPointerCapture(e.pointerId); pip.style.cursor="grabbing";
  });
  pip.addEventListener("pointermove",e=>{
    if(!pip.hasPointerCapture(e.pointerId))return;
    const vw=window.innerWidth,vh=window.innerHeight,w=pip.offsetWidth,h=pip.offsetHeight;
    pip.style.position="absolute"; pip.style.right="auto";
    pip.style.left=Math.max(0,Math.min(vw-w,e.clientX-ox))+"px";
    pip.style.top =Math.max(0,Math.min(vh-h,e.clientY-oy))+"px";
  });
  pip.addEventListener("pointerup",()=>{pip.style.cursor="grab";});
})();

/* ══════════════════════════════════════════════
   FEATURE STATUS PANEL
══════════════════════════════════════════════ */
const FEATURES = [
  { icon:"✅", name:"Email/Password Login",       note:"Works · Firebase Auth",                  status:"ok" },
  { icon:"✅", name:"Google Sign-In",              note:"Works · Firebase Auth (popup)",          status:"ok" },
  { icon:"✅", name:"Username / Display Name",     note:"Works · stored in Realtime DB",         status:"ok" },
  { icon:"✅", name:"Profile Picture",             note:"Works · uses Google photo or initials", status:"ok" },
  { icon:"✅", name:"One-to-One Chat",             note:"Works · AES-encrypted messages",        status:"ok" },
  { icon:"✅", name:"Emoji Panel",                 note:"Works · 40 built-in Unicode emojis",   status:"ok" },
  { icon:"✅", name:"Typing Indicator",            note:"Works · real-time via Firebase",        status:"ok" },
  { icon:"✅", name:"Read Receipts (✓✓)",          note:"Works · basic single-tick/double-tick", status:"ok" },
  { icon:"✅", name:"In-Chat Search",              note:"Works · searches current chat text",    status:"ok" },
  { icon:"✅", name:"Pin / Unpin Chats",           note:"Works · stored in user prefs",          status:"ok" },
  { icon:"✅", name:"Mute Chats",                  note:"Works · stored in user prefs",          status:"ok" },
  { icon:"✅", name:"Archive Chats",               note:"Works · stored in user prefs",          status:"ok" },
  { icon:"✅", name:"Block Users",                 note:"Works · hides from list + search",      status:"ok" },
  { icon:"✅", name:"Dark / Light Mode",           note:"Works · toggleable, saved to profile",  status:"ok" },
  { icon:"✅", name:"Chat Backgrounds",            note:"Works · 7 built-in patterns, no upload",status:"ok" },
  { icon:"✅", name:"Last Seen",                   note:"Works · optional via privacy toggle",   status:"ok" },
  { icon:"✅", name:"Profile Privacy Settings",    note:"Works · last seen + profile visibility",status:"ok" },
  { icon:"✅", name:"Video Calling (WebRTC)",      note:"Works · peer-to-peer via Firebase",     status:"ok" },
  { icon:"✅", name:"Delete Messages",             note:"Works · delete for me or delete for all",status:"ok" },
  { icon:"✅", name:"Select & Copy Messages",      note:"Works",                                  status:"ok" },
  { icon:"⚠️", name:"Push Notifications",         note:"Requires Firebase Cloud Messaging setup + service worker. FREE tier available but needs backend config. No upgrade cost — just additional setup.", status:"warn" },
  { icon:"⚠️", name:"Group Chat",                 note:"Not yet implemented. Can be built with current Firebase free tier — needs additional dev work.", status:"warn" },
  { icon:"⚠️", name:"Stickers / GIFs",            note:"Not implemented. Tenor/Giphy APIs are free but require API key setup.", status:"warn" },
  { icon:"💰", name:"Profile Picture Upload",      note:"REQUIRES Firebase Storage (Spark free plan: 5GB). No cost if under limit, but needs Storage rules setup.", status:"cost" },
  { icon:"💰", name:"Media Sharing (photos/video)",note:"REQUIRES Firebase Storage. Large usage may exceed free tier (5GB/1GB transfer/day).", status:"cost" },
  { icon:"💰", name:"Custom Domain",               note:"REQUIRES Firebase Hosting or external DNS — small annual cost for domain.", status:"cost" },
  { icon:"💰", name:"TURN Server (reliable calls)",note:"openrelay.metered.ca is used (free, limited). Production calls NEED a paid TURN server (~$5–20/mo).", status:"cost" },
];

function buildFeatureList() {
  const list = $("feature-list");
  if (!list) return;
  list.innerHTML = "";
  FEATURES.forEach(f => {
    const item = document.createElement("div"); item.className = "feature-item";
    const icon = document.createElement("div"); icon.className = "feature-icon"; icon.textContent = f.icon;
    const info = document.createElement("div"); info.style.flex = "1";
    const name = document.createElement("div"); name.className = "feature-name";
    const statusClass = f.status === "ok" ? "feature-status-ok" : f.status === "cost" ? "feature-status-cost" : "feature-status-warn";
    name.innerHTML = `<span class="${statusClass}">${f.icon}</span> ${f.name}`;
    const note = document.createElement("div"); note.className = "feature-note"; note.textContent = f.note;
    info.appendChild(name); info.appendChild(note);
    item.appendChild(icon); item.appendChild(info);
    list.appendChild(item);
  });
}

// Show feature status on triple-tap the logo in home screen
let logoTaps = 0, logoTapTimer;
document.querySelector(".bar-title")?.addEventListener("click", () => {
  logoTaps++;
  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => logoTaps = 0, 800);
  if (logoTaps >= 3) {
    logoTaps = 0;
    buildFeatureList();
    $("feature-status").classList.remove("hidden");
  }
});
$("btn-close-features")?.addEventListener("click", () => $("feature-status").classList.add("hidden"));

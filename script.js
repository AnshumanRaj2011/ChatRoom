import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  set,
  push,
  onValue,
  remove,
  off
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: "AIzaSyB1jn36w9rpzskOHZujUIWdFyHAJdNYBMQ",
  authDomain: "chatroom-37278.firebaseapp.com",
  databaseURL: "https://chatroom-37278-default-rtdb.firebaseio.com",
  projectId: "chatroom-37278",
  storageBucket: "chatroom-37278.firebasestorage.app",
  messagingSenderId: "738726516362",
  appId: "1:738726516362:web:0dc5ea006158c1d3c9bf73"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ================= SCREENS ================= */
const screens = {
  login: document.getElementById("screen-login"),
  username: document.getElementById("screen-username"),
  home: document.getElementById("screen-home"),
  search: document.getElementById("screen-search"),
  requests: document.getElementById("screen-requests"),
  chat: document.getElementById("screen-chat")
};
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ================= DOM ================= */
const friendsList = document.getElementById("friends-list");
const googleLoginBtn = document.getElementById("google-login-btn");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameInput = document.getElementById("username-input");
const logoutBtn = document.getElementById("btn-logout");

const btnSearch = document.getElementById("btn-search");
const btnBackSearch = document.getElementById("btn-back-search");
const btnRequests = document.getElementById("btn-requests");
const btnBackRequests = document.getElementById("btn-back-requests");

const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const requestList = document.getElementById("request-list");
/* ================= CHAT DOM ================= */
const chatUsername = document.getElementById("chat-username");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const btnBackChat = document.getElementById("btn-back-chat");

/* ======= VIDEO DOM (added) ======= */
// ADD near other DOM refs (chatUsername / video DOM refs):
const btnStartCall = document.getElementById("btn-start-call");
const videoContainer = document.getElementById("video-container");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const btnAnswer = document.getElementById("btn-answer");
const btnHangup = document.getElementById("btn-hangup");

/* ================= STATE ================= */
let currentUID = null;
let friendsListenerRef = null;
let requestsListenerRef = null;

/* 🔥 CHAT STATE (ADD, DO NOT REPLACE) */
let currentChatUID = null;
let chatListenerRef = null;

/* ---------------- Added globals for badge caching and current chat id ---------------- */
let badgeListenerRef = null;
let currentUserBadge = null; // normalized lowercase string or null
let currentChatId = null;

/* ======= Video call state ======= */
let incomingCallDetach = null;
let pendingIncomingCall = null; // { callId, fromUid }
let activeCallId = null;

/* ================= START ================= */
showScreen("login");

/* ================= LOGIN ================= */
googleLoginBtn.onclick = async () => {
  await signInWithPopup(auth, provider);
};

/* ================= AUTH ================= */
onAuthStateChanged(auth, async user => {
  // Clean up previous badge listener (if any)
  if (badgeListenerRef) {
    try { off(badgeListenerRef); } catch (e) { /* ignore */ }
    badgeListenerRef = null;
    currentUserBadge = null;
  }

  if (!user) {
    currentUID = null;
    showScreen("login");
    return;
  }

  currentUID = user.uid;

  let globalCallListenerRef = null;

function startGlobalIncomingCallListener() {
  if (!currentUID) return;

  const refPath = ref(db, `userCalls/${currentUID}`);

  globalCallListenerRef = refPath;

  onValue(refPath, snap => {
    if (!snap.exists()) return;

    snap.forEach(child => {
      const callId = child.key;
      const data = child.val();

      // Prevent duplicate handling
      if (pendingIncomingCall || activeCallId) return;

      pendingIncomingCall = {
        callId,
        fromUid: data.fromUid,
        chatId: data.chatId
      };

      showIncomingCallUI(pendingIncomingCall);
    });
  });
}

  // Subscribe to user's badge in order to detect GOD quickly and update UI
  badgeListenerRef = ref(db, "users/" + currentUID + "/badge");
  onValue(badgeListenerRef, async snap => {
    const b = snap.exists() ? snap.val() : null;
    currentUserBadge =
      (typeof b === "string" && b.length > 0) ? String(b).toLowerCase() : null;

    // If currently in a chat, refresh messages so delete icons update
    if (currentChatId) {
      try {
        const chatSnap = await get(ref(db, `chats/${currentChatId}/messages`));
        await renderChatFromSnapshot(chatSnap, currentChatId);
      } catch (err) {
        console.error("Error refreshing chat after badge change:", err);
      }
    }
  }, err => {
    console.error("Failed to listen user badge:", err);
    currentUserBadge = null;
  });

  const snap = await get(ref(db, "users/" + currentUID));

  if (snap.exists()) {
    showScreen("home");
    loadFriends();
  } else {
    showScreen("username");
  }
});

/* ================= USERNAME ================= */
saveUsernameBtn.onclick = async () => {
  const username = usernameInput.value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,}$/.test(username)) {
    alert("Invalid username");
    return;
  }

  const nameRef = ref(db, "usernames/" + username);
  if ((await get(nameRef)).exists()) {
    alert("Username already taken");
    return;
  }

  await set(nameRef, currentUID);
  await set(ref(db, "users/" + currentUID), { username });

  showScreen("home");
  loadFriends();
};

/* ================= LOGOUT ================= */
logoutBtn.onclick = async () => {
  if (friendsListenerRef) off(friendsListenerRef);
  if (requestsListenerRef) off(requestsListenerRef);
  if (chatListenerRef) off(chatListenerRef);
  if (badgeListenerRef) off(badgeListenerRef);
  if (incomingCallDetach) { try { incomingCallDetach(); } catch(e){} incomingCallDetach = null; }
  await signOut(auth);
  showScreen("login");
  currentChatId = null;
};

/* ================= NAV ================= */
btnSearch.onclick = () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
  showScreen("search");
};
btnBackSearch.onclick = () => showScreen("home");

btnRequests.onclick = () => {
  showScreen("requests");
  loadRequests();
};
btnBackRequests.onclick = () => showScreen("home");

// REPLACE the existing btnBackChat.onclick with this block
btnBackChat.onclick = async () => {
  // If there is an active in-progress call, hang it up first
  if (activeCallId && currentChatId) {
    try {
      // hangupCall cleans PC, local tracks, listeners and removes DB call node
      await hangupCall(db, currentChatId, activeCallId);
    } catch (e) {
      console.error("Failed to hang up active call on back:", e);
    } finally {
      activeCallId = null;
    }
  }


  // detach messages listener
  if (chatListenerRef) off(chatListenerRef);
  chatListenerRef = null;
  currentChatUID = null;
  currentChatId = null;

  // detach incoming call listener for this chat
  if (incomingCallDetach) {
    try { incomingCallDetach(); } catch (e) { console.error(e); }
    incomingCallDetach = null;
  }

  // Reset video UI (stops media elements, hides container)
  resetVideoUI();

  // Re-enable start-call button if disabled
  if (btnStartCall) btnStartCall.disabled = false;

  showScreen("home");
};

  /* ================= START CALL BUTTON ================= */
btnStartCall.addEventListener("click", async () => {
  if (!currentUID || !currentChatUID || !currentChatId) {
    alert("Open a chat first");
    return;
  }

  btnStartCall.disabled = true;
  showVideoUI(true);

  try {
    const { callId } = await startCall(
      db,
      currentChatId,
      currentUID,
      currentChatUID,
      {
        localVideoEl: localVideo,
        remoteVideoEl: remoteVideo
      }
    );

    activeCallId = callId;
    btnHangup.disabled = false;
  } catch (err) {
    console.error("startCall failed:", err);
    btnStartCall.disabled = false;
    resetVideoUI();
    alert("Failed to start call");
  }
});


/* ===============================
   BADGE HELPERS (UNCHANGED)
   =============================== */
// Synchronous badge factory — returns an HTMLElement (safe to append)
function createBadge(type) {
  const span = document.createElement("span");
  const t = String(type || "").toLowerCase();
  span.className = "badge " + t;

  // map type -> visible label/icon
  const labels = {
    verified: "✔",
    vip: "VIP",
    god: "GOD"
  };

  span.textContent = labels[t] || String(type);
  return span;
}

// 🔁 Universal username renderer with badge (async because it reads DB)
async function createUsernameNode(uid) {
  const userSnap = await get(ref(db, "users/" + uid));
  const user = userSnap.val();

  const container = document.createElement("span");
  container.className = "username-node";

  const name = document.createElement("span");
  name.textContent = "@" + (user?.username || "unknown");
  name.className = "username-text";
  container.appendChild(name);

  if (user?.badge) {
    // createBadge is synchronous so appendChild won't throw
    container.appendChild(createBadge(user.badge));
  }

  return container;
}

/* ================= SEARCH ================= */
searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!query) {
    searchResults.innerHTML = `<p class="empty-text">Type a username</p>`;
    return;
  }

  const snap = await get(ref(db, "usernames"));
  if (!snap.exists()) {
    searchResults.innerHTML = `<p class="empty-text">No users yet</p>`;
    return;
  }

  const usernames = snap.val();
  let found = false;

  for (const username in usernames) {
    const uid = usernames[username];

    if (!username.toLowerCase().includes(query)) continue;

    found = true;

    const row = document.createElement("div");
    row.className = "list-item";

    // Use the universal renderer so badges show here too
    const nameNode = await createUsernameNode(uid);
    row.appendChild(nameNode);

    if (uid === currentUID) {
      const you = document.createElement("span");
      you.textContent = "You";
      row.appendChild(you);
      searchResults.appendChild(row);
      continue;
    }

    const btn = document.createElement("button");
    btn.className = "primary-btn";
    btn.textContent = "Add";

    btn.onclick = async () => {
      await set(ref(db, `friend_requests/${uid}/${currentUID}`), {
        time: Date.now()
      });
      btn.textContent = "Sent";
      btn.disabled = true;
    };

    row.appendChild(btn);
    searchResults.appendChild(row);
  }

  if (!found) {
    searchResults.innerHTML = `<p class="empty-text">No match found</p>`;
  }
});

/* ================= REQUESTS ================= */
function loadRequests() {
  requestList.innerHTML = "";

  if (requestsListenerRef) off(requestsListenerRef);
  requestsListenerRef = ref(db, "friend_requests/" + currentUID);

  onValue(requestsListenerRef, async snap => {
    requestList.innerHTML = "";

    if (!snap.exists()) {
      requestList.innerHTML = `<p class="empty-text">No requests</p>`;
      return;
    }

    for (const fromUID of Object.keys(snap.val())) {
      const uSnap = await get(ref(db, "users/" + fromUID));
      if (!uSnap.exists()) continue;

      const row = document.createElement("div");
      row.className = "list-item";

      // Use universal renderer (shows badge if any)
      const name = await createUsernameNode(fromUID);

      const accept = document.createElement("button");
      accept.className = "primary-btn";
      accept.textContent = "Accept";

      const reject = document.createElement("button");
      reject.className = "danger-btn";
      reject.textContent = "Reject";

      accept.onclick = async () => {
        // 1️⃣ Add friends on BOTH sides
        await set(ref(db, `friends/${currentUID}/${fromUID}`), true);
        await set(ref(db, `friends/${fromUID}/${currentUID}`), true);

        // 2️⃣ Remove requests on BOTH sides
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
        await remove(ref(db, `friend_requests/${fromUID}/${currentUID}`));

        // 3️⃣ Switch screen & refresh
        showScreen("home");
        loadFriends();
      };

      reject.onclick = async () => {
        await remove(ref(db, `friend_requests/${currentUID}/${fromUID}`));
      };

      row.appendChild(name);
      row.appendChild(accept);
      row.appendChild(reject);
      requestList.appendChild(row);
    }
  });
}

/* ================= FRIENDS ================= */
function loadFriends() {
  friendsList.innerHTML = "";

  if (!currentUID) return;

  if (friendsListenerRef) off(friendsListenerRef);

  friendsListenerRef = ref(db, "friends/" + currentUID);

  onValue(friendsListenerRef, async snap => {
    friendsList.innerHTML = "";

    if (!snap.exists()) {
      friendsList.innerHTML = `<p class="empty-text">No friends yet</p>`;
      return;
    }

    for (const friendUID of Object.keys(snap.val())) {
      const userSnap = await get(ref(db, "users/" + friendUID));
      if (!userSnap.exists()) continue;

      const row = document.createElement("div");
      row.className = "list-item";

      // Create name with badge
      const nameNode = await createUsernameNode(friendUID);

      const removeBtn = document.createElement("button");
      removeBtn.className = "primary-btn";
      removeBtn.textContent = "Remove";

      removeBtn.onclick = async () => {
        await remove(ref(db, `friends/${currentUID}/${friendUID}`));
        await remove(ref(db, `friends/${friendUID}/${currentUID}`));
      };

      // Keep username string for openChat
      const username = userSnap.val().username || "unknown";
      row.onclick = () => openChat(friendUID, username);

      row.appendChild(nameNode);
      row.appendChild(removeBtn);
      friendsList.appendChild(row);
    }
  });
}

/* =========================
   CHAT: render with delete
   ========================= */

/**
 * Render a snapshot of messages into chatMessages for the given chatId.
 * This is async because createUsernameNode uses async DB calls.
 */
async function renderChatFromSnapshot(snap, chatId) {
  chatMessages.innerHTML = "";

  if (!snap || !snap.exists()) return;

  // Build element promises in the same order as messages in snapshot
  const elems = [];
  snap.forEach(childSnap => {
    elems.push(buildMessageElement(childSnap));
  });

  const built = await Promise.all(elems);

  for (const el of built) {
    chatMessages.appendChild(el);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Build a message DOM element from a child snapshot.
 * Shows the delete icon (❌) if (msg.from === currentUID) OR currentUserBadge === "god".
 * When clicked it calls remove(childSnap.ref).
 */
async function buildMessageElement(childSnap) {
  const data = childSnap.val() || {};
  const fromUid = data.from || null;
  const text = data.text || "";
  const time = data.time || null;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message " + (fromUid === currentUID ? "me" : "other");

  // Left: author node (username + badge)
  const authorNode = await createUsernameNode(fromUid);
  authorNode.classList.add("message-author");
  wrapper.appendChild(authorNode);

  // Middle: message text
  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  wrapper.appendChild(content);

  // Timestamp (optional)
  const ts = document.createElement("div");
  ts.className = "message-time";
  ts.textContent = time ? new Date(time).toLocaleTimeString() : "";
  wrapper.appendChild(ts);

  // Controls container
  const controls = document.createElement("div");
  controls.className = "message-controls";
  wrapper.appendChild(controls);

  // Determine delete permission
  const isOwner = (currentUID && fromUid && currentUID === fromUid);
  const isGod = (currentUserBadge === "god");
  const canDelete = isOwner || isGod;

  if (canDelete) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "message-delete-btn";
    delBtn.setAttribute("aria-label", "Delete message");
    delBtn.textContent = "❌";

    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      delBtn.disabled = true;
      try {
        // Use remove on the snapshot's ref per your requirement
        await remove(childSnap.ref);
        // The onValue listener will re-render and remove the element.
        // As immediate feedback, remove from DOM now.
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      } catch (err) {
        console.error("Failed to delete message:", err);
        delBtn.disabled = false;
        alert("Failed to delete message.");
      }
    });

    controls.appendChild(delBtn);
  }

  return wrapper;
}

function openChat(friendUID, username) {
  currentChatUID = friendUID;
  chatUsername.textContent = "@" + username;
  chatMessages.innerHTML = "";

  showScreen("chat");

  const chatId =
    currentUID < friendUID
      ? currentUID + "_" + friendUID
      : friendUID + "_" + currentUID;

  // Save for badge-change refreshes
  currentChatId = chatId;

  // ✅ CREATE CHAT MEMBERS (REQUIRED FOR FIREBASE RULES)
  set(ref(db, "chats/" + chatId + "/members/" + currentUID), true);
  set(ref(db, "chats/" + chatId + "/members/" + friendUID), true);

  if (chatListenerRef) off(chatListenerRef);

  chatListenerRef = ref(db, "chats/" + chatId + "/messages");
  onValue(chatListenerRef, async snap => {
    try {
      await renderChatFromSnapshot(snap, chatId);
    } catch (err) {
      console.error("Failed rendering chat messages:", err);
    }
  });

  // Setup incoming call listener for this chat
  if (incomingCallDetach) {
    try { incomingCallDetach(); } catch (e) {}
    incomingCallDetach = null;
  }
  incomingCallDetach = listenForIncomingCalls(db, chatId, currentUID, async ({ callId, offer, fromUid }) => {
    if (activeCallId) {
      // ignore incoming if already in a call
      return;
    }
    pendingIncomingCall = { callId, fromUid };
    btnAnswer.disabled = false;
    btnStartCall.disabled = true;
    showVideoUI(true);

    // Optionally fetch caller username and show in UI (left as improvement)
    // You can use createUsernameNode(fromUid) to show name.
  });
}

/* ================= SEND MESSAGE ================= */
chatForm.onsubmit = async e => {
  e.preventDefault();

  if (!chatInput.value.trim() || !currentChatUID) return;

  const chatId =
    currentUID < currentChatUID
      ? currentUID + "_" + currentChatUID
      : currentChatUID + "_" + currentUID;

  await push(ref(db, "chats/" + chatId + "/messages"), {
    from: currentUID,
    text: chatInput.value.trim(),
    time: Date.now()
  });

  chatInput.value = "";
};

/* ================= Video call implementation (integrated) ================= */

/*
 Signaling layout:
 chats/{chatId}/calls/{callId}/offer
                                   /answer
                                   /candidates/caller/{pushId}
                                                     /callee/{pushId}
*/

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};
// Internal state
const localStreams = new Map();
const peerConnections = new Map();
const dbListeners = new Map();

function callsRef(dbInstance, chatId) { return ref(dbInstance, `chats/${chatId}/calls`); }
function callRef(dbInstance, chatId, callId) { return ref(dbInstance, `chats/${chatId}/calls/${callId}`); }
function offerRef(dbInstance, chatId, callId) { return ref(dbInstance, `chats/${chatId}/calls/${callId}/offer`); }
function answerRef(dbInstance, chatId, callId) { return ref(dbInstance, `chats/${chatId}/calls/${callId}/answer`); }
function candidatesRef(dbInstance, chatId, callId, side) { return ref(dbInstance, `chats/${chatId}/calls/${callId}/candidates/${side}`); }

/* Listen for incoming calls in a chat */
export function listenForIncomingCalls(db, chatId, currentUid, onIncoming) {
  const root = callsRef(db, chatId);
  const handled = new Set();

  const listener = snapshot => {
    snapshot.forEach(child => {
      const callId = child.key;
      const call = child.val();

      if (
        call?.offer &&
        !call?.answer &&
        call.offer.uid !== currentUid &&
        !handled.has(callId)
      ) {
        handled.add(callId);
        onIncoming({ callId, offer: call.offer, fromUid: call.offer.uid });
      }
    });
  };

  onValue(root, listener);
  return () => off(root, "value", listener);
}
/* Start a call (caller) */
export async function startCall(dbInstance, chatId, callerUid, calleeUid, ctx) {
  const { localVideoEl, remoteVideoEl } = ctx || {};
  const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  if (localVideoEl) {
    localVideoEl.srcObject = localStream;
    localVideoEl.muted = true;
    localVideoEl.play().catch(()=>{});
  }

  const pc = new RTCPeerConnection(ICE_CONFIG);
  const callId = push(callsRef(dbInstance, chatId)).key;

  localStreams.set(callId, localStream);
  peerConnections.set(callId, pc);
  dbListeners.set(callId, []);

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  const remoteStream = new MediaStream();
  if (remoteVideoEl) {
    remoteVideoEl.srcObject = remoteStream;
    remoteVideoEl.play().catch(()=>{});
  }
  pc.ontrack = event => {
    event.streams.forEach(s => s.getTracks().forEach(t => remoteStream.addTrack(t)));
  };

  pc.onicecandidate = event => {
    if (!event.candidate) return;
    const cRef = candidatesRef(dbInstance, chatId, callId, "caller");
    push(cRef).then(p => set(p, event.candidate.toJSON())).catch(console.error);
  };

  const offerDesc = await pc.createOffer();
  await pc.setLocalDescription(offerDesc);

  await set(offerRef(dbInstance, chatId, callId), {
    sdp: offerDesc.sdp,
    type: offerDesc.type,
    uid: callerUid,
    calleeUid: calleeUid || null,
    timestamp: Date.now()
  });

  // listen for answer
  const ansRef = answerRef(dbInstance, chatId, callId);
  const ansListener = async snap => {
    if (!snap.exists()) return;
    const a = snap.val();
    if (a && a.sdp) {
      const remoteDesc = { type: a.type || "answer", sdp: a.sdp };
      await pc.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    }
  };
  onValue(ansRef, ansListener);
  dbListeners.get(callId).push({ ref: ansRef, listener: ansListener });

  // listen for callee ICE
  const calleeCandidatesRef = candidatesRef(dbInstance, chatId, callId, "callee");
  const calleeListener = snap => {
    if (!snap.exists()) return;
    snap.forEach(child => {
      const cand = child.val();
      if (cand) pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
    });
  };
  onValue(calleeCandidatesRef, calleeListener);
  dbListeners.get(callId).push({ ref: calleeCandidatesRef, listener: calleeListener });

  return { callId };
}

/* Answer a call (callee) */
export async function answerCall(dbInstance, chatId, callId, calleeUid, ctx) {
  const { localVideoEl, remoteVideoEl } = ctx || {};
  const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  if (localVideoEl) {
    localVideoEl.srcObject = localStream;
    localVideoEl.muted = true;
    localVideoEl.play().catch(()=>{});
  }

  const pc = new RTCPeerConnection(ICE_CONFIG);
  localStreams.set(callId, localStream);
  peerConnections.set(callId, pc);
  dbListeners.set(callId, []);

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  const remoteStream = new MediaStream();
  if (remoteVideoEl) {
    remoteVideoEl.srcObject = remoteStream;
    remoteVideoEl.play().catch(()=>{});
  }
  pc.ontrack = event => {
    event.streams.forEach(s => s.getTracks().forEach(t => remoteStream.addTrack(t)));
  };

  pc.onicecandidate = event => {
    if (!event.candidate) return;
    const cRef = candidatesRef(dbInstance, chatId, callId, "callee");
    push(cRef).then(p => set(p, event.candidate.toJSON())).catch(console.error);
  };

  // read offer once
  const offerSnap = await get(offerRef(dbInstance, chatId, callId));
  if (!offerSnap.exists()) throw new Error("Offer not found");
  const offer = offerSnap.val();
  const offerDesc = { type: offer.type || "offer", sdp: offer.sdp };
  await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));

  const answerDesc = await pc.createAnswer();
  await pc.setLocalDescription(answerDesc);

  await set(answerRef(dbInstance, chatId, callId), {
    sdp: answerDesc.sdp,
    type: answerDesc.type,
    uid: calleeUid,
    timestamp: Date.now()
  });

  // listen for caller candidates
  const callerCandidatesRef = candidatesRef(dbInstance, chatId, callId, "caller");
  const callerListener = snap => {
    if (!snap.exists()) return;
    snap.forEach(child => {
      const cand = child.val();
      if (cand) pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
    });
  };
  onValue(callerCandidatesRef, callerListener);
  dbListeners.get(callId).push({ ref: callerCandidatesRef, listener: callerListener });

  return { callId };
}

/* Hangup & cleanup */
export async function hangupCall(dbInstance, chatId, callId) {
  const pc = peerConnections.get(callId);
  if (pc) { try { pc.close(); } catch(e){} peerConnections.delete(callId); }

  const s = localStreams.get(callId);
  if (s) { s.getTracks().forEach(t => t.stop()); localStreams.delete(callId); }

  const listeners = dbListeners.get(callId) || [];
  for (const { ref: r, listener } of listeners) {
    try { off(r, "value", listener); } catch (e) {}
  }
  dbListeners.delete(callId);

  try { await remove(callRef(dbInstance, chatId, callId)); } catch (err) { console.error("Failed to remove call node:", err); }
}

/* ================= Video UI helpers and wiring (client-side) ================= */

function showVideoUI(show) {
  if (!videoContainer) return;
  videoContainer.classList.toggle("hidden", !show);
}

function resetVideoUI() {
  showVideoUI(false);

  btnAnswer.disabled = true;
  btnHangup.disabled = true;
  pendingIncomingCall = null;
  activeCallId = null;

  try {
    if (localVideo && localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(t => t.stop());
      localVideo.srcObject = null;
    }
  } catch (e) {}

  try {
    if (remoteVideo) {
      remoteVideo.srcObject = null;
    }
  } catch (e) {}
}
/* ================= ANSWER CALL BUTTON ================= */
btnAnswer.addEventListener("click", async () => {
  if (!pendingIncomingCall || !currentChatId || !currentUID) return;

  btnAnswer.disabled = true;
  showVideoUI(true);

  try {
    await answerCall(
      db,
      currentChatId,
      pendingIncomingCall.callId,
      currentUID,
      {
        localVideoEl: localVideo,
        remoteVideoEl: remoteVideo
      }
    );

    activeCallId = pendingIncomingCall.callId;
    pendingIncomingCall = null;
    btnHangup.disabled = false;
  } catch (err) {
    console.error("answerCall failed:", err);
    alert("Failed to answer call");
    resetVideoUI();
  }
});

/* ================= HANGUP BUTTON ================= */
btnHangup.addEventListener("click", async () => {
  try {
    if (activeCallId && currentChatId) {
      await hangupCall(db, currentChatId, activeCallId);
    } else if (pendingIncomingCall && currentChatId) {
      await hangupCall(db, currentChatId, pendingIncomingCall.callId);
      pendingIncomingCall = null;
    }
  } catch (err) {
    console.error("hangupCall failed:", err);
  } finally {
    resetVideoUI();
    if (btnStartCall) btnStartCall.disabled = false;
  }
});
/* ================= End of file ================= */

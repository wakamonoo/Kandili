import { db, auth, FieldValue } from "./firebase.js";
import { DOM } from "./dom.js";
import { Toast, showLoadingOverlay, hideLoadingOverlay } from "./ui.js";
import { getCurrentUserProfile } from "./auth.js";

let searchTimeout;

// ━━━━━━━━━━━━━━━━━━ Setup Listeners for Friend-Related UI ━━━━━━━━━━━━━━━━━━ //
export function setupFriendListeners() {
  // ── Add Friend Modal ──
  DOM.addFriendBtn.onclick = () => {
    DOM.addFriendModal.classList.remove("hidden");
    DOM.addFriendSearchInput.value = "";
    DOM.addFriendSearchResults.innerHTML = "";
  };

  DOM.closeAddFriendModalBtn.onclick = () => {
    DOM.addFriendModal.classList.add("hidden");
  };

  DOM.addFriendSearchInput.onkeyup = (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleFriendSearch(e), 300);
  };

  // ── Friend Requests Modal ──
  DOM.friendRequestsBtn.onclick = async () => {
    DOM.friendRequestsModal.classList.remove("hidden");
    await loadFriendRequests();
  };

  DOM.closeFriendRequestsModalBtn.onclick = () => {
    DOM.friendRequestsModal.classList.add("hidden");
  };
}

// ━━━━━━━━━━━━━━━━━━ Handle Friend Search ━━━━━━━━━━━━━━━━━━ //
async function handleFriendSearch(e) {
  const termRaw = e.target.value.trim();
  const term = termRaw.toLowerCase();
  DOM.addFriendSearchResults.innerHTML = "";

  if (term.length < 3) {
    DOM.addFriendSearchResults.innerHTML = `
      <p class="text-gray-500 text-center py-4">
        Type at least 3 characters to search
      </p>
    `;
    return;
  }

  showLoadingOverlay();

  try {
    const usersRef = db.collection("users");

    const nameQuery = usersRef
      .where("displayNameLower", ">=", term)
      .where("displayNameLower", "<=", term + "\uf8ff")
      .limit(10)
      .get();

    const emailQuery = usersRef
      .where("emailLower", ">=", term)
      .where("emailLower", "<=", term + "\uf8ff")
      .limit(10)
      .get();

    const [nameSnap, emailSnap] = await Promise.all([nameQuery, emailQuery]);

    hideLoadingOverlay();

    const docs = [];
    const seen = new Set();

    [nameSnap, emailSnap].forEach((snap) => {
      snap.forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          docs.push(doc);
        }
      });
    });

    if (docs.length === 0) {
      DOM.addFriendSearchResults.innerHTML = `
        <p class="text-gray-500 text-center py-4">
          No users found for "${termRaw}"
        </p>
      `;
      return;
    }

    renderSearchResults(docs);
  } catch (err) {
    hideLoadingOverlay();
    console.error("Search error:", err);
    DOM.addFriendSearchResults.innerHTML = `
      <p class="text-red-500 text-center py-4">
        Search failed: ${err.message}
      </p>
    `;
  }
}

// ━━━━━━━━━━━━━━━━━━ Render Search Results ━━━━━━━━━━━━━━━━━━ //
function renderSearchResults(userDocs) {
  const profile = getCurrentUserProfile();

  userDocs.forEach((doc) => {
    const data = doc.data();
    if (data.uid === auth.currentUser.uid) return;

    const isFriend = profile.friends.includes(data.uid);
    const isPendingSent = profile.sentRequests?.includes(data.uid);
    const isPendingReceived = profile.pendingRequests?.includes(data.uid);

    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0";
    row.innerHTML = `
      <div class="flex items-center">
        <img src="${data.photoURL || "https://via.placeholder.com/40"}"
             alt="${data.displayName}"
             class="w-10 h-10 rounded-full mr-3">
        <div>
          <p class="font-semibold">${data.displayName}</p>
          <p class="text-sm text-gray-500">${data.email || "No email"}</p>
        </div>
      </div>
      <div>
        ${
          isFriend
            ? '<span class="text-green-500 text-sm">Friends</span>'
            : isPendingReceived
            ? '<button class="px-3 py-1 rounded-md bg-rose-200 text-rose-800 text-sm" disabled>Request Sent To You</button>'
            : isPendingSent
            ? '<button class="px-3 py-1 rounded-md bg-gray-200 text-gray-600 text-sm" disabled>Pending</button>'
            : `<button class="send-friend-request-btn px-3 py-1 rounded-md bg-rose-500 text-white hover:bg-rose-600 text-sm"
                       data-target-uid="${data.uid}">Add Friend</button>`
        }
      </div>
    `;
    DOM.addFriendSearchResults.append(row);

    if (!isFriend && !isPendingSent && !isPendingReceived) {
      row.querySelector(".send-friend-request-btn").onclick = async (evt) => {
        const targetUid = evt.target.dataset.targetUid;
        await sendFriendRequest(targetUid);
        evt.target.disabled = true;
        evt.target.textContent = "Pending";
        evt.target.classList.replace("bg-rose-500", "bg-gray-200");
        evt.target.classList.replace("hover:bg-rose-600", "text-gray-600");
      };
    }
  });
}

// ━━━━━━━━━━━━━━━━━━ Send Friend Request ━━━━━━━━━━━━━━━━━━ //
async function sendFriendRequest(targetUid) {
  const currentUid = auth.currentUser.uid;
  const targetRef = db.collection("users").doc(targetUid);
  const currentUserRef = db.collection("users").doc(currentUid);

  try {
    await targetRef.update({
      pendingRequests: FieldValue.arrayUnion(currentUid),
    });

    await currentUserRef.update({
      sentRequests: FieldValue.arrayUnion(targetUid),
    });

    Toast.fire({ icon: "success", title: "Friend request sent!" });
  } catch (err) {
    console.error("Send request error:", err);
    Swal.fire({
      icon: "error",
      title: "Failed to send request",
      text: err.message || "Please try again later",
    });
  }
}

// ━━━━━━━━━━━━━━━━━━ Load Incoming Friend Requests ━━━━━━━━━━━━━━━━━━ //
async function loadFriendRequests() {
  DOM.friendRequestsList.innerHTML = "";

  const profile = getCurrentUserProfile();
  const pending = profile?.pendingRequests || [];

  if (pending.length === 0) {
    DOM.friendRequestsList.innerHTML = `
      <p class="text-gray-500 text-center py-6">
        No pending friend requests
      </p>
    `;
    return;
  }

  showLoadingOverlay();
  try {
    const snaps = await db
      .collection("users")
      .where(firebase.firestore.FieldPath.documentId(), "in", pending)
      .get();

    hideLoadingOverlay();

    if (snaps.empty) {
      DOM.friendRequestsList.innerHTML = `
        <p class="text-gray-500 text-center py-6">
          No pending friend requests
        </p>
      `;
      return;
    }

    snaps.forEach((doc) => renderRequestRow(doc.data()));
  } catch (err) {
    hideLoadingOverlay();
    console.error("Load requests error:", err);
    DOM.friendRequestsList.innerHTML = `
      <p class="text-red-500 text-center py-6">
        Failed to load requests: ${err.message}
      </p>
    `;
  }
}

// ━━━━━━━━━━━━━━━━━━ Render Friend Request Row ━━━━━━━━━━━━━━━━━━ //
function renderRequestRow(data) {
  const uid = data.uid;

  const row = document.createElement("div");
  row.className =
    "flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0";
  row.innerHTML = `
    <div class="flex items-center">
      <img src="${data.photoURL || "https://via.placeholder.com/40"}"
           alt="${data.displayName}"
           class="w-10 h-10 rounded-full mr-3">
      <div>
        <p class="font-semibold">${data.displayName}</p>
        <p class="text-sm text-gray-500">${data.email || "No email"}</p>
      </div>
    </div>
    <div class="space-x-2">
      <button class="accept-request-btn px-3 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 text-sm"
              data-uid="${uid}">Accept</button>
      <button class="reject-request-btn px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm"
              data-uid="${uid}">Reject</button>
    </div>
  `;
  DOM.friendRequestsList.append(row);

  row.querySelector(".accept-request-btn").onclick = () =>
    handleFriendRequest(uid, true);
  row.querySelector(".reject-request-btn").onclick = () =>
    handleFriendRequest(uid, false);
}

// ━━━━━━━━━━━━━━━━━━ Accept or Reject Friend Request ━━━━━━━━━━━━━━━━━━ //
async function handleFriendRequest(requestorUid, accept) {
  const currentUid = auth.currentUser.uid;
  const db = firebase.firestore();
  const currentRef = db.collection("users").doc(currentUid);
  const requestorRef = db.collection("users").doc(requestorUid);

  showLoadingOverlay();
  try {
    await db.runTransaction(async (tx) => {
      if (accept) {
        tx.update(currentRef, {
          friends: firebase.firestore.FieldValue.arrayUnion(requestorUid),
          pendingRequests:
            firebase.firestore.FieldValue.arrayRemove(requestorUid),
        });
        tx.update(requestorRef, {
          friends: firebase.firestore.FieldValue.arrayUnion(currentUid),
          sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUid),
        });
      } else {
        tx.update(currentRef, {
          pendingRequests:
            firebase.firestore.FieldValue.arrayRemove(requestorUid),
        });
        tx.update(requestorRef, {
          sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUid),
        });
      }
    });

    Toast.fire({
      icon: "success",
      title: accept ? "Friend request accepted!" : "Friend request rejected",
    });
    await loadFriendRequests();
  } catch (err) {
    console.error("Handle request error:", err);
    Swal.fire({
      icon: "error",
      title: "Action failed",
      text: err.message || "Please try again later",
    });
  } finally {
    hideLoadingOverlay();
  }
}

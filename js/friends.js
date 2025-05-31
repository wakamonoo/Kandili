// js/friends.js
// -----------------------------------------------------------------------------
// Friends & requests logic for Tsunagari – Love Diary
// -----------------------------------------------------------------------------

import { db, auth, FieldValue } from "./firebase.js";
import { DOM } from "./dom.js";
import {
  Toast,
  showLoadingOverlay,
  hideLoadingOverlay,
  showAddFriendModal,
  hideAddFriendModal,
  showFriendRequestsModal,
  hideFriendRequestsModal,
} from "./ui.js";
import { getCurrentUserProfile } from "./auth.js";

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------
export function setupFriendListeners() {
  /* ---------- “Add friend” modal ---------- */
  DOM.addFriendBtn.onclick = () => {
    showAddFriendModal();
    DOM.addFriendSearchInput.value = "";
    DOM.addFriendSearchResults.innerHTML = "";
  };

  DOM.closeAddFriendModalBtn.onclick = hideAddFriendModal;

  DOM.addFriendSearchInput.onkeyup = handleFriendSearch;

  /* ---------- “Friend requests” modal ---------- */
  DOM.friendRequestsBtn.onclick = async () => {
    showFriendRequestsModal();
    await loadFriendRequests();
  };

  DOM.closeFriendRequestsModalBtn.onclick = hideFriendRequestsModal;
}

// -----------------------------------------------------------------------------
// Search helpers
// -----------------------------------------------------------------------------
async function handleFriendSearch(e) {
  const termRaw = e.target.value.trim();
  const term = termRaw.toLowerCase();
  DOM.addFriendSearchResults.innerHTML = "";

  if (term.length < 3) return; // minimum characters

  showLoadingOverlay();

  try {
    const usersRef = db.collection("users");

    // ------------------------------------------------------------------
    // Build two parallel queries (Firestore has no OR operator):
    //   1. displayNameLower  (prefix match)
    //   2. emailLower        (prefix match)
    // ------------------------------------------------------------------
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

    // Merge snapshots, deduplicate by uid / doc ID
    const docs = [];
    const seen = new Set();
    [nameSnap, emailSnap].forEach((snap) =>
      snap.forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          docs.push(doc);
        }
      })
    );

    if (docs.length === 0) {
      DOM.addFriendSearchResults.innerHTML =
        '<p class="text-gray-500 text-center">No users found.</p>';
      return;
    }

    renderSearchResults(docs);
  } catch (err) {
    hideLoadingOverlay();
    Swal.fire({
      icon: "error",
      title: "Search failed",
      text: err.message,
    });
  }
}

function renderSearchResults(userDocs) {
  const profile = getCurrentUserProfile();

  userDocs.forEach((doc) => {
    const data = doc.data();
    if (data.uid === auth.currentUser.uid) return; // skip self

    const isFriend = profile.friends.includes(data.uid);
    const isPendingSent = profile.pendingRequests.includes(data.uid);
    const isPendingReceived =
      data.pendingRequests &&
      data.pendingRequests.includes(auth.currentUser.uid);

    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between p-2 border-b border-gray-200 last:border-b-0";
    row.innerHTML = `
      <div class="flex items-center">
        <img src="${data.photoURL || "https://via.placeholder.com/24"}"
             alt="${data.displayName}"
             class="w-8 h-8 rounded-full mr-3">
        <div>
          <p class="font-semibold">${data.displayName}</p>
          <p class="text-sm text-gray-500">${data.email || ""}</p>
        </div>
      </div>
      <div>
        ${
          isFriend
            ? '<span class="text-green-500 text-sm">Friends</span>'
            : isPendingReceived
            ? '<button class="px-3 py-1 rounded-md bg-rose-200 text-rose-800 text-sm" disabled>Request&nbsp;Sent&nbsp;To&nbsp;You</button>'
            : isPendingSent
            ? '<button class="px-3 py-1 rounded-md bg-gray-200 text-gray-600 text-sm" disabled>Pending</button>'
            : `<button class="send-friend-request-btn px-3 py-1 rounded-md bg-rose-500 text-white hover:bg-rose-600 text-sm"
                       data-target-uid="${data.uid}">Add&nbsp;Friend</button>`
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
        evt.target.classList.remove("bg-rose-500", "hover:bg-rose-600");
        evt.target.classList.add("bg-gray-200", "text-gray-600");
      };
    }
  });
}

// -----------------------------------------------------------------------------
// Friend-request helpers
// -----------------------------------------------------------------------------
async function sendFriendRequest(targetUid) {
  const currentUid = auth.currentUser.uid;
  const targetRef = db.collection("users").doc(targetUid);

  try {
    await targetRef.update({
      pendingRequests: FieldValue.arrayUnion(currentUid),
    });
    Toast.fire({ icon: "success", title: "Friend request sent!" });
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Failed to send request",
      text: err.message,
    });
  }
}

async function loadFriendRequests() {
  DOM.friendRequestsList.innerHTML = "";

  const profile = getCurrentUserProfile();
  const pending = profile?.pendingRequests ?? [];

  if (pending.length === 0) {
    DOM.friendRequestsList.innerHTML =
      '<p class="text-gray-500 text-center">No pending friend requests.</p>';
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
      DOM.friendRequestsList.innerHTML =
        '<p class="text-gray-500 text-center">No pending friend requests.</p>';
      return;
    }

    snaps.forEach((doc) => renderRequestRow(doc.data()));
  } catch (err) {
    hideLoadingOverlay();
    Swal.fire({
      icon: "error",
      title: "Failed to load requests",
      text: err.message,
    });
  }
}

function renderRequestRow(data) {
  const uid = data.uid;

  const row = document.createElement("div");
  row.className =
    "flex items-center justify-between p-2 border-b border-gray-200 last:border-b-0";
  row.innerHTML = `
    <div class="flex items-center">
      <img src="${data.photoURL || "https://via.placeholder.com/24"}"
           alt="${data.displayName}"
           class="w-8 h-8 rounded-full mr-3">
      <p class="font-semibold">${data.displayName}</p>
    </div>
    <div class="space-x-2">
      <button class="accept-request-btn px-3 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 text-sm"
              data-uid="${uid}">Accept</button>
      <button class="reject-request-btn px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 text-sm"
              data-uid="${uid}">Reject</button>
    </div>
  `;
  DOM.friendRequestsList.append(row);

  row.querySelector(".accept-request-btn").onclick = () =>
    handleFriendRequest(uid, true);
  row.querySelector(".reject-request-btn").onclick = () =>
    handleFriendRequest(uid, false);
}

async function handleFriendRequest(requestorUid, accept) {
  const currentUid = auth.currentUser.uid;
  const currentRef = db.collection("users").doc(currentUid);
  const requestorRef = db.collection("users").doc(requestorUid);

  showLoadingOverlay();
  try {
    if (accept) {
      await currentRef.update({
        friends: FieldValue.arrayUnion(requestorUid),
        pendingRequests: FieldValue.arrayRemove(requestorUid),
      });
      await requestorRef.update({
        friends: FieldValue.arrayUnion(currentUid),
      });
      Toast.fire({ icon: "success", title: "Friend request accepted!" });
    } else {
      await currentRef.update({
        pendingRequests: FieldValue.arrayRemove(requestorUid),
      });
      Toast.fire({ icon: "info", title: "Friend request rejected." });
    }
    await loadFriendRequests(); // refresh list
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Action failed",
      text: err.message,
    });
  } finally {
    hideLoadingOverlay();
  }
}

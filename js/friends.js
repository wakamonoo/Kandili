// js/friends.js

import { db, auth, FieldValue } from './firebase.js';
import { DOM } from './dom.js';
import { Toast, showLoadingOverlay, hideLoadingOverlay, showAddFriendModal, hideAddFriendModal, showFriendRequestsModal, hideFriendRequestsModal } from './ui.js';
import { getCurrentUserProfile } from './auth.js'; // Import to get current user's profile

export function setupFriendListeners() {
  DOM.addFriendBtn.onclick = () => {
    showAddFriendModal();
    DOM.addFriendSearchInput.value = "";
    DOM.addFriendSearchResults.innerHTML = "";
  };

  DOM.closeAddFriendModalBtn.onclick = () => {
    hideAddFriendModal();
  };

  DOM.addFriendSearchInput.onkeyup = async (e) => {
    const searchTerm = e.target.value.trim();
    DOM.addFriendSearchResults.innerHTML = "";

    if (searchTerm.length < 3) return; // Minimum 3 characters for search

    showLoadingOverlay();
    try {
      const usersRef = db.collection("users");
      const querySnapshot = await usersRef
        .where("displayName", ">=", searchTerm)
        .where("displayName", "<=", searchTerm + '\uf8ff')
        .limit(10)
        .get();

      hideLoadingOverlay();

      if (querySnapshot.empty) {
        DOM.addFriendSearchResults.innerHTML = '<p class="text-gray-500 text-center">No users found.</p>';
        return;
      }

      const currentUserProfile = getCurrentUserProfile();

      querySnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        if (userData.uid === auth.currentUser.uid) return; // Don't show self

        const isFriend = currentUserProfile.friends.includes(userData.uid);
        const isPendingSent = currentUserProfile.pendingRequests.includes(userData.uid); // Request sent by me to them
        const isPendingReceived = userData.pendingRequests && userData.pendingRequests.includes(auth.currentUser.uid); // Request sent by them to me

        const resultDiv = document.createElement("div");
        resultDiv.className = "flex items-center justify-between p-2 border-b border-gray-200 last:border-b-0";
        resultDiv.innerHTML = `
          <div class="flex items-center">
            <img src="${userData.photoURL || 'https://via.placeholder.com/24'}" alt="${userData.displayName}" class="w-8 h-8 rounded-full mr-3">
            <p class="font-semibold">${userData.displayName}</p>
          </div>
          <div>
            ${isFriend ? '<span class="text-green-500 text-sm">Friends</span>' :
              isPendingReceived ? '<button class="px-3 py-1 rounded-md bg-rose-200 text-rose-800 text-sm" disabled>Request Sent To You</button>' :
              isPendingSent ? '<button class="px-3 py-1 rounded-md bg-gray-200 text-gray-600 text-sm" disabled>Pending</button>' :
              `<button class="send-friend-request-btn px-3 py-1 rounded-md bg-rose-500 text-white hover:bg-rose-600 text-sm" data-target-uid="${userData.uid}">Add Friend</button>`
            }
          </div>
        `;
        DOM.addFriendSearchResults.append(resultDiv);

        if (!isFriend && !isPendingSent && !isPendingReceived) {
          resultDiv.querySelector(".send-friend-request-btn").onclick = async (e) => {
            const targetUid = e.target.dataset.targetUid;
            await sendFriendRequest(targetUid);
            e.target.disabled = true;
            e.target.textContent = "Pending";
            e.target.classList.remove("bg-rose-500", "hover:bg-rose-600");
            e.target.classList.add("bg-gray-200", "text-gray-600");
          };
        }
      });

    } catch (e) {
      hideLoadingOverlay();
      Swal.fire({ icon: "error", title: "Search failed", text: e.message });
    }
  };


  DOM.friendRequestsBtn.onclick = async () => {
    showFriendRequestsModal();
    await loadFriendRequests();
  };

  DOM.closeFriendRequestsModalBtn.onclick = () => {
    hideFriendRequestsModal();
  };
}

async function sendFriendRequest(targetUid) {
  const currentUserUid = auth.currentUser.uid;
  const targetUserRef = db.collection("users").doc(targetUid);

  try {
    await targetUserRef.update({
      pendingRequests: FieldValue.arrayUnion(currentUserUid)
    });
    Toast.fire({ icon: "success", title: "Friend request sent!" });
  } catch (e) {
    Swal.fire({ icon: "error", title: "Failed to send request", text: e.message });
  }
}

async function loadFriendRequests() {
  DOM.friendRequestsList.innerHTML = "";
  const currentUserProfile = getCurrentUserProfile();

  if (!currentUserProfile || !currentUserProfile.pendingRequests || currentUserProfile.pendingRequests.length === 0) {
    DOM.friendRequestsList.innerHTML = '<p class="text-gray-500 text-center">No pending friend requests.</p>';
    return;
  }

  showLoadingOverlay();
  try {
    const requestorUids = currentUserProfile.pendingRequests;
    const requestorSnaps = await db.collection("users").where(firebase.firestore.FieldPath.documentId(), 'in', requestorUids).get();

    hideLoadingOverlay();

    if (requestorSnaps.empty) {
      DOM.friendRequestsList.innerHTML = '<p class="text-gray-500 text-center">No pending friend requests.</p>';
      return;
    }

    requestorSnaps.forEach(requestorDoc => {
      const requestorData = requestorDoc.data();
      const requestorUid = requestorData.uid;

      const requestDiv = document.createElement("div");
      requestDiv.className = "flex items-center justify-between p-2 border-b border-gray-200 last:border-b-0";
      requestDiv.innerHTML = `
        <div class="flex items-center">
          <img src="${requestorData.photoURL || 'https://via.placeholder.com/24'}" alt="${requestorData.displayName}" class="w-8 h-8 rounded-full mr-3">
          <p class="font-semibold">${requestorData.displayName}</p>
        </div>
        <div class="space-x-2">
          <button class="accept-request-btn px-3 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 text-sm" data-requestor-uid="${requestorUid}">Accept</button>
          <button class="reject-request-btn px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 text-sm" data-requestor-uid="${requestorUid}">Reject</button>
        </div>
      `;
      DOM.friendRequestsList.append(requestDiv);

      requestDiv.querySelector(".accept-request-btn").onclick = async () => {
        await handleFriendRequest(requestorUid, true);
      };
      requestDiv.querySelector(".reject-request-btn").onclick = async () => {
        await handleFriendRequest(requestorUid, false);
      };
    });
  } catch (e) {
    hideLoadingOverlay();
    Swal.fire({ icon: "error", title: "Failed to load requests", text: e.message });
  }
}

async function handleFriendRequest(requestorUid, accept) {
  const currentUserUid = auth.currentUser.uid;
  const currentUserRef = db.collection("users").doc(currentUserUid);
  const requestorUserRef = db.collection("users").doc(requestorUid);

  showLoadingOverlay();
  try {
    if (accept) {
      // Add each other to friends list
      await currentUserRef.update({
        friends: FieldValue.arrayUnion(requestorUid),
        pendingRequests: FieldValue.arrayRemove(requestorUid),
      });
      await requestorUserRef.update({
        friends: FieldValue.arrayUnion(currentUserUid),
      });
      Toast.fire({ icon: "success", title: "Friend request accepted!" });
    } else {
      // Just remove from pending requests
      await currentUserRef.update({
        pendingRequests: FieldValue.arrayRemove(requestorUid),
      });
      Toast.fire({ icon: "info", title: "Friend request rejected." });
    }
    await loadFriendRequests(); // Reload requests after action
  } catch (e) {
    Swal.fire({ icon: "error", title: "Action failed", text: e.message });
  } finally {
    hideLoadingOverlay();
  }
}
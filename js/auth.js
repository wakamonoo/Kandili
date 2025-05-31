// js/auth.js

import { auth, db } from './firebase.js'; // Import initialized Firebase services
import { DOM } from './dom.js';
import { updateTimelineDisplay, showLoadingOverlay, hideLoadingOverlay } from './ui.js';
import { fetchAndRenderTimelineEntries } from './timeline.js';

let currentUserProfile = null; // Store current user's Firestore profile
let friendUserProfiles = new Map(); // Store friend profiles for quick lookup

// Expose these for other modules that need user info
export const getCurrentUserProfile = () => currentUserProfile;
export const getFriendUserProfiles = () => friendUserProfiles;

export function setupAuthListeners() {
  DOM.signInBtn.onclick = () => {
    showLoadingOverlay();
    auth
      .signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .catch((e) =>
        Swal.fire({ icon: "error", title: "Sign‑in failed", text: e.message })
      )
      .finally(() => hideLoadingOverlay());
  };

  DOM.signOutBtn.onclick = () => {
    showLoadingOverlay();
    auth.signOut().finally(() => hideLoadingOverlay());
  };

  auth.onAuthStateChanged(async (user) => {
    setAuthUI(user);
    if (!user) {
      currentUserProfile = null;
      friendUserProfiles.clear();
      // Unsubscribe from any previous listeners if necessary (handled in timeline.js)
      return;
    }

    showLoadingOverlay();

    // Initialize/get user profile in 'users' collection
    const userProfileDocRef = db.collection("users").doc(user.uid);
    const userProfileSnap = await userProfileDocRef.get();

    if (!userProfileSnap.exists) {
      // Create new user profile if it doesn't exist
      await userProfileDocRef.set({
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        friends: [],
        pendingRequests: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Listen for real-time updates to the current user's profile
    userProfileDocRef.onSnapshot(async (snap) => {
      currentUserProfile = snap.data();
      // Update friend profiles if friends list changes
      await fetchFriendProfiles(currentUserProfile.friends);
      // Re-render timeline to reflect potential friend changes or new content
      await fetchAndRenderTimelineEntries();
    });

    // Initial fetch and render of timeline entries
    await fetchAndRenderTimelineEntries();
    hideLoadingOverlay();
  });
}

function setAuthUI(user) {
  const isLoggedIn = Boolean(user);
  DOM.signInBtn.classList.toggle("hidden", isLoggedIn);
  DOM.signOutBtn.classList.toggle("hidden", !isLoggedIn);
  DOM.openModalBtn.classList.toggle("hidden", !isLoggedIn);
  DOM.addFriendBtn.classList.toggle("hidden", !isLoggedIn);
  DOM.friendRequestsBtn.classList.toggle("hidden", !isLoggedIn);
  DOM.timelineEntries.innerHTML = ""; // Clear entries on auth state change
  if (!isLoggedIn) updateTimelineDisplay("welcome");
  else updateTimelineDisplay("loading");
}

async function fetchFriendProfiles(friendUids) {
  friendUserProfiles.clear(); // Clear previous profiles
  if (friendUids && friendUids.length > 0) {
    const friendSnaps = await db.collection("users").where(firebase.firestore.FieldPath.documentId(), 'in', friendUids).get();
    friendSnaps.forEach(doc => {
      friendUserProfiles.set(doc.id, doc.data());
    });
  }
}
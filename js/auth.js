// js/auth.js
import { auth, db } from "./firebase.js";
import { DOM } from "./dom.js";
import {
  updateTimelineDisplay,
  showLoadingOverlay,
  hideLoadingOverlay,
} from "./ui.js";
import { fetchAndRenderTimelineEntries } from "./timeline.js";

let currentUserProfile = null;
let friendUserProfiles = new Map();

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
      return;
    }

    showLoadingOverlay();

    const userProfileDocRef = db.collection("users").doc(user.uid);
    const userProfileSnap = await userProfileDocRef.get();

    // Create or update user profile with lowercase fields
    const profileData = {
      uid: user.uid,
      displayName: user.displayName,
      displayNameLower: user.displayName.toLowerCase(),
      photoURL: user.photoURL,
      email: user.email,
      emailLower: user.email.toLowerCase(),
      friends: [],
      pendingRequests: [],
      sentRequests: [], // NEW FIELD FOR OUTGOING REQUESTS
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (!userProfileSnap.exists) {
      await userProfileDocRef.set(profileData);
    } else {
      // Add missing fields to existing profiles
      const updateData = {};
      const existing = userProfileSnap.data();

      if (!existing.displayNameLower && existing.displayName) {
        updateData.displayNameLower = existing.displayName.toLowerCase();
      }

      if (!existing.emailLower && existing.email) {
        updateData.emailLower = existing.email.toLowerCase();
      }

      // Initialize sentRequests if missing
      if (!existing.sentRequests) {
        updateData.sentRequests = [];
      }

      if (Object.keys(updateData).length > 0) {
        await userProfileDocRef.update(updateData);
      }
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
  friendUserProfiles.clear();
  if (friendUids && friendUids.length > 0) {
    const friendSnaps = await db
      .collection("users")
      .where(firebase.firestore.FieldPath.documentId(), "in", friendUids)
      .get();

    friendSnaps.forEach((doc) => {
      friendUserProfiles.set(doc.id, doc.data());
    });
  }
}
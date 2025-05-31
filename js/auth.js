// js/auth.js
import { auth, db } from "./firebase.js"; // Ensure db and auth are correctly imported
import { DOM } from "./dom.js";
import {
    updateTimelineDisplay,
    showLoadingOverlay,
    hideLoadingOverlay,
} from "./ui.js";
import { fetchAndRenderTimelineEntries } from "./timeline.js";

let currentUserProfile = null;
let friendUserProfiles = new Map(); // Stores friend UIDs mapped to their profile objects

// Public getters for profiles
export const getCurrentUserProfile = () => currentUserProfile;
export const getFriendUserProfiles = () => friendUserProfiles;

export function setupAuthListeners() {
    // Event listeners for Sign In/Sign Out buttons
    if (DOM.signInBtn) { // Defensive check for button existence
        DOM.signInBtn.onclick = () => {
            showLoadingOverlay();
            auth
                .signInWithPopup(new firebase.auth.GoogleAuthProvider()) // Using compat syntax
                .catch((e) =>
                    Swal.fire({ icon: "error", title: "Sign-in failed", text: e.message })
                )
                .finally(() => hideLoadingOverlay());
        };
    }

    if (DOM.signOutBtn) { // Defensive check for button existence
        DOM.signOutBtn.onclick = () => {
            showLoadingOverlay();
            auth.signOut().finally(() => hideLoadingOverlay());
        };
    }

    // Main Authentication State Change Listener
    auth.onAuthStateChanged(async (user) => {
        setAuthUI(user); // Update UI based on auth state

        if (!user) {
            // User is signed out
            currentUserProfile = null;
            friendUserProfiles.clear();
            console.log("User signed out. Profiles cleared.");
            return; // Exit early if no user
        }

        // User is signed in
        showLoadingOverlay();
        console.log("User signed in:", user.uid);

        // --- IMPORTANT: Use 'couples' collection for user profiles ---
        const userProfileDocRef = db.collection("couples").doc(user.uid);
        const userProfileSnap = await userProfileDocRef.get();

        // Prepare profile data with lowercase fields for searching
        const profileData = {
            uid: user.uid,
            displayName: user.displayName,
            displayNameLower: user.displayName?.toLowerCase() || "", // Handle potential null displayName
            photoURL: user.photoURL,
            email: user.email,
            emailLower: user.email?.toLowerCase() || "", // Handle potential null email
            // Initialize arrays if they don't exist, to prevent errors later
            friends: [],
            pendingRequests: [],
            sentRequests: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Using compat syntax
        };

        if (!userProfileSnap.exists) {
            // New user: create their profile document
            console.log("Creating new user profile in 'couples' collection for:", user.uid);
            await userProfileDocRef.set(profileData);
        } else {
            // Existing user: check for and add missing fields
            console.log("Existing user profile found for:", user.uid);
            const existing = userProfileSnap.data();
            const updateData = {};

            // Add missing lowercase fields if original fields exist
            if (!existing.displayNameLower && existing.displayName) {
                updateData.displayNameLower = existing.displayName.toLowerCase();
            }
            if (!existing.emailLower && existing.email) {
                updateData.emailLower = existing.email.toLowerCase();
            }

            // Initialize array fields if they are missing
            if (!existing.friends) {
                updateData.friends = [];
            }
            if (!existing.pendingRequests) {
                updateData.pendingRequests = [];
            }
            if (!existing.sentRequests) {
                updateData.sentRequests = [];
            }

            // Only update if there are fields to update
            if (Object.keys(updateData).length > 0) {
                console.log("Updating existing user profile with missing fields:", updateData);
                await userProfileDocRef.update(updateData);
            }
        }

        // Set up real-time listener for the current user's profile
        // This listener will keep currentUserProfile and friendUserProfiles updated
        userProfileDocRef.onSnapshot(async (snap) => {
            if (snap.exists) {
                currentUserProfile = snap.data();
                console.log("Current user profile updated via snapshot:", currentUserProfile.displayName);
                // Fetch friend profiles whenever the current user's friend list changes
                await fetchFriendProfiles(currentUserProfile.friends);
                // Re-render timeline to reflect any changes (e.g., new entries, friend status)
                // This will also trigger newsfeed if on that page.
                await fetchAndRenderTimelineEntries();
            } else {
                console.warn("Current user profile document no longer exists for:", user.uid);
                currentUserProfile = null;
                friendUserProfiles.clear();
            }
            hideLoadingOverlay(); // Hide loading overlay after snapshot update
        }, (error) => {
            console.error("Error listening to user profile snapshot:", error);
            hideLoadingOverlay();
        });

        // Removed the redundant initial fetchAndRenderTimelineEntries() call here
        // because the onSnapshot listener above will handle the initial render.
    });
}

// Toggles UI elements based on authentication status
function setAuthUI(user) {
    const isLoggedIn = Boolean(user);

    // Toggle visibility of sign-in/sign-out buttons
    if (DOM.signInBtn) DOM.signInBtn.classList.toggle("hidden", isLoggedIn);
    if (DOM.signOutBtn) DOM.signOutBtn.classList.toggle("hidden", !isLoggedIn);

    // Toggle visibility of main action buttons (add entry, add friend, friend requests, newsfeed)
    if (DOM.openModalBtn) DOM.openModalBtn.classList.toggle("hidden", !isLoggedIn);
    if (DOM.addFriendBtn) DOM.addFriendBtn.classList.toggle("hidden", !isLoggedIn);
    if (DOM.friendRequestsBtn) DOM.friendRequestsBtn.classList.toggle("hidden", !isLoggedIn);
    // Newsfeed button is handled in main.js for navigation, but ensure it's hidden if not logged in
    if (DOM.newsfeedBtn) DOM.newsfeedBtn.classList.toggle("hidden", !isLoggedIn);


    // Clear timeline entries and update display message
    if (DOM.timelineEntries) DOM.timelineEntries.innerHTML = "";
    if (!isLoggedIn) {
        updateTimelineDisplay("welcome"); // Show welcome message if not logged in
    } else {
        updateTimelineDisplay("loading"); // Show loading state when logged in and fetching data
    }
}

// Fetches profiles for a given list of friend UIDs
async function fetchFriendProfiles(friendUids) {
    friendUserProfiles.clear(); // Clear existing map before populating
    if (friendUids && friendUids.length > 0) {
        try {
            // --- IMPORTANT: Use 'couples' collection for friend profiles ---
            const friendSnaps = await db
                .collection("couples") // Changed from "users" to "couples"
                .where(firebase.firestore.FieldPath.documentId(), "in", friendUids)
                .get();

            friendSnaps.forEach((doc) => {
                friendUserProfiles.set(doc.id, doc.data());
            });
            console.log("Fetched", friendUserProfiles.size, "friend profiles.");
        } catch (error) {
            console.error("Error fetching friend profiles:", error);
            // Handle specific errors, e.g., if 'in' clause has too many items (max 10)
            if (error.code === 'failed-precondition' && friendUids.length > 10) {
                console.error("Firestore 'in' query limit exceeded (max 10). Consider batching or alternative friend storage.");
            }
        }
    } else {
        console.log("No friend UIDs provided to fetch.");
    }
}
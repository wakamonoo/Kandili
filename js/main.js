// js/main.js
import { setupAuthListeners } from './auth.js';
import { setupEntryModalListeners } from './entries.js';
import { setupFriendListeners } from './friends.js';
import { setupNewsfeedListeners } from './newsfeed.js';
import { auth } from './firebase.js'; // Assuming firebase.js exports 'auth'
import { DOM } from './dom.js';

document.addEventListener('DOMContentLoaded', () => {
    // Setup Auth Listeners immediately.
    // auth.js will handle onAuthStateChanged and potential redirects.
    setupAuthListeners();

    // Determine the current page to apply page-specific logic
    const currentPage = window.location.pathname.split('/').pop();
    console.log(`main.js loaded on page: ${currentPage}`);

    // Wait for the Firebase authentication state to be determined.
    // This ensures auth.currentUser is correctly populated before we try to use it
    // for data fetching or UI that depends on the user.
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log(`User signed in (${user.uid}). Initializing page-specific listeners.`);

            // Logic for index.html (or the main dashboard page)
            if (currentPage === 'index.html' || currentPage === '') { // '' covers the root path if index.html is default
                console.log("Setting up listeners for index.html");
                setupEntryModalListeners();
                setupFriendListeners();

                // Set up navigation for the newsfeed button on index.html
                if (DOM.newsfeedBtn) {
                    DOM.newsfeedBtn.onclick = () => {
                        console.log("Newsfeed button clicked on index.html, navigating to newsfeed.html");
                        window.location.href = 'newsfeed.html';
                    };
                }
            }
            // Logic for newsfeed.html
            else if (currentPage === 'newsfeed.html') {
                console.log("Setting up Newsfeed listeners for newsfeed.html");
                setupNewsfeedListeners();
            }
            // Add other page-specific initializations here as needed
            // else if (currentPage === 'someotherpage.html') { ... }

        } else {
            // User is signed out or not logged in.
            console.log("No user signed in. Redirecting to login.html if not already there.");
            // Prevent infinite redirect loop if already on login.html
            if (currentPage !== 'login.html') {
                window.location.href = 'login.html';
            }
        }

        // Initialize Feather icons regardless of auth state, as they might be on any page.
        feather.replace();
    });
});
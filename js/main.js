// js/main.js
import { setupAuthListeners } from "./auth.js";
import { setupEntryModalListeners } from "./entries.js";
import { setupFriendListeners } from "./friends.js";
import { setupNewsfeedListeners } from "./newsfeed.js";
import { DOM } from "./dom.js"; // Assuming you have a DOM.js to export your DOM elements

document.addEventListener("DOMContentLoaded", () => {
  setupAuthListeners(); // Auth listeners are always needed
  setupEntryModalListeners(); // Entry modal listeners are always needed if you can add entries from index.html
  setupFriendListeners(); // Friend listeners are always needed

  // Determine the current page
  const currentPage = window.location.pathname.split("/").pop();

  if (currentPage === "newsfeed.html") {
    // If we are on the newsfeed page, set up newsfeed-specific listeners
    setupNewsfeedListeners();
  } else {
    // If we are on the index.html or any other page, set up the newsfeed button to navigate
    if (DOM.newsfeedBtn) {
      DOM.newsfeedBtn.onclick = () => {
        window.location.href = "newsfeed.html";
      };
    }
  }

  feather.replace(); // Initialize Feather icons
});

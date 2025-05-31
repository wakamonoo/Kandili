// js/menu.js
import { getCurrentUserProfile } from "./auth.js"; // Import the function to get current user profile

document.addEventListener("DOMContentLoaded", () => {
  const fabToggleBtn = document.getElementById("fabToggleBtn");
  const fabToggleIcon = fabToggleBtn.querySelector("i");
  const fabButtonsContainer = document.getElementById("fabButtonsContainer");
  const newsfeedBtn = document.getElementById("newsfeedBtn");
  const friendRequestsBtn = document.getElementById("friendRequestsBtn");
  const addFriendBtn = document.getElementById("addFriendBtn");
  const openModalBtn = document.getElementById("openModalBtn");

  // Store references to the actual DOM elements
  const buttons = [newsfeedBtn, friendRequestsBtn, addFriendBtn, openModalBtn];

  // Function to set button visibility and animation
  const setButtonVisibility = (show) => {
    const currentUser = getCurrentUserProfile(); // Get the current user profile
    const isLoggedIn = Boolean(currentUser);

    buttons.forEach((button, index) => {
      // Only proceed if the button itself exists (prevents errors if an ID is missing)
      if (!button) return;

      // Determine if the button *should* be visible based on login status
      const shouldBeVisibleByAuth = isLoggedIn;

      if (show && shouldBeVisibleByAuth) {
        // If it's being shown by the FAB and user is logged in
        button.style.display = "flex";
        setTimeout(() => {
          button.classList.add("fab-button-revealed");
          button.style.opacity = "1";
          button.style.transform = "translateY(0)";
        }, 50 * index);
      } else {
        // If it's being hidden by the FAB, or if user is not logged in
        button.classList.remove("fab-button-revealed");
        button.style.opacity = "0";
        button.style.transform = "translateY(20px)";
        setTimeout(() => {
          button.style.display = "none";
        }, 300 + 50 * index);
      }
    });
  };

  // Function to handle initial state and resize
  const handleResize = () => {
    const currentUser = getCurrentUserProfile(); // Get the current user profile
    const isLoggedIn = Boolean(currentUser);

    if (window.innerWidth < 768) {
      // On small screens, always show the toggle button
      fabToggleBtn.style.display = "flex";
      fabToggleIcon.classList.remove("fa-xmark");
      fabToggleIcon.classList.add("fa-bars");
      setButtonVisibility(false); // Hide the main buttons initially
      buttons.forEach((button) => {
        if (button) {
          // Check if button exists
          button.classList.remove("fab-button-revealed");
          button.style.opacity = "0";
          button.style.transform = "translateY(20px)";
          button.style.display = "none"; // Ensure they are hidden immediately
        }
      });
    } else {
      // On large screens, show all regular buttons (if logged in) and hide the toggle button
      fabToggleBtn.style.display = "none";
      // Show buttons directly if logged in, otherwise ensure they are hidden
      buttons.forEach((button) => {
        if (button) {
          // Check if button exists
          if (isLoggedIn) {
            button.classList.remove("fab-button-revealed"); // No animation needed on larger screens
            button.style.opacity = "1"; // Ensure visible
            button.style.transform = "translateY(0)"; // Ensure visible
            button.style.display = "flex"; // Ensure flex display
          } else {
            // If not logged in, ensure they are hidden on large screens too
            button.classList.remove("fab-button-revealed");
            button.style.opacity = "0";
            button.style.transform = "translateY(20px)";
            button.style.display = "none";
          }
        }
      });
    }
  };

  // Initial setup
  // It's crucial that setupAuthListeners in auth.js runs *before* this initial handleResize
  // to ensure currentUserProfile is populated.
  // However, since auth.onAuthStateChanged is asynchronous, we need a way to re-evaluate
  // the menu's state once the auth state is known.
  // For now, let's call it, but the `auth.js` should ideally trigger a re-render/update
  // of the UI (including these buttons) once the auth state is established.
  handleResize();

  // Toggle visibility of buttons on small screens
  fabToggleBtn.addEventListener("click", () => {
    if (window.innerWidth < 768) {
      const isRevealed = fabToggleIcon.classList.contains("fa-xmark");
      if (isRevealed) {
        fabToggleIcon.classList.remove("fa-xmark");
        fabToggleIcon.classList.add("fa-bars");
        setButtonVisibility(false);
      } else {
        fabToggleIcon.classList.remove("fa-bars");
        fabToggleIcon.classList.add("fa-xmark");
        setButtonVisibility(true);
      }
    }
  });

  // Event listener for window resize
  window.addEventListener("resize", handleResize);

  // IMPORTANT: To ensure the menu buttons update correctly when the user logs in/out,
  // you should also trigger `handleResize()` (or a specific update function) from `auth.js`
  // within its `onAuthStateChanged` callback, after the `currentUserProfile` is set.
  // This will re-evaluate the button visibility based on the new auth state.
  // Example:
  // In auth.js:
  // auth.onAuthStateChanged(async (user) => {
  //   // ... existing auth logic ...
  //   currentUserProfile = snap.data(); // or null if logged out
  //   // Call the update function from menu.js here
  //   if (window.updateMenuVisibility) { // Use a global or export a function
  //       window.updateMenuVisibility();
  //   }
  // });
});

// To allow auth.js to trigger an update, you can expose a function globally
// or by exporting it and importing it in auth.js.
// For simplicity in this example, let's expose it globally for now:
window.updateMenuVisibility = () => {
  document.dispatchEvent(new Event("authMenuUpdate"));
};

// Add a listener for this custom event
document.addEventListener("authMenuUpdate", () => {
  // Re-run the resize handler to apply correct visibility based on auth state
  const fabToggleBtn = document.getElementById("fabToggleBtn");
  const fabToggleIcon = fabToggleBtn.querySelector("i");
  const newsfeedBtn = document.getElementById("newsfeedBtn");
  const friendRequestsBtn = document.getElementById("friendRequestsBtn");
  const addFriendBtn = document.getElementById("addFriendBtn");
  const openModalBtn = document.getElementById("openModalBtn");
  const buttons = [newsfeedBtn, friendRequestsBtn, addFriendBtn, openModalBtn]; // Re-fetch references just in case

  const currentUser = getCurrentUserProfile();
  const isLoggedIn = Boolean(currentUser);

  // Apply visibility immediately without animation for a state change
  if (window.innerWidth >= 768) {
    // Large screens
    fabToggleBtn.style.display = "none"; // Ensure FAB toggle is hidden
    buttons.forEach((button) => {
      if (button) {
        button.style.display = isLoggedIn ? "flex" : "none";
        button.style.opacity = isLoggedIn ? "1" : "0";
        button.style.transform = isLoggedIn
          ? "translateY(0)"
          : "translateY(20px)";
      }
    });
  } else {
    // Small screens
    fabToggleBtn.style.display = "flex"; // Ensure FAB toggle is visible
    fabToggleIcon.classList.remove("fa-xmark"); // Ensure it's 'bars' initially
    fabToggleIcon.classList.add("fa-bars");
    buttons.forEach((button) => {
      if (button) {
        // On small screens, they should be hidden by default until toggle is clicked
        button.style.display = "none";
        button.style.opacity = "0";
        button.style.transform = "translateY(20px)";
      }
    });
  }
});

// js/main.js

import { setupAuthListeners } from './auth.js';
import { setupEntryModalListeners } from './entries.js';
import { setupFriendListeners } from './friends.js';
// No need to import Firebase here directly, as it's handled by `firebase.js` which is imported by other modules.

document.addEventListener('DOMContentLoaded', () => {
  setupAuthListeners();
  setupEntryModalListeners();
  setupFriendListeners();
  feather.replace(); // Initialize feather icons once DOM is loaded
});
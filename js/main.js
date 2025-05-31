// js/main.js
import { setupAuthListeners } from './auth.js';
import { setupEntryModalListeners } from './entries.js';
import { setupFriendListeners } from './friends.js';
import { setupNewsfeedListeners } from './newsfeed.js';

document.addEventListener('DOMContentLoaded', () => {
  setupAuthListeners();
  setupEntryModalListeners();
  setupFriendListeners();
  setupNewsfeedListeners();
  feather.replace();
});
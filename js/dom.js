// ━━━━━━━━━━━━━━━━━━━━━━━━ Helper Function for DOM Access ━━━━━━━━━━━━━━━━━━━━━━━━ //
const $ = (id) => document.getElementById(id);

// ━━━━━━━━━━━━━━━━━━━━━━━━ Exported DOM References ━━━━━━━━━━━━━━━━━━━━━━━━ //
export const DOM = {
  // ━━━━━━━━━━━━━━━━━━ Authentication & Header Buttons ━━━━━━━━━━━━━━━━━━ //
  signInBtn: $("signInBtn"),
  signOutBtn: $("signOutBtn"),

  // ━━━━━━━━━━━━━━━━━━ Timeline Page Elements ━━━━━━━━━━━━━━━━━━ //
  timeline: $("timeline"),
  timelineEntries: $("timelineEntries"),
  welcomeMessage: $("welcomeMessage"),
  noDataMessage: $("noDataMessage"),

  // ━━━━━━━━━━━━━━━━━━ Entry Creation Modal & Inputs ━━━━━━━━━━━━━━━━━━ //
  openModalBtn: $("openModalBtn"),
  entryModal: $("entryModal"),
  cancelBtn: $("cancelBtn"),
  saveEntryBtn: $("saveEntryBtn"),
  entryDateInput: $("entryDate"),
  entryNoteInput: $("entryNote"),
  entryImgInput: $("entryImg"),

  // ━━━━━━━━━━━━━━━━━━ Add Friend Modal & Elements ━━━━━━━━━━━━━━━━━━ //
  addFriendBtn: $("addFriendBtn"),
  addFriendModal: $("addFriendModal"),
  addFriendSearchInput: $("addFriendSearchInput"),
  addFriendSearchResults: $("addFriendSearchResults"),
  closeAddFriendModalBtn: $("closeAddFriendModalBtn"),

  // ━━━━━━━━━━━━━━━━━━ Friend Requests Modal & Controls ━━━━━━━━━━━━━━━━━━ //
  friendRequestsBtn: $("friendRequestsBtn"),
  friendRequestsModal: $("friendRequestsModal"),
  friendRequestsList: $("friendRequestsList"),
  closeFriendRequestsModalBtn: $("closeFriendRequestsModalBtn"),

  // ━━━━━━━━━━━━━━━━━━ Global Overlay Element ━━━━━━━━━━━━━━━━━━ //
  loadingOverlay: $("loadingOverlay"),

  // ━━━━━━━━━━━━━━━━━━ Newsfeed Page & Tabs ━━━━━━━━━━━━━━━━━━ //
  newsfeedBtn: $("newsfeedBtn"),
  newsfeedPage: $("newsfeedPage"),
  newsfeedContent: $("newsfeedContent"),
  allPostsTab: $("allPostsTab"),
  latestPostsTab: $("latestPostsTab"),
};

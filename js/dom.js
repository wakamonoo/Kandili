// js/dom.js

const $ = (id) => document.getElementById(id);

export const DOM = {
  signInBtn: $("signInBtn"),
  signOutBtn: $("signOutBtn"),
  timeline: $("timeline"),
  timelineEntries: $("timelineEntries"),
  openModalBtn: $("openModalBtn"),
  addFriendBtn: $("addFriendBtn"),
  friendRequestsBtn: $("friendRequestsBtn"),
  entryModal: $("entryModal"),
  cancelBtn: $("cancelBtn"),
  saveEntryBtn: $("saveEntryBtn"),
  loadingOverlay: $("loadingOverlay"),
  welcomeMessage: $("welcomeMessage"),
  noDataMessage: $("noDataMessage"),
  entryDateInput: $("entryDate"),
  entryNoteInput: $("entryNote"),
  entryImgInput: $("entryImg"),

  // Newsfeed elements
  newsfeedBtn: $("newsfeedBtn"),
  // newsfeedModal: $("newsfeedModal"), // REMOVED - this is for the old modal
  newsfeedContent: $("newsfeedContent"),
  // closeNewsfeedModalBtn: $("closeNewsfeedModalBtn"), // REMOVED - this is for the old modal
  allPostsTab: $("allPostsTab"),
  latestPostsTab: $("latestPostsTab"),

  // New DOM references for friend features
  addFriendModal: $("addFriendModal"),
  addFriendSearchInput: $("addFriendSearchInput"),
  addFriendSearchResults: $("addFriendSearchResults"),
  closeAddFriendModalBtn: $("closeAddFriendModalBtn"),

  friendRequestsModal: $("friendRequestsModal"),
  friendRequestsList: $("friendRequestsList"),
  closeFriendRequestsModalBtn: $("closeFriendRequestsModalBtn"),
};

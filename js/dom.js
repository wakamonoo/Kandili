// js/dom.js

const $ = (id) => document.getElementById(id);

export const DOM = {
  signInBtn: $("signInBtn"),
  signOutBtn: $("signOutBtn"),
  timeline: $("timeline"),
  timelineEntries: $("timelineEntries"),
  openModalBtn: $("openModalBtn"), // Renamed for consistency with HTML
  addFriendBtn: $("addFriendBtn"),
  friendRequestsBtn: $("friendRequestsBtn"),
  entryModal: $("entryModal"),
  cancelBtn: $("cancelBtn"),
  saveEntryBtn: $("saveEntryBtn"), // Renamed for clarity
  loadingOverlay: $("loadingOverlay"),
  welcomeMessage: $("welcomeMessage"),
  noDataMessage: $("noDataMessage"),
  entryDateInput: $("entryDate"), // Renamed for clarity
  entryNoteInput: $("entryNote"), // Renamed for clarity
  entryImgInput: $("entryImg"), // Renamed for clarity

  // New DOM references for friend features
  addFriendModal: $("addFriendModal"),
  addFriendSearchInput: $("addFriendSearchInput"),
  addFriendSearchResults: $("addFriendSearchResults"),
  closeAddFriendModalBtn: $("closeAddFriendModalBtn"),

  friendRequestsModal: $("friendRequestsModal"),
  friendRequestsList: $("friendRequestsList"),
  closeFriendRequestsModalBtn: $("closeFriendRequestsModalBtn"),
};